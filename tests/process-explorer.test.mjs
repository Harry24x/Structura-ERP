import test from 'node:test';
import assert from 'node:assert/strict';
import {examples} from '../lib/examples.mjs';
import {clone,createDocument,validateProcess,projectionLayout,toSVG} from '../lib/process.mjs';
import {BC_REFERENCES,subprocesses,overviewProjection,detailProjection,saveExplorer,stepSignature,mappingFor,reconcileExplorer} from '../lib/process-explorer.mjs';
import {EXPLORER_COPY,explorerText} from '../lib/explorer-i18n.mjs';
import {prepareProcessRequest,finalizeProcessDraft} from '../lib/ai-process.mjs';
import {partsFromProcess} from '../public/quality/shared-model.mjs';
import {updateFromGenerator,originForDocument} from '../public/quality/roundtrip.mjs';
const process=()=>clone(examples[1].process);
test('overview accounts for every source node and only projects actual cross-group connections',()=>{
 const p=process(),before=clone(p),groups=subprocesses(p),top=overviewProjection(p,groups);
 assert.deepEqual(groups.flatMap(g=>g.nodeIds).sort(),p.nodes.map(n=>n.id).sort());
 assert.ok(groups.every(g=>!g.confirmed));assert.ok(!groups.some(g=>/\{\w+\}/.test(g.label)));
 const owner=id=>groups.find(g=>g.nodeIds.includes(id)).id;
 for(const e of top.edges)assert.ok(p.edges.some(original=>owner(original.from)===e.from&&owner(original.to)===e.to&&original.label===e.label));
 for(const e of p.edges.filter(e=>owner(e.from)!==owner(e.to)))assert.ok(top.edges.some(t=>t.from===owner(e.from)&&t.to===owner(e.to)&&t.label===e.label));
 for(const direction of ['LR','TD'])assert.ok(projectionLayout(top,direction).nodes.every(n=>Number.isFinite(n.x)&&Number.isFinite(n.y)));
 assert.deepEqual(p,before);
});
test('detail retains branches, return loops and all incoming/outgoing boundary labels',()=>{
 const p=process(),task=p.nodes.find(n=>n.type==='decision'),group={nodeIds:[task.id]},detail=detailProjection(p,group);
 assert.equal(detail.nodes.filter(n=>!n.boundary).length,1);assert.equal(detail.nodes.find(n=>n.id===task.id).label,task.label);
 const expected=p.edges.filter(e=>e.from===task.id||e.to===task.id);assert.deepEqual(detail.edges.map(e=>e.label).sort(),expected.map(e=>e.label).sort());
 assert.ok(detail.nodes.filter(n=>n.boundary).every(n=>!p.nodes.some(original=>original.id===n.id)));
 assert.deepEqual(detailProjection(p,null),p);
});
test('explicit subprocess definitions and BC associations survive JSON import without changing the flow or approval',()=>{
 const p=process(),n=p.nodes.find(n=>n.type==='activity');p.reviewed=true;
 const next=saveExplorer(p,{groups:[{id:'sp_purchasing',label:'Order handling',nodeIds:[n.id],confirmed:true}],bcMappings:[{nodeId:n.id,referenceId:'purchase-order',status:'confirmed',note:'Reviewed document and company configuration.',signature:stepSignature(p,n.id)}]});
 assert.deepEqual(validateProcess(next).errors,[]);assert.deepEqual(next.nodes,p.nodes);assert.deepEqual(next.edges,p.edges);assert.equal(next.mode,p.mode);assert.equal(next.reviewed,true);
 const imported=createDocument(JSON.parse(JSON.stringify(next)),next.source);assert.deepEqual(imported.explorer,next.explorer);
 const grouped=overviewProjection(next);assert.ok(toSVG(grouped,[],{projection:true}).includes('<svg'));assert.ok(toSVG(detailProjection(next,subprocesses(next)[0]),[],{projection:true}).includes('<svg'));assert.equal(mappingFor(next,n.id).status,'confirmed');
 const changed=clone(next);changed.nodes.find(node=>node.id===n.id).label='Changed step';assert.equal(mappingFor(changed,n.id).status,'suggested');
 const reconciled=reconcileExplorer(changed,next);assert.equal(reconciled.explorer.bcMappings[0].status,'suggested');assert.equal(reconciled.explorer.groups[0].confirmed,false);
});
test('malformed, duplicate and unsupported presentation metadata fail validation before import',()=>{
 const p=process(),id=p.nodes[1].id,g={id:'sp_order',label:'Order',nodeIds:[id],confirmed:true};
 for(const groups of [[g,{...g,id:'sp_duplicate'}],[{...g,id:'<script>'}],[{...g,nodeIds:['missing']}],[{...g,label:''}]])assert.throws(()=>saveExplorer(p,{groups}));
 assert.throws(()=>saveExplorer(p,{bcMappings:[{nodeId:id,referenceId:'not-a-real-bc-action',status:'confirmed',note:'Not valid',signature:''}]}));
 assert.throws(()=>saveExplorer(p,{bcMappings:[{nodeId:id,referenceId:'purchase-order',status:'confirmed',note:'',signature:''}]}));
 assert.ok(BC_REFERENCES.every(r=>r.url.startsWith('https://learn.microsoft.com/en-us/dynamics365/business-central/')));
});
test('AI edits retain review metadata outside the model contract and invalidate changed associations; fresh generation resets it',()=>{
 let p=process();const n=p.nodes.find(n=>n.type==='activity');p=saveExplorer(p,{groups:[{id:'sp_order',label:'Order',nodeIds:[n.id],confirmed:true}],bcMappings:[{nodeId:n.id,referenceId:'purchase-order',status:'confirmed',note:'Checked against the company setup.',signature:stepSignature(p,n.id)}]});
 const prepared=prepareProcessRequest({intent:'edit',source:p.source,current:p,expectedVersion:p.version,command:'Keep the current steps.'});
 assert.equal(prepared.current.explorer,undefined);const raw=clone(p);raw.mode='to-be';raw.explorer.groups[0].label='Untrusted model replacement';
 const draft=finalizeProcessDraft(raw,prepared).draft;assert.equal(draft.explorer.groups[0].label,'Order');assert.equal(mappingFor(draft,n.id).status,'confirmed');
 const generated=finalizeProcessDraft({...raw,mode:'as-is'},prepareProcessRequest({intent:'generate',source:p.source,current:p,expectedVersion:p.version})).draft;assert.equal(generated.explorer,undefined);
});
test('account round-trip of presentation changes retains document ID, part IDs/versions, notes, history and proposal targets',()=>{
 const p=process(),parts=partsFromProcess(p);parts[0].notes=[{text:'Earlier accepted idea',proposalId:'proposal_existing'}];
 const doc={id:'existing-mainsten',version:4,revisionId:'rev_test',process:p,parts,history:[{action:'earlier_review'}],connections:[]},before=clone(doc),proposal={docId:doc.id,partId:parts[0].id,events:[{status:'accepted'}]},grant={docId:doc.id,partId:parts[0].id,email:'test@example.com'};
 const next=saveExplorer(p,{groups:[{id:'sp_order',label:'Order',nodeIds:[parts[0].nodeId],confirmed:true}]});
 const updated=updateFromGenerator(doc,next,originForDocument(doc)).document;
 assert.equal(updated.id,doc.id);assert.deepEqual(updated.parts.map(n=>[n.id,n.version,n.notes]),parts.map(n=>[n.id,n.version,n.notes]));assert.deepEqual(updated.history[0],doc.history[0]);
 assert.ok(updated.parts.some(p=>p.id===proposal.partId));assert.ok(updated.parts.some(p=>p.id===grant.partId));assert.deepEqual(doc,before);assert.equal(updated.history.length,2);
});
test('new presentation interface has complete four-language copy',()=>{for(const [key,values]of Object.entries(EXPLORER_COPY)){assert.equal(values.length,4,key);for(const value of values)assert.ok(typeof value==='string'&&value.trim(),key);}for(const locale of ['en','et','fr','de'])assert.notEqual(explorerText(locale)('overall'),'overall');});

