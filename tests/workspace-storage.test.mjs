import test from 'node:test';
import assert from 'node:assert/strict';
import {loadWorkspaceWithTransfer,parseWorkspace,saveWorkspace,WORKSPACE_STORE} from '../lib/workspace-storage.mjs';
import {examples} from '../lib/examples.mjs';
import {toMarkdown,parseMarkdown,restoreMarkdown} from '../lib/markdown.mjs';
import {translate} from '../lib/i18n.mjs';
import {toMermaid} from '../lib/process.mjs';

test('reload retains edited source, pending commands and answers without applying them',()=>{
 const process=examples.find(e=>e.process.questions.length).process;
 const id=process.questions[0].id;
 const workspace={process,source:'Edited source',command:'Check receipts',answers:{[id]:'Warehouse manager'},sample:'custom',versions:[examples[0].process]};
 let stored;
 saveWorkspace({setItem:(key,value)=>{assert.equal(key,WORKSPACE_STORE);stored=value;}},workspace);
 const restored=parseWorkspace(stored);
 assert.equal(restored.source,workspace.source);assert.equal(restored.command,workspace.command);
 assert.deepEqual(restored.answers,workspace.answers);assert.equal(restored.process.source,process.source);
 assert.equal(restored.versions.length,1);
 const exported=restoreMarkdown(parseMarkdown(toMarkdown(restored.process,restored)));
 assert.equal(exported.command,workspace.command);assert.deepEqual(exported.answers,workspace.answers);
});

test('legacy workspaces load and invalid history or pending fields do not discard the draft',()=>{
 const process=examples[0].process;
 const restored=parseWorkspace(JSON.stringify({process,versions:[null,{},process],source:42,command:[],answers:['bad']}));
 assert.equal(restored.process.title,process.title);assert.equal(restored.source,process.source);
 assert.equal(restored.command,'');assert.deepEqual(restored.answers,{});assert.equal(restored.versions.length,1);
 for(const value of ['null','{}','{'])assert.throws(()=>parseWorkspace(value));
});

test('failed storage writes propagate and preserve the last saved copy',()=>{
 let value='previous saved workspace';
 const storage={setItem:()=>{throw new DOMException('Full','QuotaExceededError');},getItem:()=>value};
 assert.throws(()=>saveWorkspace(storage,{process:examples[0].process}),{name:'QuotaExceededError'});
 assert.equal(storage.getItem(WORKSPACE_STORE),value);
 for(const locale of ['et','fr','de'])assert.notEqual(translate(locale,'Not saved in this browser'),'Not saved in this browser');
});

test('Mermaid uses the selected language for unknown roles',()=>{
 const process=examples.find(e=>e.process.nodes.some(n=>n.type==='activity'&&n.roleId===null)).process;
 for(const locale of ['et','fr','de']){
  const label=translate(locale,'Role unknown');
  const mermaid=toMermaid(process,{unknownRoleLabel:label});
  assert.ok(mermaid.includes(label));assert.ok(!mermaid.includes('Role unknown'));
 }
});

test('older translated Markdown snapshots still restore after unknown-role localization',()=>{
 const process=examples.find(e=>e.process.nodes.some(n=>n.type==='activity'&&n.roleId===null)).process;
 for(const locale of ['et','fr','de']){
  const label=translate(locale,'Role unknown');
  const current=toMarkdown(process,{locale});
  const legacy=current.replace(/```mermaid\n([\s\S]*?)\n```/,block=>block.replaceAll(label,'Role unknown'));
  assert.notEqual(legacy,current);assert.equal(parseMarkdown(legacy).canRestore,true);
  assert.equal(parseMarkdown(legacy.replace('# '+process.title,'# Edited process title')).canRestore,false);
 }
});


test('failed transfer backup retains previous draft and pending import without falling back to a sample',()=>{
 const old={process:examples[0].process,source:'Unsaved source edits',command:'Pending command'},pending={process:examples[1].process};
 const values=new Map([[WORKSPACE_STORE,JSON.stringify(old)],['quality-process-transfer',JSON.stringify(pending)]]);
 const storage={getItem:k=>values.get(k),setItem:()=>{throw new Error('Quota');},removeItem:k=>values.delete(k)};
 const result=loadWorkspaceWithTransfer(storage);
 assert.equal(result.transferFailed,true);assert.equal(result.workspace.process.title,old.process.title);assert.equal(result.workspace.source,old.source);assert.equal(result.workspace.command,old.command);assert.ok(values.has('quality-process-transfer'));assert.equal(JSON.parse(values.get(WORKSPACE_STORE)).source,old.source);
});
test('successful transfer preserves the full previous workspace before consuming the import',()=>{
 const old=JSON.stringify({process:examples[0].process,source:'Pending edits',command:'Pending command',answers:{}}),incoming=JSON.stringify({process:examples[1].process});
 const values=new Map([[WORKSPACE_STORE,old],['quality-process-transfer',incoming]]);
 const storage={getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};
 const result=loadWorkspaceWithTransfer(storage);
 assert.equal(result.transferFailed,false);assert.equal(result.workspace.process.title,examples[1].process.title);assert.equal(values.get('quality-generator-before-import'),old);assert.ok(!values.has('quality-process-transfer'));
});

test('card origin survives storage and pending imports; malformed links do not overwrite the old workspace',()=>{
 const qualityOrigin={documentId:'card-id',documentVersion:4,processVersion:7,revisionId:'revision'},saved={process:examples[0].process,qualityOrigin};
 assert.deepEqual(parseWorkspace(JSON.stringify(saved)).qualityOrigin,qualityOrigin);
 const values=new Map([[WORKSPACE_STORE,JSON.stringify(saved)],['quality-process-transfer',JSON.stringify({...saved,qualityOrigin:{...qualityOrigin,documentVersion:-1}})]]);
 const storage={getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};
 assert.equal(loadWorkspaceWithTransfer(storage).transferFailed,true);assert.deepEqual(loadWorkspaceWithTransfer(storage).workspace.qualityOrigin,qualityOrigin);assert.ok(values.has('quality-process-transfer'));
});
