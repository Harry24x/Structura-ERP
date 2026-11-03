import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {examples} from '../lib/examples.mjs';
import {clone,createDocument,validateProcess,toSVG} from '../lib/process.mjs';
import {saveExplorer,reconcileExplorer,detailProjection} from '../lib/process-explorer.mjs';
import {CATALOG_META,createCatalogIndex,searchCatalog,catalogCoverage,catalogScope,catalogMappingFor,setCatalogMappings,catalogReferenceURL} from '../lib/dynamics-catalog.mjs';
import {CATALOG_IDS} from '../lib/dynamics-catalog-index.mjs';
import {CATALOG_COPY,catalogText} from '../lib/catalog-i18n.mjs';
import {prepareProcessRequest,finalizeProcessDraft} from '../lib/ai-process.mjs';
import {fixture} from './helpers/account-fixture.mjs';
import {partsFromProcess} from '../public/quality/shared-model.mjs';
import {updateFromGenerator,originForDocument} from '../public/quality/roundtrip.mjs';
import {readAccount,commitAccount} from '../lib/account-store.mjs';
import {grantPart,ownerGrants,sharedParts,submitSharedProposal} from '../lib/process-sharing.mjs';
import {createProposal} from '../public/quality/core.mjs';
const snapshot=JSON.parse(readFileSync(new URL('../public/quality/catalog/dynamics365-2026-10.json',import.meta.url),'utf8')),catalog=createCatalogIndex(snapshot);
const process=()=>clone(examples[1].process),entry=sequence=>catalog.entries.find(e=>e.sequence===sequence),order=entry('65.00.000.000'),purchasing=entry('75.40.000.000');
test('official October 2026 snapshot retains unique Microsoft identifiers and all six levels with real parent paths',()=>{
 assert.equal(catalog.entries.length,16322);assert.equal(CATALOG_IDS.size,16322);assert.equal(catalog.meta.version,'2026-10');assert.equal(catalog.meta.published,'2026-10-23');
 assert.deepEqual(catalog.meta.counts,{'1':16,'2':101,'3':720,'4':3892,'5':3334,'6':8259});
 for(const e of catalog.entries){const path=catalog.path(e.id);assert.equal(path.length,e.level);assert.equal(path[0].level,1);assert.equal(path.at(-1).id,e.id);assert.ok(CATALOG_IDS.has(e.id));if(e.parent&&!e.hierarchyIssue)assert.deepEqual(e.sequence.split('.').slice(0,e.level-1),catalog.byId.get(e.parent).sequence.split('.').slice(0,e.level-1));}
 assert.equal(catalog.entries.filter(e=>e.hierarchyIssue).length,4);assert.equal(purchasing.title,'Procure goods and services');
});
test('catalog search supports official ID, sequence, product, levels and bounded results, while excluding retired entries',()=>{
 assert.equal(searchCatalog(catalog).entries.length,16);assert.ok(searchCatalog(catalog,{query:'75.40.030',level:3}).entries.some(e=>e.title==='Issue purchase orders'));
 assert.equal(searchCatalog(catalog,{query:purchasing.id}).entries[0].id,purchasing.id);
 assert.ok(searchCatalog(catalog,{query:'Business Central',level:4}).entries.every(e=>e.level===4&&e.products.includes('Business Central')));
 assert.ok(searchCatalog(catalog,{parent:purchasing.id}).entries.every(e=>e.parent===purchasing.id));
 const limited=searchCatalog(catalog,{query:'purchase',limit:3});assert.equal(limited.entries.length,3);assert.ok(limited.total>3);assert.ok(limited.entries.every(e=>!e.retired));
 assert.equal(searchCatalog(catalog,{query:'no-such-catalog-entry-xyz'}).total,0);
});
test('opening a catalog view suggests only coarse context from existing areas, without saving or claiming product implementation',()=>{
 const p=process(),before=clone(p),task=p.nodes.find(n=>n.businessArea==='sales');
 assert.equal(catalogMappingFor(p,task.id).entryId,order.id);assert.equal(catalogMappingFor(p,task.id).status,'suggested');assert.equal(catalogMappingFor(p,task.id).automatic,true);
 assert.ok(catalogScope(p,catalog,order.id).includes(task.id));assert.equal(catalogCoverage(p,catalog).total,p.nodes.filter(n=>['activity','decision'].includes(n.type)).length);assert.deepEqual(p,before);
 task.businessArea='unknown';assert.equal(catalogMappingFor(p,task.id).entryId,null);
});
test('saved associations round-trip in JSON and through other view edits, retaining canonical graph, mode, review and BC mappings',()=>{
 const p=process(),task=p.nodes.find(n=>n.type==='activity');p.reviewed=true;
 const next=saveExplorer(p,{catalogMappings:setCatalogMappings(p,[task.id],{entryId:purchasing.id,status:'confirmed',note:'Reviewed the scope against this reference.'})});
 assert.deepEqual(validateProcess(next).errors,[]);assert.deepEqual(next.nodes,p.nodes);assert.deepEqual(next.edges,p.edges);assert.equal(next.reviewed,true);assert.equal(next.mode,p.mode);
 assert.equal(catalogMappingFor(next,task.id).status,'confirmed');assert.deepEqual(createDocument(JSON.parse(JSON.stringify(next)),next.source).explorer,next.explorer);
 const otherViewEdit=saveExplorer(next,{groups:[{id:'sp_orders',label:'Order handling',nodeIds:[task.id],confirmed:true}]});assert.deepEqual(otherViewEdit.explorer.catalogMappings,next.explorer.catalogMappings);assert.deepEqual(otherViewEdit.explorer.bcMappings,next.explorer.bcMappings);
 const changed=clone(next);changed.nodes.find(n=>n.id===task.id).label='Revised order handling';assert.equal(catalogMappingFor(changed,task.id).status,'suggested');assert.equal(reconcileExplorer(changed,next).explorer.catalogMappings[0].status,'suggested');
});
test('explicitly unlinking a step suppresses area suggestions and parent scope never invents or omits matching mapped steps',()=>{
 const p=process(),ids=p.nodes.filter(n=>n.type==='activity').map(n=>n.id),leaf=entry('75.40.030.000');
 const next=saveExplorer(p,{catalogMappings:setCatalogMappings(p,ids,{entryId:leaf.id,status:'suggested',note:''})});
 assert.deepEqual(catalogScope(next,catalog,purchasing.id).sort(),ids.sort());
 const unlinked=saveExplorer(next,{catalogMappings:setCatalogMappings(next,[ids[0]],{entryId:null,status:'unlinked',note:''})});assert.equal(catalogMappingFor(unlinked,ids[0]).automatic,false);assert.equal(catalogMappingFor(unlinked,ids[0]).entryId,null);assert.ok(catalogScope(unlinked,catalog,'unlinked').includes(ids[0]));assert.ok(!catalogScope(unlinked,catalog,purchasing.id).includes(ids[0]));
 const diagram=detailProjection(unlinked,{nodeIds:catalogScope(unlinked,catalog,purchasing.id)});assert.ok(toSVG(diagram,[],{projection:true}).includes('<svg'));
});
test('invalid IDs, fake snapshots, terminal targets, duplicates and retired or inconsistent confirmations are rejected',()=>{
 const p=process(),id=p.nodes.find(n=>n.type==='activity').id;
 for(const input of [{entryId:'fake-id',status:'suggested',note:''},{entryId:order.id,status:'confirmed',note:''},{entryId:catalog.entries.find(e=>e.retired).id,status:'confirmed',note:'Checked source.'},{entryId:catalog.entries.find(e=>e.hierarchyIssue).id,status:'confirmed',note:'Checked source.'}])assert.throws(()=>setCatalogMappings(p,[id],input));
 assert.throws(()=>setCatalogMappings(p,['start'],{entryId:order.id}));assert.throws(()=>setCatalogMappings(p,[id,id],{entryId:order.id}));
 const mappings=setCatalogMappings(p,[id],{entryId:order.id});mappings[0].catalogVersion='fake-snapshot';assert.throws(()=>saveExplorer(p,{catalogMappings:mappings}));
 assert.throws(()=>createCatalogIndex({...snapshot,meta:{...snapshot.meta,sha256:'fake'}}));
 assert.equal(catalogReferenceURL({url:'javascript:alert(1)'}),CATALOG_META.source);assert.equal(catalogReferenceURL({url:'https://evil.invalid/'}),CATALOG_META.source);
});
test('AI edits keep canonical catalog metadata outside model input and discard model-invented confirmations',()=>{
 let p=process();const task=p.nodes.find(n=>n.type==='activity');p=saveExplorer(p,{catalogMappings:setCatalogMappings(p,[task.id],{entryId:order.id,status:'confirmed',note:'Checked this scope.'})});
 const prepared=prepareProcessRequest({intent:'edit',source:p.source,current:p,expectedVersion:p.version,command:'Keep the same steps.'});assert.equal(prepared.current.explorer,undefined);
 const raw=clone(p);raw.mode='to-be';raw.explorer.catalogMappings[0].entryId=purchasing.id;
 const next=finalizeProcessDraft(raw,prepared).draft;assert.equal(next.explorer.catalogMappings[0].entryId,order.id);
 const generate=prepareProcessRequest({intent:'generate',source:p.source,current:p,expectedVersion:p.version});assert.equal(finalizeProcessDraft({...raw,mode:'as-is'},generate).draft.explorer,undefined);
 const removed=clone(next);removed.nodes=removed.nodes.filter(n=>n.id!==task.id);assert.equal(reconcileExplorer(removed,next).explorer.catalogMappings.length,0);
});
test('account clients retain proposal history and a real employee grant across catalog changes without exposing the full process',async()=>{
 const f=fixture(),owner={userId:'catalog-owner',displayName:'Owner',email:'owner@example.test'},employee={userId:'catalog-worker',displayName:'Employee',email:'worker@example.test'};
 f.doc.process=process();f.doc.parts=partsFromProcess(f.doc.process);f.proposal=createProposal(f.doc,{partId:f.doc.parts[0].id,title:'Earlier idea',problem:'Earlier issue',suggestion:'Earlier suggestion',benefit:'Earlier benefit',type:'general'},{role:'employee',name:'Employee',area:f.doc.parts[0].area});
 await commitAccount(f.db,f.bucket,owner,{baseRevision:0,records:[{store:'documents',value:f.doc},{store:'files',value:{id:f.doc.id}},{store:'proposals',value:f.proposal}]},new Map([[f.doc.id,f.file]]));
 const grant=await grantPart(f.db,f.bucket,owner,{docId:f.doc.id,partId:f.doc.parts[0].id,email:employee.email});await sharedParts(f.db,employee);
 await submitSharedProposal(f.db,f.bucket,employee,{grantId:grant.id,partVersion:f.doc.parts[0].version,title:'New idea',problem:'New issue',suggestion:'New suggestion',benefit:'New benefit'});
 const before=await readAccount(f.db,f.bucket,owner),grants=await ownerGrants(f.db,owner),old=before.documents[0],ids=old.process.nodes.filter(n=>['activity','decision'].includes(n.type)).map(n=>n.id);
 const next=saveExplorer(old.process,{catalogMappings:setCatalogMappings(old.process,ids,{entryId:order.id,status:'confirmed',note:'Reviewed the complete process scope.'})}),updated=updateFromGenerator(old,next,originForDocument(old)).document;
 await commitAccount(f.db,f.bucket,owner,{baseRevision:before.revision,records:[{store:'documents',value:updated}]});
 const after=await readAccount(f.db,f.bucket,owner),inbox=await sharedParts(f.db,employee);assert.equal(after.documents.length,1);assert.equal(after.documents[0].id,old.id);assert.deepEqual(after.proposals,before.proposals);assert.deepEqual(await ownerGrants(f.db,owner),grants);assert.deepEqual(after.documents[0].parts.map(p=>[p.id,p.version]),old.parts.map(p=>[p.id,p.version]));assert.equal(inbox.parts.length,1);assert.equal(inbox.proposals.length,1);assert.doesNotMatch(JSON.stringify(inbox),/catalogMappings|bcMappings|nodes|source/);
 assert.deepEqual((await readAccount(f.db,f.bucket,owner)).documents[0].process.explorer.catalogMappings,next.explorer.catalogMappings);
});
test('all catalog controls and explanations have four language variants',()=>{for(const [key,values]of Object.entries(CATALOG_COPY)){assert.equal(values.length,4,key);for(const value of values)assert.ok(typeof value==='string'&&value.trim(),key);}for(const language of ['en','et','fr','de'])assert.notEqual(catalogText(language)('catalogView'),'catalogView');});

test('in-place reconciliation used by the generator commit preserves catalog associations and explicit unlink overrides',()=>{
 const p=process(),ids=p.nodes.filter(n=>n.type==='activity').map(n=>n.id);
 const next=saveExplorer(p,{catalogMappings:setCatalogMappings(p,ids,{entryId:order.id,status:'confirmed',note:'Reviewed scope.'})});
 const before=clone(next.explorer.catalogMappings);reconcileExplorer(next,next);assert.deepEqual(next.explorer.catalogMappings,before);
 const unlinked=saveExplorer(next,{catalogMappings:setCatalogMappings(next,[ids[0]],{entryId:null,status:'unlinked',note:''})});reconcileExplorer(unlinked,unlinked);assert.equal(catalogMappingFor(unlinked,ids[0]).status,'unlinked');
});