test('projection layout supports one-node groups, multiple entries, disconnected groups and cycles without weakening process validation',()=>{
 const p=process(),tasks=p.nodes.filter(n=>n.type==='activity');
 for(const nodeIds of [[p.nodes[0].id],p.nodes.map(n=>n.id),tasks.map(n=>n.id)]){
  const next=saveExplorer(p,{groups:[{id:'sp_custom',label:'Selected work',nodeIds,confirmed:true}]});
  for(const projection of [overviewProjection(next),detailProjection(next,subprocesses(next)[0])])for(const direction of ['LR','TD']){
   assert.ok(projectionLayout(projection,direction).nodes.every(n=>Number.isFinite(n.x)&&Number.isFinite(n.y)));assert.ok(toSVG(projection,[],{projection:true,direction}).includes('<svg'));
  }
 }
 assert.throws(()=>projectionLayout({nodes:[{id:'x',type:'activity',label:'x'}],edges:[{from:'x',to:'missing',label:''}]}));
 const single={...p,nodes:[tasks[0]],edges:[]};assert.ok(validateProcess(single).errors.length);
});

test('an explicitly assigned middle step splits suggested chains instead of merging across the subprocess boundary',()=>{
 const p=process(),first=p.nodes.find(n=>n.id==='record');p.source+=' Sales verifies the order. Sales finishes the order entry.';
 const second={...clone(first),id:'verify_entry',label:'Verify entry',evidence:'Sales verifies the order'},third={...clone(first),id:'finish_entry',label:'Finish entry',evidence:'Sales finishes the order entry'};
 p.nodes.push(second,third);p.edges=p.edges.flatMap(e=>e.from===first.id?[{from:first.id,to:second.id,label:''},{from:second.id,to:third.id,label:''},{...e,from:third.id}]:[e]);
 const grouped=saveExplorer(p,{groups:[{id:'sp_check',label:'Independent check',nodeIds:[second.id],confirmed:true}]});
 assert.ok(!subprocesses(grouped).some(g=>g.nodeIds.includes(first.id)&&g.nodeIds.includes(third.id)));
 const malformed=clone(grouped);malformed.nodes[0]=null;assert.ok(validateProcess(malformed).errors.length);
 const top=overviewProjection(grouped);assert.ok(!toSVG(top,[],{projection:true,compact:true,includeSystemLegend:false}).includes('System unknown'));
});
