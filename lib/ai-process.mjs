import {reconcileExplorer} from './process-explorer.mjs';
// Server-side provider integration. Never import this module into a client component.
import {createDocument, validateProcess} from './process.mjs';
import {mentionsSystem, withSystemRegistry} from './systems.mjs';
import {translate, UNMAPPED_BOUNDARY} from './i18n.mjs';
import {reconcileModelAreas} from './business-areas.mjs';
import {PROCESS_SCHEMA, ProcessAIError} from './process-contract.mjs';
import {KHALED_RULES,KHALED_SCHEMA,numberSource,extractKhaledEvidence} from './khaled-rules.mjs';
import {processInstructions, modelInput} from './process-prompt.mjs';
export {PROCESS_SCHEMA, ProcessAIError, modelFields, prepareProcessRequest} from './process-contract.mjs';
export {PROCESS_INSTRUCTIONS} from './process-prompt.mjs';

export const DEFAULT_MODEL = 'gpt-6.1-sol';
export const MAX_REQUEST_BYTES = 900000;
const fail=(code,message,status=400,details=[])=>{throw new ProcessAIError(code,message,status,details);};

function completeExplicitUnknownQuestions(model,locale='en') {
 if(!Array.isArray(model?.nodes)||!Array.isArray(model.questions))return model;
 const ids=new Set(model.questions.map(q=>q?.id));let i=1;
 const nextId=()=>{while(ids.has(`q_unassigned_${i}`))i++;const id=`q_unassigned_${i++}`;ids.add(id);return id;};
 const roleText=node=>translate(locale,'Who is responsible for “{step}”?',{step:String(node?.label||translate(locale,'this step')).slice(0,180)});
 const questions=[];
 for(const question of model.questions){
  if(question?.kind==='role'&&Array.isArray(question.nodeIds)&&question.nodeIds.length>1){
   question.nodeIds.forEach((nodeId,index)=>questions.push({id:index===0?question.id:nextId(),kind:'role',text:roleText(model.nodes.find(n=>n?.id===nodeId)),nodeIds:[nodeId]}));
  }else questions.push(question);
 }
 const missing=model.nodes.filter(node=>['activity','decision'].includes(node?.type)&&node.roleId===null&&!questions.some(q=>q?.kind==='role'&&q.nodeIds?.includes(node.id)));
 const boundaries=model.nodes.filter(node=>node?.type==='end'&&UNMAPPED_BOUNDARY.test(node.label)&&!questions.some(q=>['missing_step','other','decision_rule'].includes(q?.kind)&&q.nodeIds?.includes(node.id)));
 // Focus explicit unknowns without supplying any owner, activity or business rule.
 if(questions.length+missing.length+boundaries.length>30)throw new Error('Too many unresolved steps. Generate a smaller process view.');
 for(const node of missing)questions.push({id:nextId(),kind:'role',text:roleText(node),nodeIds:[node.id]});
 for(const node of boundaries)questions.push({id:nextId(),kind:'missing_step',text:translate(locale,'What happens next at this unmapped boundary: {step}?',{step:String(node.label).replace(UNMAPPED_BOUNDARY,'').slice(0,180)}),nodeIds:[node.id]});
 model.questions=questions;
 return model;
}

/**
 * @param {ReturnType<typeof import('./process-contract.mjs').prepareProcessRequest>} prepared
 * @param {{apiKey?:string,model?:string,fetcher?:typeof fetch,signal?:AbortSignal,timeoutMs?:number}} options
 */
