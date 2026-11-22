// Server-side model provider adapter. Never import this module into a client component.
// Shapes one structured-output request for Google Gemini (generateContent) or OpenAI
// (Responses) and normalises the reply. Callers own timeouts, cancellation and all
// user-facing error text. Provider bodies are never returned to callers.

export const GEMINI_DEFAULT_MODEL='gemini-3.8-flash';
// Used once when the main Gemini model answers 503 (overloaded), which the free tier does at busy times.
export const GEMINI_FALLBACK_MODEL='gemini-3.6-flash';
const OPENAI_URL='https://api.openai.com/v1/responses';
const GEMINI_BASE='https://generativelanguage.googleapis.com/v1beta/models';
// Gemini counts its own reasoning against the output limit, so leave headroom for it.
const GEMINI_REASONING_HEADROOM=16000;

/**
 * Chooses the configured provider from runtime bindings. Gemini wins when both keys exist.
 * @param {Record<string,string|undefined>} env
 * @returns {{provider?:'gemini'|'openai',apiKey?:string,model?:string,fallbackModel?:string}}
 */
export function resolveProvider(env={}) {
 if(env.GEMINI_API_KEY)return {provider:'gemini',apiKey:env.GEMINI_API_KEY,model:env.GEMINI_MODEL||GEMINI_DEFAULT_MODEL,fallbackModel:env.GEMINI_FALLBACK_MODEL||GEMINI_FALLBACK_MODEL};
 if(env.OPENAI_API_KEY)return {provider:'openai',apiKey:env.OPENAI_API_KEY};
 return {};
}

// Gemini ignores string length limits and may reject schemas whose bounds create too many
// states. Every limit removed here is still enforced by the process checks after the reply.
const GEMINI_UNSUPPORTED=new Set(['pattern','minLength','maxLength','minItems','maxItems','minimum','maximum']);
/** @param {any} schema @returns {any} */
export function geminiSchema(schema) {
 if(Array.isArray(schema))return schema.map(geminiSchema);
 if(!schema||typeof schema!=='object')return schema;
 /** @type {Record<string,any>} */
 const out={};
 for(const [key,value] of Object.entries(schema)){
  if(GEMINI_UNSUPPORTED.has(key))continue;
  if(key==='properties')out[key]=Object.fromEntries(Object.entries(value).map(([name,child])=>[name,geminiSchema(child)]));
  else out[key]=['items','anyOf','additionalProperties'].includes(key)?geminiSchema(value):value;
 }
 return out;
}

/** @param {any} options */
function openAIRequest({apiKey,model,instructions,text,image,schemaName,schema,maxOutputTokens}) {
 const input=image?[{role:'user',content:[{type:'input_text',text},{type:'input_image',image_url:image,detail:'high'}]}]:text;
 return [OPENAI_URL,{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json'},
  {model,store:false,max_output_tokens:maxOutputTokens,reasoning:{effort:'low'},instructions,input,text:{format:{type:'json_schema',name:schemaName,schema,strict:true}}}];
}
/** @param {any} options */
function geminiRequest({apiKey,model,instructions,text,image,schema,maxOutputTokens}) {
 /** @type {any[]} */
 const parts=[{text}];
 const match=image?/^data:([^;,]+);base64,(.+)$/.exec(image):null;
 if(match)parts.push({inlineData:{mimeType:match[1],data:match[2]}});
 return [`${GEMINI_BASE}/${encodeURIComponent(model)}:generateContent`,{'x-goog-api-key':apiKey,'Content-Type':'application/json'},
  {systemInstruction:{parts:[{text:instructions}]},contents:[{role:'user',parts}],
   generationConfig:{responseMimeType:'application/json',responseJsonSchema:geminiSchema(schema),maxOutputTokens:maxOutputTokens+GEMINI_REASONING_HEADROOM}}];
}

/** @param {any} result */
function readOpenAI(result) {
 if(result?.output?.some?.((/** @type {any} */item)=>item.type==='message'&&item.content?.some((/** @type {any} */part)=>part.type==='refusal')))return {kind:'refused'};
 if(result?.status!=='completed')return {kind:'incomplete'};
 return {kind:'ok',text:(result.output||[]).filter((/** @type {any} */item)=>item.type==='message').flatMap((/** @type {any} */item)=>item.content||[]).filter((/** @type {any} */part)=>part.type==='output_text').map((/** @type {any} */part)=>part.text).join('')};
}
const GEMINI_BLOCKED=['SAFETY','RECITATION','BLOCKLIST','PROHIBITED_CONTENT','SPII','IMAGE_SAFETY'];
/** @param {any} result */
function readGemini(result) {
 if(result?.promptFeedback?.blockReason)return {kind:'refused'};
 const candidate=result?.candidates?.[0];
 if(!candidate)return {kind:'incomplete'};
 if(GEMINI_BLOCKED.includes(candidate.finishReason))return {kind:'refused'};
 if(candidate.finishReason&&candidate.finishReason!=='STOP')return {kind:'incomplete'};
 return {kind:'ok',text:(candidate.content?.parts||[]).filter((/** @type {any} */part)=>!part.thought&&typeof part.text==='string').map((/** @type {any} */part)=>part.text).join('')};
}
// Gemini reports a rejected key as 400 and an unknown model as 404. Both are server
// configuration problems, so report them the way callers already treat 401 and 403.
/** @param {Response} response */
async function geminiStatus(response) {
 if(response.status===404)return 403;
 if(response.status!==400)return response.status;
 let reason='';try{const body=await response.json();reason=`${body?.error?.message||''} ${JSON.stringify(body?.error?.details||'')}`;}catch{}
 return /API_KEY_INVALID|API key not valid|API key expired/i.test(reason)?401:400;
}

/**
 * Sends one structured-output request. Network failures and aborts throw; everything else
 * resolves to a small result so no provider text reaches a caller.
 * @param {{provider?:'openai'|'gemini',apiKey:string,model:string,fallbackModel?:string,instructions:string,text:string,image?:string,schemaName:string,schema:object,maxOutputTokens:number,fetcher?:typeof fetch,signal?:AbortSignal}} options
 * @returns {Promise<{kind:'ok',text:string}|{kind:'http',status:number}|{kind:'unreadable'|'refused'|'incomplete'}>}
 */
export async function requestStructured({provider='openai',fetcher=fetch,signal,fallbackModel,...options}) {
 const gemini=provider==='gemini';
 const models=gemini&&fallbackModel&&fallbackModel!==options.model?[options.model,fallbackModel]:[options.model];
 let response;
 for(const model of models){
  const [url,headers,body]=gemini?geminiRequest({...options,model}):openAIRequest({...options,model});
  response=await fetcher(/** @type {string} */(url),{method:'POST',headers:/** @type {Record<string,string>} */(headers),signal,body:JSON.stringify(body)});
  if(response.status!==503)break;
 }
 response=/** @type {Response} */(response);
 if(!response.ok)return {kind:'http',status:gemini?await geminiStatus(response):response.status};
 let result;try{result=await response.json();}catch{return {kind:'unreadable'};}
 return /** @type {any} */(gemini?readGemini(result):readOpenAI(result));
}
