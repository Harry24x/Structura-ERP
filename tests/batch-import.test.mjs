import test from 'node:test';
import assert from 'node:assert/strict';
import {sourceHash,pendingImport,findSource,importedDraft} from '../public/quality/batch-import.mjs';
import {examples} from '../lib/examples.mjs';
import {readAccount,commitAccount} from '../lib/account-store.mjs';
import {fixture} from './helpers/account-fixture.mjs';

function draft(){const p=structuredClone(examples[0].process);return {draft:p,regions:p.nodes.filter(n=>['activity','decision'].includes(n.type)).map((n,i)=>({nodeId:n.id,x:.1,y:.1+i*.08,w:.4,h:.05})),warnings:['Kontrolli algfailiga']};}
const queued=(id='new-source')=>({id,name:'Test import',format:'image',mime:'image/png',version:1,createdAt:new Date().toISOString(),pages:[{width:1000,height:1000,texts:[]}],parts:[],connections:[],history:[],intake:{kind:'image-batch',sha256:'hash',mode:'as-is',sourceName:'test.png',state:'pending'}});

test('identical bytes deduplicate despite different names; used cards cannot be re-digitalized',async()=>{
 const hash=await sourceHash(new Blob(['same']));assert.equal(hash,await sourceHash(new File(['same'],'renamed.png')));
 const d=queued();d.intake.sha256=hash;assert.equal(findSource([d],hash),d);
 assert.ok(pendingImport(d));assert.ok(pendingImport({...d,intake:{...d.intake,state:'failed'}}));
 for(const modified of [{...d,parts:[{}]},{...d,history:[{}]},{...d,process:draft().draft},{...d,intake:{...d.intake,state:'ready'}}])assert.throws(()=>importedDraft(modified,draft(),'Owner'),/üle/);
});
test('a validated editable draft keeps source identity and remains unapproved',()=>{
 const d=queued(),before=structuredClone(d),result=draft(),next=importedDraft(d,result,'Owner');
 assert.deepEqual(d,before);assert.equal(next.id,d.id);assert.equal(next.version,2);assert.equal(next.process.reviewed,false);assert.equal(next.intake.state,'ready');assert.equal(next.parts.length,result.regions.length);assert.equal(next.history[0].sourceSha256,'hash');assert.equal(pendingImport(next),false);
 assert.throws(()=>importedDraft({...d,intake:{...d.intake,mode:'to-be'}},result,'Owner'),/vaade/);
});
test('importing and digitalizing a new card preserves existing process and proposal history across account clients',async()=>{
 const f=fixture(),owner={userId:'owner',displayName:'Owner',email:'owner@example.test'};
 await commitAccount(f.db,f.bucket,owner,{baseRevision:0,records:[{store:'documents',value:f.doc},{store:'files',value:{id:f.doc.id}},{store:'proposals',value:f.proposal}]},new Map([[f.doc.id,f.file]]));
 const before=await readAccount(f.db,f.bucket,owner),d=queued();
 await commitAccount(f.db,f.bucket,owner,{baseRevision:before.revision,records:[{store:'documents',value:d},{store:'files',value:{id:d.id}}]},new Map([[d.id,f.file]]));
 const secondBrowser=await readAccount(f.db,f.bucket,owner),next=importedDraft(d,draft(),'Owner');
 await commitAccount(f.db,f.bucket,owner,{baseRevision:secondBrowser.revision,expected:[d],records:[{store:'documents',value:next}]});
 const after=await readAccount(f.db,f.bucket,owner);assert.deepEqual(after.documents.find(x=>x.id===f.doc.id),before.documents[0]);assert.deepEqual(after.proposals,before.proposals);assert.equal(after.documents.find(x=>x.id===d.id).intake.state,'ready');
 await assert.rejects(()=>commitAccount(f.db,f.bucket,owner,{baseRevision:secondBrowser.revision,records:[{store:'documents',value:d}]}),e=>e.status===409);
});
