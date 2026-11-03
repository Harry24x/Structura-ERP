import test from 'node:test';
import assert from 'node:assert/strict';
import {examples} from '../lib/examples.mjs';
import {toSVG} from '../public/quality/lib/process.mjs';
import {svgSize,fitScale} from '../public/quality/diagram-view.mjs';

test('both process directions fit inside small and large viewports without changing any process data',()=>{
 const process=structuredClone(examples[0].process),before=structuredClone(process),sizes=[];
 for(const direction of ['LR','TD']){const size=svgSize(toSVG(process,[],{direction}));sizes.push(size);for(const viewport of [{width:330,height:280},{width:1000,height:700},{width:2400,height:1500}]){const scale=fitScale(size,viewport);assert.ok(size.width*scale<=viewport.width-44+.01);assert.ok(size.height*scale<=viewport.height-44+.01);assert.ok(scale>0&&scale<=1);}}
 assert.ok(sizes[0].width>sizes[1].width);assert.ok(sizes[1].height>sizes[0].height);assert.deepEqual(process,before);
});
test('fit accounts for both dimensions and handles invalid or not-yet-measured viewports',()=>{
 assert.equal(fitScale({width:1000,height:2000},{width:1044,height:544}),.25);assert.equal(fitScale({width:100,height:100},{width:2000,height:2000}),1);assert.equal(fitScale({width:100,height:100},{width:0,height:0}),1);assert.throws(()=>svgSize('<svg></svg>'));assert.throws(()=>svgSize('<svg viewBox="0 0 0 5"></svg>'));
});
