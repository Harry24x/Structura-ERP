import test from 'node:test';
import assert from 'node:assert/strict';
import {pinBpmnLanes} from '../lib/bpmn.mjs';
test('BPMN lane labels follow horizontal scrolling at the actual SVG scale',()=>{
 let transform;
 const group={ownerSVGElement:{getScreenCTM:()=>({a:.5})},setAttribute:(key,value)=>{assert.equal(key,'transform');transform=value;}};
 const scroller={scrollLeft:125,querySelector:selector=>selector==='[data-bpmn-lanes]'?group:null};
 pinBpmnLanes(scroller);
 assert.equal(transform,'translate(250 0)');
 scroller.scrollLeft=0;
 pinBpmnLanes(scroller);
 assert.equal(transform,'translate(0 0)');
});
