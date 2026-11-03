import test from 'node:test';
import assert from 'node:assert/strict';
import {examples} from '../lib/examples.mjs';
import {clone,createDocument,saveSystemCard,toSVG,toMermaid,validateProcess} from '../lib/process.mjs';
import {mergeSystemRegistry,registerSystem,systemColor,systemGaps,taskCard,withSystemRegistry} from '../lib/systems.mjs';
import {generateProcessDraft,prepareProcessRequest,PROCESS_SCHEMA} from '../lib/ai-process.mjs';
import {matchesAIRequest} from '../lib/ai-workspace.mjs';
const expense=()=>clone(examples[0].process);
const confirmed=(label='BC')=>{
 const current=expense(),system=registerSystem(label);
 return saveSystemCard(current,'submit',{systems:[system],systemId:system.id,execution:'assisted',humanDecision:false},`The employee submits the claim in ${label}; this task uses software and contains no human decision.`);
};

test('legacy drafts migrate to unknown cards without inferring systems or automation',()=>{
 const before=expense();delete before.systems;for(const n of before.nodes)for(const key of ['systemId','execution','humanDecision','systemEvidence'])delete n[key];const migrated=createDocument(before,before.source);
 assert.deepEqual(migrated.systems,[]);
 assert.ok(migrated.nodes.every(n=>taskCard(n).systemId===null&&taskCard(n).execution==='unknown'&&taskCard(n).humanDecision===null));
 assert.equal(migrated.source,before.source);assert.deepEqual(migrated.roles,before.roles);
});
test('saving a system card preserves the graph, records exact evidence and resets review',()=>{
 const current=expense();current.reviewed=true;const original=clone(current),system=registerSystem('BC');
 const next=saveSystemCard(current,'submit',{systems:[system],systemId:system.id,execution:'assisted',humanDecision:false},'Employee enters the claim in BC; no decision is made in this task.');
 assert.deepEqual(current,original);assert.equal(next.version,current.version+1);assert.equal(next.reviewed,false);assert.equal(next.mode,current.mode);
 assert.deepEqual(next.edges,current.edges);assert.deepEqual(next.roles,current.roles);
 const card=taskCard(next.nodes.find(n=>n.id==='submit'));assert.ok(next.source.includes(card.systemEvidence));assert.equal(card.systemId,system.id);assert.deepEqual(validateProcess(next).errors,[]);
});
test('contradictory execution and human-decision values cannot be saved',()=>{
 const p=confirmed(),node=p.nodes.find(n=>n.id==='submit');
 assert.throws(()=>saveSystemCard(p,node.id,{systems:p.systems,systemId:node.systemId,execution:'manual',humanDecision:false},'Confirmed by user.'),/manual task/);
 assert.throws(()=>saveSystemCard(p,node.id,{systems:p.systems,systemId:node.systemId,execution:'automated',humanDecision:true},'Confirmed by user.'),/automatic task/);
 assert.throws(()=>saveSystemCard(p,'start',{systems:p.systems,systemId:null,execution:'manual',humanDecision:false},'Confirmed by user.'),/activities and decisions/);
});
test('imports reject dangling systems, invalid enum values and unsupported card evidence',()=>{
 const p=confirmed(),node=p.nodes.find(n=>n.id==='submit');
 for(const patch of [{systemId:'unknown_system'},{execution:'robotic'},{humanDecision:'yes'},{systemEvidence:'A fabricated quotation'}]){
  const bad=clone(p);Object.assign(bad.nodes.find(n=>n.id===node.id),patch);assert.ok(validateProcess(bad).errors.length);assert.throws(()=>createDocument(bad,bad.source));
 }
});
test('future-only system plans cannot become current system facts',()=>{
 const p=withSystemRegistry(expense()),system=registerSystem('BC');p.systems=[system];p.source+='\nNeed: The employee will enter claims in BC.';
 Object.assign(p.nodes.find(n=>n.id==='submit'),{systemId:system.id,execution:'assisted',humanDecision:null,systemEvidence:'The employee will enter claims in BC.'});
 assert.ok(validateProcess(p).errors.some(e=>/future need/.test(e)));p.mode='to-be';assert.deepEqual(validateProcess(p).errors,[]);
});
test('system identity and color persist across views, restore and JSON round-trips',()=>{
 const p=confirmed(),system=p.systems[0],other=withSystemRegistry(clone(examples[1].process),p.systems);
 assert.equal(other.systems[0].id,system.id);assert.equal(other.nodes.find(n=>n.type==='activity').systemId,null);
 assert.equal(registerSystem('  bc  ',other.systems).id,system.id);
 const restored=withSystemRegistry(expense(),other.systems);assert.equal(restored.systems[0].id,system.id);
 const roundTrip=createDocument(JSON.parse(JSON.stringify(p)),p.source);assert.equal(roundTrip.systems[0].id,system.id);assert.equal(systemColor(roundTrip.systems[0].id),systemColor(system.id));
 const imported=clone(p);imported.systems[0].id='external_bc';imported.nodes.find(n=>n.id==='submit').systemId='external_bc';
 const merged=withSystemRegistry(imported,other.systems);assert.equal(merged.nodes.find(n=>n.id==='submit').systemId,system.id);assert.equal(merged.systems.length,1);
});
test('conflicting imported IDs cannot silently reassign a task to a different system',()=>{
 const existing=registerSystem('BC'),incoming={id:existing.id,label:'Excel'};
 const merged=mergeSystemRegistry([existing],[incoming]);assert.equal(merged.systems.length,2);assert.notEqual(merged.idMap.get(incoming.id),existing.id);assert.equal(merged.systems[0].label,'BC');
});

