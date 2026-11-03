import {fixture} from './helpers/account-fixture.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readAccount,commitAccount,accountFile} from '../lib/account-store.mjs';
import {createPart,createProposal,reviewProposal,implementProposal} from '../public/quality/core.mjs';
const a={userId:'account-a',displayName:'A',email:'a@example.test'},b={userId:'account-b',displayName:'B',email:'b@example.test'};
const manager={role:'manager',name:'A'},employee={role:'employee',name:'A',area:'purchasing'};
async function seed(f){return commitAccount(f.db,f.bucket,a,{baseRevision:0,records:[{store:'documents',value:f.doc},{store:'files',value:{id:f.doc.id}},{store:'proposals',value:f.proposal}]},new Map([[f.doc.id,f.file]]));}

test('assigned Digmatix accounts receive consultant role without access to other accounts',async()=>{
 const f=fixture();await seed(f);
 for(const [i,email]of ['sandertammela@gmail.com',' JANA.RAUDVERE@gmail.com '].entries()){
  const account=await readAccount(f.db,f.bucket,{userId:'consultant-'+i,email,displayName:'Consultant'});
  assert.equal(account.user.role,'consultant');assert.equal(account.permissions.manage,true);assert.equal(account.documents.length,0);
 }
 assert.equal((await readAccount(f.db,f.bucket,a)).user.role,'manager');
});
test('account records and source files are isolated by authenticated identity',async()=>{
 const f=fixture();await readAccount(f.db,f.bucket,a);await seed(f);assert.equal((await readAccount(f.db,f.bucket,a)).documents[0].name,f.doc.name);assert.equal((await readAccount(f.db,f.bucket,b)).documents.length,0);await assert.rejects(()=>accountFile(f.db,f.bucket,b,f.doc.id),e=>e.status===404);assert.ok((await accountFile(f.db,f.bucket,a,f.doc.id)).object);await assert.rejects(()=>readAccount(f.db,f.bucket,null),e=>e.status===401);
});
test('independent clients see proposals and decisions; stale updates cannot overwrite account history',async()=>{
 const f=fixture();await seed(f);const browser1=await readAccount(f.db,f.bucket,a),browser2=await readAccount(f.db,f.bucket,a);assert.deepEqual(browser1.proposals,browser2.proposals);
 const reviewing=reviewProposal(browser1.proposals[0],{status:'reviewing',reason:'Vaatan läbi'},manager);await commitAccount(f.db,f.bucket,a,{baseRevision:browser1.revision,records:[{store:'proposals',value:reviewing}]});
 const stale=reviewProposal(browser2.proposals[0],{status:'rejected',reason:'Stale',thanks:'Thanks'},manager);await assert.rejects(()=>commitAccount(f.db,f.bucket,a,{baseRevision:browser2.revision,records:[{store:'proposals',value:stale}]}),e=>e.code==='REVISION_CONFLICT');
 const latest=await readAccount(f.db,f.bucket,a),accepted=reviewProposal(latest.proposals[0],{status:'accepted',reason:'Sobib',thanks:'Aitäh panuse eest!'},manager),applied=implementProposal(latest.documents[0],accepted,'Juhis lisatud.',manager);
 await commitAccount(f.db,f.bucket,a,{baseRevision:latest.revision,records:[{store:'documents',value:applied.document},{store:'proposals',value:applied.proposal}]});const after=await readAccount(f.db,f.bucket,a);assert.equal(after.proposals[0].status,'implemented');assert.deepEqual(after.proposals[0].events.map(e=>e.status),['reviewing','accepted','implemented']);assert.equal(after.documents[0].parts[0].notes[0].text,'Juhis lisatud.');
 await assert.rejects(()=>commitAccount(f.db,f.bucket,a,{baseRevision:after.revision,records:[{store:'proposals',value:f.proposal}]}),e=>e.code==='HISTORY_CONFLICT');
});
test('invalid references and invalid source uploads do not commit partial work or leave staged files',async()=>{
 const f=fixture();await assert.rejects(()=>commitAccount(f.db,f.bucket,a,{baseRevision:0,records:[{store:'documents',value:f.doc},{store:'files',value:{id:f.doc.id}},{store:'proposals',value:{...f.proposal,partId:'missing'}}]},new Map([[f.doc.id,f.file]])));assert.equal((await readAccount(f.db,f.bucket,a)).revision,0);assert.equal(f.objects.size,0);
 await assert.rejects(()=>commitAccount(f.db,f.bucket,a,{baseRevision:0,records:[{store:'documents',value:f.doc},{store:'files',value:{id:f.doc.id}}]},new Map([[f.doc.id,new File(['not an image'],'bad.png')]])));assert.equal((await readAccount(f.db,f.bucket,a)).documents.length,0);assert.equal(f.objects.size,0);
});
