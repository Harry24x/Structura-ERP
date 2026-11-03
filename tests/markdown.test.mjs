import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {examples} from '../lib/examples.mjs';
import {clone,MAX_SOURCE} from '../lib/process.mjs';
import {toMarkdown,parseMarkdown,restoreMarkdown,markdownSource,MAX_MARKDOWN_BYTES} from '../lib/markdown.mjs';
import {translate,TRANSLATIONS} from '../lib/i18n.mjs';

test('ordinary discussion Markdown, BOM and CRLF load as text without a model',()=>{
 const text='# Arutelu\r\n\r\n**Mina:** Töötaja esitab taotluse.\r\n';
 const p=parseMarkdown('\uFEFF'+text);
 assert.equal(p.kind,'text');assert.equal(p.canRestore,false);
 assert.equal(markdownSource(p),text.replaceAll('\r\n','\n'));
 assert.throws(()=>restoreMarkdown(p));
});
test('all examples round trip in all four languages, retaining exact evidence and mappings',()=>{
 for(const example of examples)for(const locale of ['en','et','fr','de']){
  const model=clone(example.process), before=JSON.stringify(model);
  const md=toMarkdown(model,{locale,direction:'TD'}), parsed=parseMarkdown(md);
  assert.equal(parsed.canRestore,true,`${example.id}/${locale}`);
  const saved=restoreMarkdown(parsed,40);
  for(const key of ['source','nodes','edges','roles','questions','notes'])assert.deepEqual(saved.process[key],parsed.process[key],key);
  assert.equal(saved.process.version,41);assert.equal(saved.process.reviewed,false);assert.equal(saved.direction,'TD');
  assert.equal(JSON.stringify(model),before);assert.ok(md.includes('```mermaid\nflowchart TD'));
  assert.ok(md.includes(translate(locale,'Continue in chat')));
 }
});
test('unsent edits and answers stay separate and survive reopening',()=>{
 const p=clone(examples.find(e=>e.process.questions.length).process),q=p.questions[0];p.reviewed=true;
 const w={source:p.source+'\nNew discussion',command:'Add a receipt check',answers:{[q.id]:'Warehouse lead',stale:'Old answer'},direction:'LR',locale:'et'};
 const parsed=parseMarkdown(toMarkdown(p,w)), restored=restoreMarkdown(parsed,7);
 assert.equal(restored.source,w.source);assert.equal(restored.process.source,p.source);
 assert.equal(restored.command,w.command);assert.deepEqual(restored.answers,{[q.id]:'Warehouse lead'});
 assert.equal(restored.process.reviewed,false);assert.ok(parsed.text.includes('veel modelleerimata'));
 assert.ok(parsed.text.includes('veel rakendamata'));
});
test('chat edits to readable prose, Mermaid or added discussion cannot silently restore an old snapshot',()=>{
 const md=toMarkdown(examples[0].process);
 for(const changed of [md.replace('flowchart LR','flowchart TD'),md.replace('# '+examples[0].process.title,'# Changed title'),md+'\nNew answer: manager approves.']){
  const parsed=parseMarkdown(changed);assert.equal(parsed.canRestore,false);
  assert.throws(()=>restoreMarkdown(parsed),/readable Markdown was changed/);
  assert.ok(!markdownSource(parsed).includes('"format": "process-studio-markdown"'));
 }
 assert.equal(parseMarkdown(md.replaceAll('\n','\r\n')).canRestore,true);
});
test('nested fences and hostile-looking source remain quoted data; no accidental payload extraction',()=>{
 const p=clone(examples[0].process);
 p.source+='\n```process-studio-json\n{"fake":true}\n```\n````\n<script>alert(1)</script>\n';
 p.title='<img src=x onerror=alert(1)> | [link](javascript:x)';
 const md=toMarkdown(p),parsed=parseMarkdown(md);
 assert.equal(parsed.canRestore,true);assert.equal(parsed.process.source,p.source);
 assert.ok(md.startsWith('# &lt;img'));assert.equal(parseMarkdown('````text\n```process-studio-json\n{}\n```\n````').kind,'text');
});
test('malformed, duplicated, truncated, oversized and invalid snapshots fail without changing input',()=>{
 const p=clone(examples[0].process),before=JSON.stringify(p),md=toMarkdown(p);
 for(const text of ['', '\0binary', 'a'.repeat(MAX_MARKDOWN_BYTES+1),md.replace('"format": "process-studio-markdown"','"format": "other"'),md.replace('"version": 1,\n  "process"','"version": 2,\n  "process"'),md.replace('"schemaVersion": "1.0"','"schemaVersion": "bad"'),md.slice(0,md.lastIndexOf('```')),md+'\n```process-studio-json\n{}\n```'])assert.throws(()=>parseMarkdown(text));
 assert.equal(JSON.stringify(p),before);
 assert.throws(()=>markdownSource(parseMarkdown('x'.repeat(MAX_SOURCE+1))),/120,000/);
 assert.throws(()=>toMarkdown(p,{source:'x'.repeat(MAX_SOURCE+1)}));
});
test('saved real transcript and memo retain their full graph and source in Markdown',()=>{
 for(const file of ['transcript-retest','memo-retest']){
  const p=JSON.parse(readFileSync(new URL(`../docs/verification/v0-10/${file}.json`,import.meta.url))).draft;
  const md=toMarkdown(p),parsed=parseMarkdown(md);
  assert.equal(parsed.canRestore,true);assert.deepEqual(parsed.process,p);
 }
});
test('every literal Markdown label has a complete translation',()=>{
 const source=readFileSync(new URL('../lib/markdown.mjs',import.meta.url),'utf8');
 for(const [,key] of source.matchAll(/\bt\('([^']+)'\)/g))assert.ok(TRANSLATIONS[key],key);
});