test('independently generated IDs converge to the same named system identity',()=>{
 const a=mergeSystemRegistry([],[{id:'model_a',label:'BC'}]),b=mergeSystemRegistry([],[{id:'model_b',label:'BC'}]);
 assert.equal(a.systems[0].id,b.systems[0].id);assert.equal(systemColor(a.systems[0].id),systemColor(b.systems[0].id));
});
test('SVG and Mermaid retain system legend identity and escape user product names',()=>{
 const p=confirmed('<BC & "sales">'),before=JSON.stringify(p),system=p.systems[0],svg=toSVG(p),mermaid=toMermaid(p);
 assert.ok(svg.includes(systemColor(system.id)));assert.ok(svg.includes('Systems legend'));assert.ok(svg.includes('&lt;BC &amp; &quot;sales&quot;&gt;'));assert.ok(!svg.includes('<BC &'));
 assert.ok(mermaid.includes('Systems legend'));assert.ok(mermaid.includes(systemColor(system.id)));assert.ok(mermaid.includes('&lt;BC &amp; #quot;sales#quot;&gt;'));
 const translated=toSVG(p,[],{legendTitle:'Süsteemide legend',unknownSystemLabel:'Süsteem teadmata'});assert.ok(translated.includes(systemColor(system.id)));assert.ok(translated.includes('Süsteemide legend'));assert.equal(JSON.stringify(p),before);
});
test('focused missing-field prompts distinguish manual tasks from unknown systems',()=>{
 const n=expense().nodes.find(n=>n.id==='submit');assert.equal(systemGaps(n).length,3);
 assert.deepEqual(systemGaps({...n,execution:'manual',humanDecision:false}),[]);
 assert.deepEqual(systemGaps({...n,execution:'automated',humanDecision:false}),['Which program is used for this task?']);
 assert.deepEqual(systemGaps({type:'start'}),[]);
});
test('AI structured output carries source-backed cards and the persistent registry',async()=>{
 const p=confirmed(),prepared=prepareProcessRequest({intent:'generate',source:p.source,current:p,systems:p.systems,expectedVersion:p.version,locale:'fr'});let sent;
 const result=await generateProcessDraft(prepared,{apiKey:'test-only',fetcher:async(_url,options)=>{sent=JSON.parse(options.body);return new Response(JSON.stringify({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(p)}]}]}));}});
 assert.deepEqual(JSON.parse(sent.input).systemRegistry,p.systems);assert.ok(sent.instructions.includes('do not translate system names'));assert.ok(PROCESS_SCHEMA.properties.nodes.items.required.includes('systemEvidence'));
 assert.equal(result.draft.nodes.find(n=>n.id==='submit').systemEvidence,p.nodes.find(n=>n.id==='submit').systemEvidence);assert.equal(result.draft.systems[0].label,'BC');
});
test('AI cannot rename a registered system or bypass source evidence',async()=>{
 const p=confirmed(),prepared=prepareProcessRequest({intent:'generate',source:p.source,current:p,expectedVersion:p.version});
 for(const mutate of [raw=>raw.systems[0].label='Expanded or translated BC',raw=>raw.nodes.find(n=>n.id==='submit').systemEvidence='Invented software fact']){
  const raw=clone(p);mutate(raw);await assert.rejects(generateProcessDraft(prepared,{apiKey:'test-only',fetcher:async()=>new Response(JSON.stringify({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(raw)}]}]}))}),e=>e.code==='INVALID_DRAFT');
 }
});
test('card updates invalidate earlier asynchronous results while preserving the current model',()=>{
 const p=expense(),snapshot={intent:'generate',version:p.version,source:p.source,process:clone(p)},next=confirmed();
 assert.equal(matchesAIRequest(snapshot,{process:next,source:next.source}),false);assert.deepEqual(p.systems,[]);
});

test('a registry entry cannot justify assigning a named system without a matching source quote',()=>{
 const p=confirmed();p.nodes.find(n=>n.id==='submit').systemEvidence='employee submits an expense claim';
 assert.ok(validateProcess(p).errors.some(e=>e==='System evidence must name the selected system.'));
 assert.throws(()=>prepareProcessRequest({intent:'generate',source:expense().source,systems:[{id:'bad',label:''}],expectedVersion:1}),e=>e.code==='INVALID_SYSTEMS');
});
