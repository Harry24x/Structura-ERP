import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {examples} from '../lib/examples.mjs';
import {applyReceiptDemo,clone,diagramLayout,toMermaid,toSVG} from '../lib/process.mjs';
import {DIAGRAM_DIRECTIONS,normalizeDirection} from '../lib/diagram-direction.mjs';
import {systemColor} from '../lib/systems.mjs';

test('the user default is left-to-right and direction values cannot inject Mermaid syntax',()=>{
 assert.equal(normalizeDirection(undefined),'LR');assert.equal(normalizeDirection(null),'LR');
 for(const direction of DIAGRAM_DIRECTIONS)assert.equal(normalizeDirection(direction.id),direction.id);
 for(const direction of ['LR;evil-->node','RL','<script>',{},''])assert.equal(normalizeDirection(direction),'LR');
 assert.ok(toMermaid(examples[0].process,{direction:'TD;evil-->node'}).startsWith('flowchart LR\n'));
});
test('horizontal and vertical layouts preserve every prepared process and point forward edges along the selected axis',()=>{
 for(const {process:p} of examples){
  const before=JSON.stringify(p);
  for(const direction of ['LR','TD']){
   const layout=diagramLayout(p,direction),nodes=new Map(layout.nodes.map(n=>[n.id,n]));
   assert.equal(nodes.size,p.nodes.length);assert.ok(layout.width>0&&layout.height>0);
   for(const n of layout.nodes){assert.ok(Number.isFinite(n.x)&&Number.isFinite(n.y));assert.ok(n.x-n.w/2>=0&&n.x+n.w/2<=layout.width);assert.ok(n.y>=0&&n.y+n.h<=layout.height);}
   p.edges.forEach((e,i)=>{if(!layout.back.has(i))assert.ok(direction==='LR'?nodes.get(e.to).x>nodes.get(e.from).x:nodes.get(e.to).y>nodes.get(e.from).y);});
  }
  assert.equal(JSON.stringify(p),before);
 }
});
test('horizontal return loops stay finite and keep every source connection',()=>{
 const p=applyReceiptDemo(clone(examples[0].process)),layout=diagramLayout(p,'LR'),svg=toSVG(p,[],{direction:'LR'});
 assert.ok(layout.back.size>=1);assert.ok(!/NaN|Infinity/.test(svg));assert.equal((svg.match(/marker-end="url\(#arrow\)"/g)||[]).length,p.edges.length);
 assert.ok(toMermaid(p,{direction:'LR'}).includes('attach_receipt -->|"Recheck"| receipt_check'));
});
test('selected direction reaches both exports without changing evidence, system identity or review',()=>{
 const p=JSON.parse(readFileSync(new URL('../docs/verification/system-card-browser.json',import.meta.url))),before=JSON.stringify(p);
 for(const direction of ['LR','TD']){
  const layout=diagramLayout(p,direction),svg=toSVG(p,[],{direction,includeSystemLegend:false}),withLegend=toSVG(p,[],{direction});
  assert.ok(svg.includes(`viewBox="0 0 ${layout.width} ${layout.height}"`));
  assert.ok(toMermaid(p,{direction}).startsWith('flowchart '+direction+'\n'));
  assert.ok(withLegend.includes('Systems legend'));assert.ok(withLegend.includes(systemColor(p.systems[0].id)));
 }
 assert.equal(JSON.stringify(p),before);
});
test('horizontal flow keeps labels upright and distinct branches separated',()=>{
 const p=examples[0].process,l=diagramLayout(p,'LR'),approved=l.nodes.find(n=>n.id==='reimburse'),rejected=l.nodes.find(n=>n.id==='rejected');
 assert.equal(approved.x,rejected.x);assert.ok(Math.abs(approved.y-rejected.y)>approved.h);
 const svg=toSVG(p,[],{direction:'LR'});assert.ok(!svg.includes('rotate('));assert.ok(svg.includes('Claim approved?'));assert.ok(svg.includes('Approved'));assert.ok(svg.includes('Rejected'));
});