export async function generateProcessDraft(prepared,{apiKey,model=DEFAULT_MODEL,fetcher=fetch,signal,timeoutMs=90000}={}) {
 if(!apiKey) fail('NOT_CONFIGURED','AI generation is not configured for this workspace. Prepared examples and import remain available.',503);
 const timeout=AbortSignal.timeout(timeoutMs);
 const abort=signal?AbortSignal.any([signal,timeout]):timeout;
 const khaled=prepared.ruleSet==='khaled';
 const passages=khaled?numberSource(prepared.source,prepared.locale):null;
 const input=modelInput(prepared);
 let response;
 try {
  response=await fetcher('https://api.openai.com/v1/responses',{
   method:'POST',headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json'},signal:abort,
    body:JSON.stringify({model,store:false,max_output_tokens:12000,reasoning:{effort:'low'},instructions:processInstructions(prepared.locale)+(khaled?KHALED_RULES:''),
    input:JSON.stringify(khaled?{...input,numberedSource:passages}:input),
    text:{format:{type:'json_schema',name:khaled?'khaled_draft':'process_draft',schema:khaled?KHALED_SCHEMA:PROCESS_SCHEMA,strict:true}}})
  });
 } catch {
  if(signal?.aborted) fail('CANCELLED','Request cancelled. The previous draft is unchanged.',499);
  if(timeout.aborted) fail('TIMEOUT','Generation took too long. Try a smaller process section. The previous draft is unchanged.',504);
  fail('CONNECTION_ERROR','The model service could not be reached. Try again later.',502);
 }
 if(!response.ok) {
  // Do not relay provider bodies, credentials or request data into logs or responses.
  if(response.status===429) fail('PROVIDER_LIMIT','The model service reached a usage limit. Try again later.',429);
  if([401,403].includes(response.status)) fail('PROVIDER_ACCESS','The model service needs its server configuration checked. Your draft is unchanged.',503);
  fail('PROVIDER_ERROR','The model service could not complete this request. Try again later.',502);
 }
 let result;try{result=await response.json();}catch{fail('INVALID_RESPONSE','The model service returned an unreadable response. Your draft is unchanged.',502);}
 if(result.output?.some(item=>item.type==='message'&&item.content?.some(part=>part.type==='refusal'))) fail('REFUSED','The model service could not produce a draft for this description. Your draft is unchanged.',422);
 if(result.status!=='completed') fail('INCOMPLETE','The model response was incomplete. Try a smaller process section. Your draft is unchanged.',502);
 const output=result.output?.filter(item=>item.type==='message').flatMap(item=>item.content||[]).filter(part=>part.type==='output_text').map(part=>part.text).join('');
 let raw;try{raw=JSON.parse(output);}catch{fail('INVALID_DRAFT','The model did not return a process object. Your draft is unchanged.',422);}
 if(!khaled)return finalizeProcessDraft(raw,prepared);
 const {process,evidence}=extractKhaledEvidence(raw,passages);
 return {...finalizeProcessDraft(process,prepared),evidence};
}

export function finalizeProcessDraft(raw,prepared) {
 if(raw?.mode!==prepared.mode) fail('INVALID_DRAFT','The model mixed current practice and proposed changes. Your draft is unchanged.',422);
 let draft;
 try {
  for(const system of raw.systems||[]){const existing=(prepared.systems||[]).find(s=>s.id===system.id);if(existing&&existing.label!==system.label)throw new Error('Preserve registered system names.');if(!existing&&!mentionsSystem(prepared.source,system.label))throw new Error('A new system must be named in the source.');}
  if(Array.isArray(raw?.nodes))raw.nodes=raw.nodes.map(node=>({...node,areaReviewed:false}));
  draft=reconcileModelAreas(withSystemRegistry(createDocument(completeExplicitUnknownQuestions({...raw,explorer:undefined},prepared.locale),prepared.source,'model-api'),prepared.systems||[]),prepared.current,prepared.intent);
  if(prepared.intent!=='generate')draft=reconcileExplorer(draft,prepared.previous);
   const report=validateProcess(draft);if(report.errors.length)throw new Error(report.errors.join(' '));
 }
 catch(error) {fail('INVALID_DRAFT','The AI draft did not pass process checks. Try clarifying the description. Your previous draft is unchanged.',422,[String(error.message).slice(0,1200)]);}
 draft.version=prepared.expectedVersion+1;
 draft.changeSummary=prepared.intent==='edit'?'AI proposal from requested change':prepared.intent==='clarify'?'AI revision from clarification':'AI draft from process description';
 return {draft,expectedVersion:prepared.expectedVersion};
}

export async function readProcessBody(request,maxBytes=MAX_REQUEST_BYTES) {
 if(!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) fail('CONTENT_TYPE','Send JSON process data.',415);
 const declared=Number(request.headers.get('content-length'));
 if(declared>maxBytes) fail('REQUEST_TOO_LARGE','The request is too large. Use a smaller process section.',413);
 const reader=request.body?.getReader();if(!reader) fail('INVALID_REQUEST','The process request is empty.');
 const chunks=[];let length=0;
 try {while(true){const {done,value}=await reader.read();if(done)break;length+=value.byteLength;if(length>maxBytes){await reader.cancel();fail('REQUEST_TOO_LARGE','The request is too large. Use a smaller process section.',413);}chunks.push(value);}}
 finally{reader.releaseLock();}
 const bytes=new Uint8Array(length);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
 try{return JSON.parse(new TextDecoder().decode(bytes));}catch{fail('INVALID_REQUEST','The process request is not valid JSON.');}
}

export function sameOriginRequest(request) {
 const origin=request.headers.get('origin');
 return request.headers.get('sec-fetch-site')!=='cross-site'&&(!origin||origin===new URL(request.url).origin);
}
