// Shared, credential-free request validation and model output contract.
import {MAX_SOURCE, validateProcess} from './process.mjs';
import {mergeSystemRegistry, validateRegistry, withSystemRegistry} from './systems.mjs';
import {LOCALES} from './i18n.mjs';
import {BUSINESS_AREAS} from './business-areas.mjs';

const fields = ['schemaVersion','title','mode','roles','nodes','edges','questions','notes','systems'];
const text = (minLength, maxLength) => ({type:'string', minLength, maxLength});
const id = {type:'string', pattern:'^[A-Za-z][A-Za-z0-9_-]{0,63}$'};
const object = properties => ({type:'object', properties, required:Object.keys(properties), additionalProperties:false});
const list = (items, maxItems, minItems=0) => ({type:'array',items,minItems,maxItems});
export const PROCESS_SCHEMA = object({
 schemaVersion:{type:'string',enum:['1.0']}, title:text(1,160), mode:{type:'string',enum:['as-is','to-be']},
 roles:list(object({id,label:text(1,100)}),30),
 systems:list(object({id,label:text(1,80)}),30),
 nodes:list(object({id,type:{type:'string',enum:['start','activity','decision','end']},label:text(1,180),roleId:{anyOf:[id,{type:'null'}]},evidence:text(0,1800),systemId:{anyOf:[id,{type:'null'}]},execution:{type:'string',enum:['unknown','manual','assisted','automated']},humanDecision:{anyOf:[{type:'boolean'},{type:'null'}]},systemEvidence:text(0,1800),businessArea:{type:'string',enum:BUSINESS_AREAS.map(area=>area.id)},areaReason:text(0,600)}),90,2),
 edges:list(object({from:id,to:id,label:text(0,120)}),200),
 questions:list(object({id,kind:{type:'string',enum:['role','decision_rule','missing_step','other']},text:text(1,600),nodeIds:list(id,90,1)}),30),
 notes:list(text(0,2000),30)
});

export class ProcessAIError extends Error {
 constructor(code,message,status=400,details=[]) {super(message);this.name='ProcessAIError';this.code=code;this.status=status;this.details=details;}
}
const fail=(code,message,status=400,details=[])=>{throw new ProcessAIError(code,message,status,details);};
export const modelFields = model => {const normalized=withSystemRegistry(model);return Object.fromEntries(fields.map(key=>[key,normalized[key]]));};

export function prepareProcessRequest(body) {
 if(!body||typeof body!=='object'||Array.isArray(body)) fail('INVALID_REQUEST','Use a process request object.');
 if(!['generate','edit','clarify'].includes(body.intent)) fail('INVALID_REQUEST','Choose generate, edit or clarify.');
 if(body.locale!==undefined&&!LOCALES.some(locale=>locale.id===body.locale)) fail('INVALID_LOCALE','Choose English, Estonian, French or German.');
 if(typeof body.source!=='string'||!body.source.trim()||body.source.length>MAX_SOURCE) fail('INVALID_SOURCE','Provide a description of 1–120,000 characters.');
 if(!Number.isSafeInteger(body.expectedVersion)||body.expectedVersion<1) fail('INVALID_VERSION','The workspace version is missing. Reload the workspace.');
 if(body.scope!==undefined&&(typeof body.scope!=='string'||body.scope.length>4000)) fail('INVALID_SCOPE','Use a shorter process scope.');
 if(body.systems!==undefined&&validateRegistry(body.systems).length)fail('INVALID_SYSTEMS','Use a valid system registry of at most 30 systems.');
 if(body.ruleSet!==undefined&&(body.ruleSet!=='khaled'||body.intent!=='generate'||body.current!=null)) fail('INVALID_REQUEST','Use Khaled’s rules to generate a separate draft from source text.');
 let current=null,previous=null,source=body.source,mode='as-is';
 if(body.current!==undefined&&body.current!==null) {
  if(body.current.version!==body.expectedVersion||body.current.source!==source) fail('STALE_REQUEST','The draft and description differ. Generate a draft for the description first.',409);
  const report=validateProcess(body.current);
  if(report.errors.length) fail('INVALID_CURRENT','The current process is invalid. Import a valid draft first.');
  current=modelFields(body.current);previous=body.current;
 }
 if(body.intent!=='generate'&&!current) fail('INVALID_CURRENT','Generate a process before changing it.');
 let command='',question=null,answer='';
 if(body.intent==='edit') {
  if(typeof body.command!=='string'||!body.command.trim()||body.command.length>6000) fail('INVALID_COMMAND','Describe a change of 1–6,000 characters.');
  command=body.command.trim(); source+='\nRequested improvement: '+command; mode='to-be';
 } else if(body.intent==='clarify') {
  question=current.questions.find(q=>q.id===body.questionId);
  if(!question) fail('STALE_QUESTION','This question is no longer open. Check the current draft.',409);
  if(typeof body.answer!=='string'||!body.answer.trim()||body.answer.length>2000) fail('INVALID_ANSWER','Give an answer of 1–2,000 characters.');
  answer=body.answer.trim(); source+=`\nClarification: ${question.text}\nAnswer: ${answer}`;mode=current.mode;
 }
 if(source.length>MAX_SOURCE) fail('INVALID_SOURCE','The description and change exceed 120,000 characters. Shorten the description.');
 let systems;try{systems=mergeSystemRegistry(current?.systems||[],body.systems||[]).systems;}catch{fail('INVALID_SYSTEMS','Use a valid system registry of at most 30 systems.');}
 return {ruleSet:body.ruleSet,intent:body.intent,locale:body.locale||'en',systems,source,mode,current,previous,scope:body.scope||'',command,question,answer,expectedVersion:body.expectedVersion};
}

