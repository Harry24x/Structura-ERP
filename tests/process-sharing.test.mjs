import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture} from './helpers/account-fixture.mjs';
import {readAccount,commitAccount,accountFile} from '../lib/account-store.mjs';
import {grantPart,ownerGrants,revokePart,sharedParts,submitSharedProposal} from '../lib/process-sharing.mjs';
import {createPart,reviewProposal,implementProposal} from '../public/quality/core.mjs';
import {examples} from '../lib/examples.mjs';
import {partsFromProcess} from '../public/quality/shared-model.mjs';
const owner={userId:'account-a',displayName:'Kvaliteedijuht',email:'manager@example.test'},employee={userId:'worker-b',displayName:'Mari',email:'mari@example.test'},stranger={userId:'worker-c',displayName:'Teine töötaja',email:'other@example.test'};
async function setup(){const f=fixture();f.doc.pages[0].texts=[{text:'SECRET SOURCE TEXT',x:10,y:10,w:100,h:20}];f.doc.privateMetadata='SECRET FULL PROCESS';f.doc.parts.push(createPart(f.doc,{page:1,label:'SECRET OTHER PART',area:'sales',bounds:{x:.1,y:.3,w:.5,h:.1}},{role:'manager',name:'A'}));await commitAccount(f.db,f.bucket,owner,{baseRevision:0,records:[{store:'documents',value:f.doc},{store:'files',value:{id:f.doc.id}},{store:'proposals',value:f.proposal}]},new Map([[f.doc.id,f.file]]));return f;}
const grantInput=f=>({docId:f.doc.id,partId:f.doc.parts[0].id,email:' MARI@example.test '});
const proposalInput=(f,id)=>({grantId:id,partVersion:f.doc.parts[0].version,title:'Selgem kontroll',problem:'Kontrolli juhis vajab täpsustust',suggestion:'Lisa kontrolli juhis',benefit:'Vähem segadust',author:'Forged Manager',status:'implemented',partId:f.doc.parts[1].id});

test('email invitation binds once to stable user id and exposes only the selected part',async()=>{
 const f=await setup(),g=await grantPart(f.db,f.bucket,owner,grantInput(f));
 assert.equal((await sharedParts(f.db,stranger)).parts.length,0);let inbox=await sharedParts(f.db,employee);assert.equal(inbox.parts.length,1);assert.equal(inbox.parts[0].part.label,f.doc.parts[0].label);assert.equal(inbox.proposals.length,0);assert.doesNotMatch(JSON.stringify(inbox),/SECRET|source|bounds|pages|connections/);
 assert.equal((await sharedParts(f.db,{...stranger,email:employee.email})).parts.length,0);assert.equal((await sharedParts(f.db,{...employee,email:'new-address@example.test'})).parts.length,1);
 assert.equal((await ownerGrants(f.db,owner))[0].claimed,true);assert.equal((await ownerGrants(f.db,employee)).length,0);
 await assert.rejects(()=>accountFile(f.db,f.bucket,employee,f.doc.id),e=>e.status===404);assert.equal((await readAccount(f.db,f.bucket,employee)).documents.length,0);
 await assert.rejects(()=>grantPart(f.db,f.bucket,employee,{...grantInput(f),email:stranger.email}),e=>e.status===404);await assert.rejects(()=>revokePart(f.db,employee,g.id),e=>e.status===404);
});
test('employee proposal reaches owner review; decisions and application return to that employee without changing earlier history',async()=>{
 const f=await setup(),g=await grantPart(f.db,f.bucket,owner,grantInput(f)),before=(await readAccount(f.db,f.bucket,owner)).proposals[0];
 await assert.rejects(()=>submitSharedProposal(f.db,f.bucket,stranger,proposalInput(f,g.id)),e=>e.status===403);
 await assert.rejects(()=>submitSharedProposal(f.db,f.bucket,employee,{...proposalInput(f,g.id),partVersion:0}),e=>e.status===409);
 await submitSharedProposal(f.db,f.bucket,employee,proposalInput(f,g.id));let state=await readAccount(f.db,f.bucket,owner),p=state.proposals.find(p=>p.grantId===g.id);assert.equal(p.author,'Mari');assert.equal(p.authorUserId,employee.userId);assert.equal(p.status,'submitted');assert.equal(p.partId,f.doc.parts[0].id);assert.equal(p.authorRole,'employee');
 const accepted=reviewProposal(p,{status:'accepted',reason:'Juhis sobib',thanks:'Aitäh tähelepaneku eest!'},{role:'manager',name:owner.displayName});const applied=implementProposal(state.documents[0],accepted,'Kontrollijuhis täiendatud.',{role:'manager',name:owner.displayName});await commitAccount(f.db,f.bucket,owner,{baseRevision:state.revision,records:[{store:'documents',value:applied.document},{store:'proposals',value:applied.proposal}]});
 const inbox=await sharedParts(f.db,employee);assert.equal(inbox.proposals.length,1);assert.equal(inbox.proposals[0].status,'implemented');assert.deepEqual(inbox.proposals[0].events.map(e=>e.status),['accepted','implemented']);assert.match(inbox.proposals[0].events[1].thanks,/Aitäh/);assert.deepEqual((await readAccount(f.db,f.bucket,owner)).proposals.find(p=>p.id===before.id),before);
});
test('revocation stops reads and submissions while preserving owner history; delegated commit is atomic against revocation',async()=>{
 const f=await setup(),g=await grantPart(f.db,f.bucket,owner,grantInput(f));await submitSharedProposal(f.db,f.bucket,employee,proposalInput(f,g.id));const before=await readAccount(f.db,f.bucket,owner);await revokePart(f.db,owner,g.id);assert.equal((await sharedParts(f.db,employee)).parts.length,0);assert.equal((await sharedParts(f.db,employee)).proposals.length,0);await assert.rejects(()=>submitSharedProposal(f.db,f.bucket,employee,proposalInput(f,g.id)),e=>e.status===403);
 assert.deepEqual((await readAccount(f.db,f.bucket,owner)).proposals,before.proposals);
 const record={...f.proposal,id:'race-proposal',authorUserId:employee.userId,grantId:g.id};await assert.rejects(()=>commitAccount(f.db,f.bucket,owner,{baseRevision:before.revision,records:[{store:'proposals',value:record}]},new Map(),{grantId:g.id,userId:employee.userId}),e=>e.status===409);assert.equal((await readAccount(f.db,f.bucket,owner)).revision,before.revision);
});
test('unassigned active parts can be shared; archived and superseded cards cannot be shared or submitted to',async()=>{
 const f=await setup();let state=await readAccount(f.db,f.bucket,owner);const d=structuredClone(state.documents[0]);d.parts[0].area='unassigned';await commitAccount(f.db,f.bucket,owner,{baseRevision:state.revision,records:[{store:'documents',value:d}]});const g=await grantPart(f.db,f.bucket,owner,grantInput(f));await submitSharedProposal(f.db,f.bucket,employee,proposalInput(f,g.id));state=await readAccount(f.db,f.bucket,owner);d.parts[0].archived=true;await commitAccount(f.db,f.bucket,owner,{baseRevision:state.revision,records:[{store:'documents',value:d}]});assert.equal((await sharedParts(f.db,employee)).parts.length,0);await assert.rejects(()=>submitSharedProposal(f.db,f.bucket,employee,proposalInput(f,g.id)),e=>e.status===403);await assert.rejects(()=>grantPart(f.db,f.bucket,owner,grantInput(f)),e=>e.status===404);
});

