import test from 'node:test';
import assert from 'node:assert/strict';
import {examples} from '../lib/examples.mjs';
import {clone,validateProcess} from '../lib/process.mjs';
import {partsFromProcess} from '../public/quality/shared-model.mjs';
import {originForDocument,updateFromGenerator,mergeGeneratorCopy} from '../public/quality/roundtrip.mjs';
import {createProposal,reviewProposal,implementProposal,visibleParts,visibleProposals,validateBackup} from '../public/quality/core.mjs';
const manager={role:'manager',name:'Kvaliteedijuht'},employee={role:'employee',name:'Töötaja',area:'accounting'};
function fixture(){const process=clone(examples[0].process),parts=partsFromProcess(process);return {id:'original',revisionId:'r1',name:'Original.pdf',format:'pdf',mime:'application/pdf',createdAt:'2026-11-01T08:00:00Z',version:3,process,pages:[{width:600,height:900,texts:[]}],parts,connections:[],history:[{action:'earlier_history'}]};}
function addStep(process){const next=clone(process),first=next.nodes.find(n=>n.type==='activity'),old=next.edges.find(e=>e.to===first.id);next.source+='\nRequested improvement: Check the order details.';next.nodes.push({...first,id:'check_details',label:'Check order details',evidence:'Check the order details.'});next.edges=next.edges.filter(e=>e!==old);next.edges.push({...old,to:'check_details'},{from:'check_details',to:first.id,label:''});next.version++;next.mode='to-be';assert.deepEqual(validateProcess(next).errors,[]);return next;}
function proposal(doc){return createProposal(doc,{partId:doc.parts[0].id,title:'A clearer step',problem:'Description unclear',suggestion:'Clarify this step',benefit:'Clearer work',type:'label',proposedLabel:'Submit a checked claim'},employee);}
test('return updates the same document and stable task identities, retaining original source and history',()=>{
 const doc=fixture(),before=clone(doc),incoming=addStep(doc.process),result=updateFromGenerator(doc,incoming,originForDocument(doc));
 assert.equal(result.document.id,doc.id);assert.equal(result.document.name,doc.name);assert.equal(result.document.version,4);assert.deepEqual(result.document.pages,doc.pages);assert.equal(result.document.format,'pdf');
 assert.equal(result.document.parts.length,doc.parts.length+1);for(const part of doc.parts){const next=result.document.parts.find(p=>p.nodeId===part.nodeId);assert.equal(next.id,part.id);assert.deepEqual(next.bounds,part.bounds);assert.deepEqual(next.notes,part.notes);}
 assert.equal(result.document.parts.find(p=>p.nodeId==='check_details').diagramOnly,true);assert.deepEqual(result.document.history[0],doc.history[0]);assert.deepEqual(result.document.history.at(-1).beforeProcess,doc.process);assert.deepEqual(doc,before);
});
test('unchanged return is idempotent; repeated edited returns retain one document and proposal links',()=>{
 let doc=fixture();const p=proposal(doc);for(let i=0;i<3;i++){const incoming=clone(doc.process);incoming.version++;incoming.title+=' revised';doc=updateFromGenerator(doc,incoming,originForDocument(doc)).document;assert.equal(doc.id,'original');assert.equal(doc.parts[0].id,p.partId);assert.equal(visibleProposals([p],doc,manager).length,1);}
 const unchanged=updateFromGenerator(doc,clone(doc.process),originForDocument(doc));assert.equal(unchanged.changed,false);assert.equal(unchanged.document.version,doc.version);
});
test('completed proposal feedback and task notes survive a return unchanged',()=>{
 let doc=fixture();const p=reviewProposal(proposal(doc),{status:'accepted',reason:'Suitable',thanks:'Thanks for noticing.'},manager),applied=implementProposal(doc,p,'Added the improvement.',manager);doc=applied.document;const original=clone(applied.proposal),incoming=clone(doc.process);incoming.version++;incoming.title+=' revised';
 const updated=updateFromGenerator(doc,incoming,originForDocument(doc)).document;
 assert.equal(updated.parts.find(part=>part.id===p.partId).notes[0].text,'Added the improvement.');assert.deepEqual(applied.proposal,original);assert.equal(visibleProposals([original],updated,manager)[0].events.at(-1).thanks,'Thanks for noticing.');
});
test('stale origin, missing target and older model are rejected without altering the card',()=>{
 const doc=fixture(),origin=originForDocument(doc),incoming=addStep(doc.process),before=clone(doc);
 for(const changed of [{...doc,version:4},{...doc,revisionId:'r2'},{...doc,process:{...doc.process,version:8}},{...doc,id:'other'}])assert.throws(()=>updateFromGenerator(changed,incoming,origin),/vahepeal/);
 assert.throws(()=>updateFromGenerator(null,incoming,origin),/vahepeal/);assert.throws(()=>updateFromGenerator(doc,{...doc.process,version:0},origin),/vanem/);assert.deepEqual(doc,before);
});
test('removed task keeps its proposals in history and cannot accept an obsolete implementation',()=>{
 const doc=fixture(),p=reviewProposal(proposal(doc),{status:'accepted',reason:'Suitable',thanks:'Thanks'},manager),incoming=clone(doc.process),part=doc.parts[0],node=part.nodeId;
 const inEdge=incoming.edges.find(e=>e.to===node),outEdge=incoming.edges.find(e=>e.from===node);incoming.nodes=incoming.nodes.filter(n=>n.id!==node);incoming.edges=incoming.edges.filter(e=>e.to!==node&&e.from!==node);incoming.edges.push({from:inEdge.from,to:outEdge.to,label:''});incoming.questions=incoming.questions.filter(q=>!q.nodeIds.includes(node));incoming.version++;
 const next=updateFromGenerator(doc,incoming,originForDocument(doc)).document;
 assert.ok(next.parts.find(part=>part.id===p.partId).archived);assert.ok(!visibleParts(next,manager).some(part=>part.id===p.partId));assert.equal(visibleProposals([p],next,manager).length,1);assert.throws(()=>implementProposal(next,p,'Apply',manager),/eemaldatud/);
});
test('changed role invalidates pending implementation while unrelated title change keeps task version',()=>{
 const doc=fixture(),p=reviewProposal(proposal(doc),{status:'accepted',reason:'Suitable',thanks:'Thanks'},manager),incoming=clone(doc.process);incoming.nodes.find(n=>n.id===doc.parts[0].nodeId).roleId=incoming.roles[1].id;incoming.version++;
 const next=updateFromGenerator(doc,incoming,originForDocument(doc)).document;assert.throws(()=>implementProposal(next,p,'Apply',manager),/vahepeal/);
 const unrelated=clone(doc.process);unrelated.title+=' revised';unrelated.version++;const other=updateFromGenerator(doc,unrelated,originForDocument(doc)).document;assert.equal(other.parts[0].version,doc.parts[0].version);
});
test('explicit legacy linking preserves target proposals and migrates copy proposals without altering event history',()=>{
 const target=fixture(),targetProposal=proposal(target),copy={...fixture(),id:'copy',name:'From generator',process:addStep(target.process),parts:partsFromProcess(addStep(target.process)),history:[{action:'copy_history'}]},copyProposal=proposal(copy),before=clone([targetProposal,copyProposal]);
 const result=mergeGeneratorCopy(target,copy,[targetProposal,copyProposal],originForDocument(target));
 assert.equal(result.document.id,target.id);assert.equal(result.copy.supersededBy,target.id);assert.equal(result.document.parts.filter(p=>!p.archived).length,target.parts.length+1);assert.deepEqual(targetProposal,before[0]);assert.equal(result.proposals[0].id,copyProposal.id);assert.equal(result.proposals[0].docId,target.id);assert.deepEqual(result.proposals[0].events,copyProposal.events);assert.ok(result.proposals[0].needsRebase);assert.ok(result.document.parts.some(p=>p.id===result.proposals[0].partId));assert.deepEqual(copyProposal,before[1]);
 const backup={format:'process-studio-local-pilot',version:1,document:result.document,proposals:[targetProposal,...result.proposals],fileBase64:'YQ=='};assert.doesNotThrow(()=>validateBackup(backup));
});
