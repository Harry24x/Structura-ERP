import test from 'node:test';
import assert from 'node:assert/strict';
import {examples} from '../lib/examples.mjs';
import {partsFromProcess} from '../public/quality/shared-model.mjs';
import {ROLES,canManage,createProposal,reviewProposal,implementProposal,visibleParts,visibleProposals,validateBackup,createPart,updatePart} from '../public/quality/core.mjs';
import {originForDocument,updateFromGenerator} from '../public/quality/roundtrip.mjs';
const manager={role:'manager',name:'Kvaliteedijuht'}, employee={role:'employee',name:'Sama nimi',area:'accounting'},client={...employee,role:'client'};
function fixture(){const process=structuredClone(examples[0].process);return {id:'original',revisionId:'r1',name:'Diagram.pdf',format:'pdf',version:1,createdAt:new Date().toISOString(),process,pages:[{width:600,height:900,texts:[]}],parts:partsFromProcess(process),connections:[],history:[]};}
const input=doc=>({partId:doc.parts[0].id,title:'Katse',problem:'Ebaselge kontroll',suggestion:'Täpsusta kontrolli',benefit:'Selgem töö',type:'general'});
const decision=status=>({status,reason:'Katseotsus',thanks:'Aitäh panuse eest!'});

test('Digmatix ERP consultant has the same management actions as quality manager',()=>{
 const consultant={role:'consultant',name:'ERP consultant'},doc=fixture();
 assert.equal(ROLES.consultant,'Digmatix ERP consultant');
 for(const role of ['manager','consultant'])assert.equal(canManage(role),true);
 for(const role of ['employee','client','admin',''])assert.equal(canManage(role),false);
 const proposal=createProposal(doc,input(doc),client),accepted=reviewProposal(proposal,decision('accepted'),consultant);
 const applied=implementProposal(doc,accepted,'Kinnitatud juhis',consultant);
 assert.equal(applied.proposal.status,'implemented');assert.equal(applied.proposal.events.at(-1).actor,consultant.name);
 assert.equal(updatePart(doc,{...doc.parts[0],label:'Updated'},consultant).parts[0].label,'Updated');
 assert.ok(createPart(doc,{page:1,label:'New',area:'sales',bounds:{x:.1,y:.1,w:.2,h:.1}},consultant));
 assert.deepEqual(visibleParts(doc,consultant),visibleParts(doc,manager));
 assert.deepEqual(visibleProposals([proposal],doc,consultant),[proposal]);
 assert.throws(()=>createProposal(doc,input(doc),consultant));
});
test('employee and client proposals preserve distinct authorship, including identical demo names and legacy proposals',()=>{
 const doc=fixture(),a=createProposal(doc,input(doc),employee),b=createProposal(doc,input(doc),client),legacy={...a,id:'legacy'};delete legacy.authorRole;
 assert.equal(b.authorRole,'client');assert.deepEqual(visibleProposals([a,b,legacy],doc,client).map(p=>p.id),[b.id]);assert.equal(visibleProposals([a,b,legacy],doc,employee).length,2);assert.equal(visibleProposals([a,b,legacy],doc,manager).length,3);
 for(const actor of [employee,client]){assert.throws(()=>reviewProposal(b,decision('accepted'),actor));assert.throws(()=>updatePart(doc,{...doc.parts[0],label:'Changed'},actor));assert.throws(()=>createPart(doc,{page:1,label:'New',area:'accounting',bounds:{x:.1,y:.1,w:.2,h:.1}},actor));}
 assert.throws(()=>createProposal(doc,input(doc),{...client,area:'sales'}));assert.throws(()=>createProposal(doc,input(doc),manager));
});
test('reviewing a new control-step proposal appends its own history without modifying an earlier implemented proposal',()=>{
 let doc=fixture(),old=reviewProposal(createProposal(doc,input(doc),employee),decision('accepted'),manager);const applied=implementProposal(doc,old,'Varasem märkus',manager);doc=applied.document;old=structuredClone(applied.proposal);const before=structuredClone(old);
 const newStep={...doc.parts[0],id:'new-control',nodeId:undefined,label:'Kontrolli andmeid',version:1,notes:[]};doc={...doc,parts:[...doc.parts,newStep]};
 const submitted=createProposal(doc,{...input(doc),partId:newStep.id},client),reviewing=reviewProposal(submitted,decision('reviewing'),manager),accepted=reviewProposal(reviewing,decision('accepted'),manager);
 assert.deepEqual(accepted.events.map(e=>e.status),['reviewing','accepted']);assert.deepEqual(old,before);assert.equal(visibleProposals([old,accepted],doc,manager).length,2);assert.equal(accepted.partId,newStep.id);assert.equal(doc.parts.at(-1).notes.length,0);
 const backup={format:'process-studio-local-pilot',version:1,document:doc,proposals:[old,accepted],fileBase64:'YQ=='};assert.equal(validateBackup(backup),backup);assert.throws(()=>validateBackup({...backup,proposals:[{...accepted,authorRole:'manager'}]}));
 const incoming=structuredClone(doc.process);incoming.version++;incoming.title+=' revised';const next=updateFromGenerator(doc,incoming,originForDocument(doc)).document;assert.equal(visibleProposals([old,accepted],next,manager).length,2);assert.deepEqual(old,before);assert.equal(accepted.authorRole,'client');
});


test('signed account owner can propose on an unassigned step without weakening demo area guards',()=>{const doc=fixture();doc.parts[0].area='unassigned';assert.throws(()=>createProposal(doc,input(doc),employee));const p=createProposal(doc,input(doc),{...employee,canProposeAnyArea:true});assert.equal(p.partId,doc.parts[0].id);assert.equal(p.authorRole,'employee');assert.throws(()=>createProposal(doc,input(doc),{...manager,canProposeAnyArea:true}));});