test('restored copies and other-step proposals cannot inherit a source part grant',async()=>{
 const f=await setup(),g=await grantPart(f.db,f.bucket,owner,grantInput(f));await submitSharedProposal(f.db,f.bucket,employee,proposalInput(f,g.id));const state=await readAccount(f.db,f.bucket,owner),p=state.proposals.find(p=>p.grantId===g.id),copy={...structuredClone(f.doc),id:'copy-document',name:'Private restored copy'};
 await commitAccount(f.db,f.bucket,owner,{baseRevision:state.revision,records:[{store:'documents',value:copy},{store:'files',value:{id:copy.id}},{store:'proposals',value:{...p,id:'copied-proposal',docId:copy.id,title:'PRIVATE COPY RESPONSE'}},{store:'proposals',value:{...p,id:'different-step-proposal',partId:f.doc.parts[1].id,title:'PRIVATE OTHER STEP'}}]},new Map([[copy.id,f.file]]));
 const inbox=await sharedParts(f.db,employee);assert.equal(inbox.proposals.length,1);assert.equal(inbox.proposals[0].id,p.id);assert.doesNotMatch(JSON.stringify(inbox),/PRIVATE COPY|PRIVATE OTHER/);
});

test('client grant records server-controlled authorship and consultant reviews without expanding recipient rights',async()=>{
 const f=await setup(),g=await grantPart(f.db,f.bucket,owner,{...grantInput(f),recipientRole:'client'});
 await submitSharedProposal(f.db,f.bucket,employee,{...proposalInput(f,g.id),authorRole:'manager',recipientRole:'employee'});
 const account=await readAccount(f.db,f.bucket,owner),p=account.proposals.find(p=>p.grantId===g.id);
 assert.equal(p.authorRole,'client');
 const reviewed=reviewProposal(p,{status:'accepted',reason:'Fits the process',thanks:'Thank you!'},{role:'consultant',name:'Digmatix consultant'});
 await commitAccount(f.db,f.bucket,owner,{baseRevision:account.revision,records:[{store:'proposals',value:reviewed}]});
 const inbox=await sharedParts(f.db,employee);assert.equal(inbox.parts[0].recipientRole,'client');assert.equal(inbox.proposals[0].status,'accepted');
 assert.equal(inbox.proposals[0].events[0].actor,'Digmatix consultant');assert.equal(inbox.processes.length,0);
 assert.equal((await ownerGrants(f.db,owner))[0].recipientRole,'client');
 await assert.rejects(()=>grantPart(f.db,f.bucket,employee,{...grantInput(f),email:stranger.email,scope:'process'}),e=>e.status===404);
 await assert.rejects(()=>grantPart(f.db,f.bucket,owner,{...grantInput(f),recipientRole:'manager'}));
 await assert.rejects(()=>grantPart(f.db,f.bucket,owner,{...grantInput(f),recipientRole:'consultant'}));
 await assert.rejects(()=>grantPart(f.db,f.bucket,owner,{...grantInput(f),scope:'all-accounts'}));
 await assert.rejects(()=>grantPart(f.db,f.bucket,owner,grantInput(f)),/saaja roll/);
 assert.deepEqual((await readAccount(f.db,f.bucket,owner)).proposals.find(p=>p.id===f.proposal.id),f.proposal);
});

