import test from 'node:test';
import assert from 'node:assert/strict';
import {examples} from '../lib/examples.mjs';
import {clone} from '../lib/process.mjs';
import {generateProcessDraft,prepareProcessRequest,PROCESS_SCHEMA} from '../lib/ai-process.mjs';
import {modelFields} from '../lib/process-contract.mjs';
import {prepareQualityRequest,qualityAI} from '../lib/quality-ai.mjs';
import {GEMINI_DEFAULT_MODEL,GEMINI_FALLBACK_MODEL,geminiSchema,resolveProvider} from '../lib/ai-provider.mjs';

const expense=()=>clone(examples[0].process);
const prepared=()=>prepareProcessRequest({intent:'generate',source:expense().source,expectedVersion:1});
const gemini=(model=expense(),extra={})=>new Response(JSON.stringify({candidates:[{content:{parts:[{text:'hidden reasoning',thought:true},{text:JSON.stringify(model)}]},finishReason:'STOP',...extra}]}));
const expectError=(promise,code)=>assert.rejects(promise,error=>error.code===code);

test('Gemini is preferred when configured; OpenAI stays the fallback',()=>{
 assert.deepEqual(resolveProvider({GEMINI_API_KEY:'g',OPENAI_API_KEY:'o'}),{provider:'gemini',apiKey:'g',model:GEMINI_DEFAULT_MODEL,fallbackModel:GEMINI_FALLBACK_MODEL});
 assert.deepEqual(resolveProvider({GEMINI_API_KEY:'g',GEMINI_MODEL:'gemini-test',GEMINI_FALLBACK_MODEL:'gemini-spare'}),{provider:'gemini',apiKey:'g',model:'gemini-test',fallbackModel:'gemini-spare'});
 assert.deepEqual(resolveProvider({OPENAI_API_KEY:'o'}),{provider:'openai',apiKey:'o'});
 assert.deepEqual(resolveProvider({}),{});
});
test('Gemini schema drops unsupported limits but keeps structure and property names',()=>{
 const schema=geminiSchema({type:'object',properties:{pattern:{type:'string',maxLength:5,pattern:'^a'},list:{type:'array',minItems:1,maxItems:3,items:{anyOf:[{type:'number',minimum:0,maximum:1},{type:'null'}]}}},required:['pattern','list'],additionalProperties:false});
 assert.deepEqual(schema,{type:'object',properties:{pattern:{type:'string'},list:{type:'array',items:{anyOf:[{type:'number'},{type:'null'}]}}},required:['pattern','list'],additionalProperties:false});
 assert.ok(!/"(pattern|maxLength|minItems|maxItems)":/.test(JSON.stringify(geminiSchema(PROCESS_SCHEMA).properties.nodes)));
 assert.deepEqual(Object.keys(geminiSchema(PROCESS_SCHEMA).properties),Object.keys(PROCESS_SCHEMA.properties));
});
test('Gemini generation sends the key as a header, the schema as JSON and ignores reasoning parts',async()=>{
 let url,options;
 const result=await generateProcessDraft(prepared(),{provider:'gemini',apiKey:'test-only',fetcher:async(u,o)=>{url=u;options=o;return gemini();}});
 const sent=JSON.parse(options.body);
 assert.equal(url,`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_DEFAULT_MODEL}:generateContent`);
 assert.equal(options.headers['x-goog-api-key'],'test-only');assert.ok(!url.includes('test-only'));assert.ok(!options.body.includes('test-only'));
 assert.equal(sent.generationConfig.responseMimeType,'application/json');assert.deepEqual(sent.generationConfig.responseJsonSchema,geminiSchema(PROCESS_SCHEMA));
 assert.ok(sent.systemInstruction.parts[0].text.length>100);assert.equal(JSON.parse(sent.contents[0].parts[0].text).requiredMode,'as-is');
 assert.equal(result.draft.origin,'model-api');assert.equal(result.draft.version,2);assert.equal(result.draft.reviewed,false);assert.equal(result.draft.source,expense().source);
});
test('Gemini drafts still pass the same process checks',async()=>{
 const model=expense();model.nodes.find(n=>n.type==='activity').evidence='invented unsupported evidence';
 await expectError(generateProcessDraft(prepared(),{provider:'gemini',apiKey:'test',fetcher:async()=>gemini(model)}),'INVALID_DRAFT');
});
test('Gemini blocks, truncation and provider failures map to safe errors without retries',async()=>{
 const run=fetcher=>generateProcessDraft(prepared(),{provider:'gemini',apiKey:'test',fetcher});
 await expectError(run(async()=>new Response(JSON.stringify({promptFeedback:{blockReason:'SAFETY'}}))),'REFUSED');
 await expectError(run(async()=>gemini(expense(),{finishReason:'SAFETY'})),'REFUSED');
 await expectError(run(async()=>gemini(expense(),{finishReason:'MAX_TOKENS'})),'INCOMPLETE');
 await expectError(run(async()=>new Response(JSON.stringify({candidates:[]}))),'INCOMPLETE');
 await expectError(run(async()=>new Response('not json')),'INVALID_RESPONSE');
 const invalidKey=JSON.stringify({error:{code:400,status:'INVALID_ARGUMENT',message:'API key not valid. Please pass a valid API key.',details:[{reason:'API_KEY_INVALID'}]}});
 for(const [status,body,code] of [[429,'{}','PROVIDER_LIMIT'],[400,invalidKey,'PROVIDER_ACCESS'],[403,'{}','PROVIDER_ACCESS'],[404,'{}','PROVIDER_ACCESS'],[400,'{"error":{"message":"SENSITIVE schema detail"}}','PROVIDER_ERROR'],[500,'SENSITIVE','PROVIDER_ERROR']]){
  let calls=0;await assert.rejects(run(async()=>{calls++;return new Response(body,{status});}),error=>error.code===code&&!JSON.stringify([error.message,error.details]).includes('SENSITIVE'));
  assert.equal(calls,1);
 }
});
test('an overloaded Gemini model falls back once to the second model, and only on 503',async()=>{
 const urls=[];
 const {draft}=await generateProcessDraft(prepared(),{provider:'gemini',apiKey:'test',model:'main-model',fallbackModel:'spare-model',fetcher:async url=>{urls.push(url);return urls.length===1?new Response('{}',{status:503}):gemini();}});
 assert.equal(draft.origin,'model-api');assert.equal(urls.length,2);assert.ok(urls[0].includes('/main-model:'));assert.ok(urls[1].includes('/spare-model:'));
 let calls=0;await expectError(generateProcessDraft(prepared(),{provider:'gemini',apiKey:'test',model:'main-model',fallbackModel:'spare-model',fetcher:async()=>{calls++;return new Response('{}',{status:503});}}),'PROVIDER_ERROR');assert.equal(calls,2);
 calls=0;await expectError(generateProcessDraft(prepared(),{provider:'gemini',apiKey:'test',model:'main-model',fallbackModel:'spare-model',fetcher:async()=>{calls++;return new Response('{}',{status:500});}}),'PROVIDER_ERROR');assert.equal(calls,1);
 calls=0;await expectError(generateProcessDraft(prepared(),{apiKey:'test',fallbackModel:'spare-model',fetcher:async()=>{calls++;return new Response('{}',{status:503});}}),'PROVIDER_ERROR');assert.equal(calls,1);
});
test('Gemini vision sends the image as inline data, never as a link',async()=>{
 const p=expense(),raw={sourceText:p.source,process:modelFields(p),regions:p.nodes.filter(n=>['activity','decision'].includes(n.type)).map((n,i)=>({nodeId:n.id,x:.1,y:.1+i*.08,w:.4,h:.05})),warnings:[]};
 let sent;const out=await qualityAI(prepareQualityRequest({action:'vision',image:'data:image/jpeg;base64,YQ==',scope:'Only current process',mode:'as-is'}),{provider:'gemini',apiKey:'test',fetcher:async(url,options)=>{sent=JSON.parse(options.body);return gemini(raw);}});
 assert.deepEqual(sent.contents[0].parts[1],{inlineData:{mimeType:'image/jpeg',data:'YQ=='}});assert.equal(JSON.parse(sent.contents[0].parts[0].text).mode,'as-is');
 assert.equal(out.draft.origin,'model-vision');assert.equal(out.draft.reviewed,false);
});
