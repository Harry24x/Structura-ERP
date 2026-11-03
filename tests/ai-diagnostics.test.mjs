import test from 'node:test';
import assert from 'node:assert/strict';
import {processDiagnostics,diagnosticCopy} from '../lib/ai-diagnostics.mjs';
test('validation diagnostics preserve the actual reason and bound malformed input',()=>{
 assert.deepEqual(processDiagnostics({code:'INVALID_DRAFT',details:['Decision d1 needs distinct labelled branches.',null,{},'']}),['Decision d1 needs distinct labelled branches.']);
 assert.equal(processDiagnostics({code:'INVALID_DRAFT',details:Array(20).fill('a'.repeat(2000))}).length,8);
 assert.equal(processDiagnostics({code:'INVALID_DRAFT',details:['a'.repeat(2000)]})[0].length,1200);
 assert.deepEqual(processDiagnostics({code:'INVALID_DRAFT',details:'not a list'}),[]);
});
test('provider errors are not exposed as process diagnostics',()=>{
 assert.deepEqual(processDiagnostics({code:'PROVIDER_ERROR',details:['private provider body']}),[]);
 assert.deepEqual(processDiagnostics(null),[]);
});
test('all four languages explain rejected drafts without blaming the source',()=>{
 for(const locale of ['en','et','fr','de'])assert.equal(Object.values(diagnosticCopy(locale)).filter(Boolean).length,4);
 assert.deepEqual(diagnosticCopy('invalid'),diagnosticCopy('en'));
 assert.notEqual(diagnosticCopy('et').explanation,diagnosticCopy('en').explanation);
});
