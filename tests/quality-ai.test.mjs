import test from 'node:test';
import assert from 'node:assert/strict';
import {examples} from '../lib/examples.mjs';
import {clone,validateProcess} from '../lib/process.mjs';
import {modelFields} from '../lib/process-contract.mjs';
import {prepareQualityRequest,qualityAI,validateVisionResult,VISION_SCHEMA} from '../lib/quality-ai.mjs';
import {partsFromProcess,syncProcess} from '../public/quality/shared-model.mjs';
import {createProposal,reviewProposal,implementProposal} from '../public/quality/core.mjs';
const source=()=>clone(examples[0].process);
const req=()=>prepareQualityRequest({action:'vision',image:'data:image/jpeg;base64,YQ==',scope:'Only current process',mode:'as-is'});
const result=()=>{const p=source();return {sourceText:p.source,process:modelFields(p),regions:p.nodes.filter(n=>['activity','decision'].includes(n.type)).map((n,i)=>({nodeId:n.id,x:.1,y:.1+i*.08,w:.4,h:.05})),warnings:['Kontrolli algfailiga.']};};
const response=raw=>new Response(JSON.stringify({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(raw)}]}]}));
test('vision uses hosted model and strict schema; image is data, storage is off',async()=>{
 let sent;const out=await qualityAI(req(),{apiKey:'test',fetcher:async(url,options)=>{sent=JSON.parse(options.body);assert.equal(url,'https://api.openai.com/v1/responses');return response(result());}});
 assert.equal(sent.store,false);assert.equal(sent.text.format.strict,true);assert.deepEqual(sent.text.format.schema,VISION_SCHEMA);assert.equal(sent.input[0].content[1].image_url,req().image);
 assert.equal(out.draft.reviewed,false);assert.equal(out.draft.origin,'model-vision');assert.equal(out.draft.source,source().source);assert.equal(validateProcess(out.draft).errors.length,0);
});
test('vision rejects fabricated evidence, future/current mixing and missing or invalid positions',()=>{
 const bad=result();bad.process.nodes.find(n=>n.type==='activity').evidence='invented phrase';assert.throws(()=>validateVisionResult(bad,req()),e=>e.code==='INVALID_DRAFT');
 const future=result();future.process.mode='to-be';assert.throws(()=>validateVisionResult(future,req()),e=>e.code==='INVALID_DRAFT');
 const missing=result();missing.regions=[];assert.throws(()=>validateVisionResult(missing,req()),e=>e.code==='INVALID_REGIONS');
 const off=result();off.regions[0].x=.99;assert.throws(()=>validateVisionResult(off,req()),e=>e.code==='INVALID_REGIONS');
});
test('no key or invalid images never call the provider',async()=>{
 assert.throws(()=>prepareQualityRequest({...req(),image:'https://external.invalid/file'}),e=>e.code==='INVALID_IMAGE');
 assert.throws(()=>prepareQualityRequest({...req(),image:'data:image/png;base64,'+'A'.repeat(4000000)}),e=>e.code==='INVALID_IMAGE');
 await assert.rejects(qualityAI(req(),{fetcher:()=>{throw Error('must not call');}}),e=>e.code==='NOT_CONFIGURED');
});
test('one unlocated task remains editable without inventing its position on the original image',()=>{
 const raw=result(),unlocated=raw.regions.pop(),out=validateVisionResult(raw,req()),parts=partsFromProcess(out.draft,1,out.regions);
 assert.equal(validateProcess(out.draft).errors.length,0);assert.equal(parts.find(p=>p.nodeId===unlocated.nodeId).diagramOnly,true);assert.ok(out.warnings.some(w=>w.includes('ainult digitaalsel skeemil')));
 assert.equal(parts.filter(p=>p.diagramOnly).length,1);
 const tiny=result();tiny.regions[0].w=.001;const t=validateVisionResult(tiny,req());assert.equal(partsFromProcess(t.draft,1,t.regions)[0].diagramOnly,true);
});
test('provider failures are redacted and not retried',async()=>{
 let calls=0;await assert.rejects(qualityAI(req(),{apiKey:'secret-test',fetcher:async()=>{calls++;return new Response('sensitive-provider-body',{status:429});}}),e=>e.code==='PROVIDER_LIMIT'&&!e.message.includes('sensitive'));
 assert.equal(calls,1);
});
test('accepted label proposal changes the common model only after explicit implementation',()=>{
 const p=source(),parts=partsFromProcess(p);parts[0].area='purchasing';let doc={id:'d',version:1,process:p,parts,pages:[{}],history:[]};doc=syncProcess(doc);
 const employee={role:'employee',name:'Töötaja',area:'purchasing'},manager={role:'manager',name:'Kvaliteedijuht'};
 const prop=createProposal(doc,{partId:parts[0].id,title:'Täpsustus',problem:'Kirjeldus ebaselge',suggestion:'Täpsustada tegevust',benefit:'Selgem töö',type:'label',proposedLabel:'Kontrolli kuludokumendi andmed'},employee);
 const accepted=reviewProposal(prop,{status:'accepted',reason:'Arutatud ja sobib.',thanks:'Aitäh märkamise eest.'},manager);
 assert.notEqual(doc.process.nodes.find(n=>n.id===parts[0].nodeId).label,prop.proposedLabel);
 const applied=implementProposal(doc,accepted,'Uuendatud kirjeldus.',manager),next=syncProcess(applied.document);
 assert.equal(next.process.nodes.find(n=>n.id===parts[0].nodeId).label,prop.proposedLabel);assert.equal(next.process.mode,'to-be');assert.equal(next.process.reviewed,false);assert.equal(validateProcess(next.process).errors.length,0);assert.notEqual(doc.process.nodes.find(n=>n.id===parts[0].nodeId).label,prop.proposedLabel);
 assert.throws(()=>implementProposal(next,accepted,'Uuesti',manager),/vahepeal/);
});
test('rendered model geometry produces bounded selectable parts',()=>{
 for(const example of examples){const p=example.process;if(!p)continue;for(const part of partsFromProcess(p))assert.ok(part.bounds.x>=0&&part.bounds.y>=0&&part.bounds.x+part.bounds.w<=1.002&&part.bounds.y+part.bounds.h<=1.002);}
});
