import test from 'node:test';import assert from 'node:assert/strict';
import {pdfPageSize,pdfCopy} from '../lib/pdf-export.mjs';
test('PDF keeps both orientations and all content within PDF page limits',()=>{
 for(const [w,h] of [[4240,900],[620,5000],[30000,800],[600,30000]]){
  const p=pdfPageSize(w,h);assert.ok(p.width<=14000&&p.height<=14000);
  assert.ok(w*p.scale+p.margin*2<=p.width);assert.ok(h*p.scale+p.header+p.margin<=p.height);
  assert.equal(p.width>p.height,w>h);
 }
 assert.throws(()=>pdfPageSize(0,300));assert.throws(()=>pdfPageSize(Infinity,1));
});
test('PDF status, description and failures are available in four languages',()=>{
 for(const l of ['en','et','fr','de'])assert.ok(Object.values(pdfCopy(l)).every(v=>typeof v==='string'&&v.length));
 assert.deepEqual(pdfCopy('invalid'),pdfCopy('en'));
});