test('whole-process grant shows editable-process diagram read-only, targets each active step, follows added steps and revokes together',async()=>{
 const f=await setup(),account=await readAccount(f.db,f.bucket,owner),doc=structuredClone(account.documents[0]);
 doc.process=structuredClone(examples[0].process);doc.parts=partsFromProcess(doc.process);doc.parts[0].id=f.proposal.partId;
 doc.process.privateMetadata='PRIVATE PROCESS DATA';doc.process.nodes[0].privateField='PRIVATE NODE DATA';
 await commitAccount(f.db,f.bucket,owner,{baseRevision:account.revision,records:[{store:'documents',value:doc}]});
 const g=await grantPart(f.db,f.bucket,owner,{docId:doc.id,email:employee.email,recipientRole:'client',scope:'process'});
 assert.equal((await grantPart(f.db,f.bucket,owner,{docId:doc.id,email:employee.email,recipientRole:'client',scope:'process'})).existing,true);
 let inbox=await sharedParts(f.db,employee);assert.equal(inbox.parts.length,doc.parts.length);assert.equal(inbox.processes.length,1);
 assert.equal(new Set(inbox.parts.map(p=>p.id)).size,doc.parts.length);assert.ok(inbox.parts.every(p=>p.grantId===g.id&&p.scope==='process'));
 const graph=inbox.processes[0].process;assert.equal(graph.source,'');assert.ok(graph.nodes.every(n=>!n.evidence));assert.deepEqual(graph.edges,doc.process.edges);
 assert.doesNotMatch(JSON.stringify(inbox),/PRIVATE|SECRET SOURCE TEXT|pages|bounds|privateMetadata|privateField/);
 const target=doc.parts[1];await submitSharedProposal(f.db,f.bucket,employee,{...proposalInput(f,g.id),partId:target.id,partVersion:target.version});
 inbox=await sharedParts(f.db,employee);assert.equal(inbox.proposals[0].partId,target.id);assert.equal(inbox.proposals[0].authorRole,'client');
 await assert.rejects(()=>submitSharedProposal(f.db,f.bucket,employee,{...proposalInput(f,g.id),partId:'not-in-document'}),e=>e.status===403);
 const latest=await readAccount(f.db,f.bucket,owner),next=structuredClone(latest.documents[0]);
 next.parts.push(createPart(next,{page:1,label:'New step',area:'sales',bounds:{x:.1,y:.3,w:.4,h:.1}},{role:'consultant',name:'Consultant'}));next.version++;
 await commitAccount(f.db,f.bucket,owner,{baseRevision:latest.revision,records:[{store:'documents',value:next}]});
 assert.equal((await sharedParts(f.db,employee)).parts.length,next.parts.length);
 await revokePart(f.db,owner,g.id);inbox=await sharedParts(f.db,employee);assert.equal(inbox.parts.length,0);assert.equal(inbox.processes.length,0);assert.equal(inbox.proposals.length,0);
 assert.equal((await readAccount(f.db,f.bucket,owner)).proposals.find(p=>p.grantId===g.id).partId,target.id);
});

test('schema defaults keep legacy step grants and identities intact',async()=>{
 const f=await setup();await f.db.prepare('INSERT INTO studio_grants(id,owner_id,document_id,part_id,email,owner_name,created_at) VALUES(?,?,?,?,?,?,?)').bind('legacy-grant',owner.userId,f.doc.id,f.doc.parts[0].id,employee.email,owner.displayName,new Date().toISOString()).run();
 const grants=await ownerGrants(f.db,owner);assert.equal(grants[0].id,'legacy-grant');assert.equal(grants[0].scope,'part');assert.equal(grants[0].recipientRole,'employee');
 const inbox=await sharedParts(f.db,employee);assert.equal(inbox.parts[0].id,'legacy-grant');assert.equal(inbox.parts[0].part.id,f.doc.parts[0].id);assert.equal(inbox.processes.length,0);
});
