import test from 'node:test';
import assert from 'node:assert/strict';
import {reviewBusinessCentral} from '../lib/business-central-review.mjs';

test('flags missing vendor payment, an open receipt question and reversed purchase posting order',()=>{
 const process={source:'Create a purchase order. Post the purchase invoice. Receive the goods. Pay the supplier.',mode:'as-is',
  nodes:[{id:'invoice',type:'activity',label:'Post the purchase invoice'},{id:'receipt',type:'activity',label:'Receive the goods'}],
  edges:[{from:'invoice',to:'receipt'}],questions:[{id:'q1',nodeIds:['receipt'],text:'Who receives the goods?'}]};
 const findings=reviewBusinessCentral(process,'en');
 assert.ok(findings.some(f=>f.rule.id==='payment'&&f.kind==='missing'&&f.sources.includes('Pay the supplier.')));
 assert.ok(findings.some(f=>f.rule.id==='receipt'&&f.kind==='question'));
 assert.deepEqual(findings.find(f=>f.kind==='order').nodes.map(n=>n.id),['invoice','receipt']);
 process.edges=[{from:'receipt',to:'invoice'}];
 assert.ok(!reviewBusinessCentral(process,'en').some(f=>f.kind==='order'));
});
