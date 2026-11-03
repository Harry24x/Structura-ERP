import test from 'node:test';
import assert from 'node:assert/strict';
import {invocationSchema,driverMessageSchema,sessionOptionsSchema} from '../scripts/connector-preview/protocol.mjs';

test('connector argument records retain named values after the Zod security update',()=>{
 const input={connectorId:'test',actionName:'read',arguments:{query:'hello',limit:3,nested:{ok:true}}};
 assert.deepEqual(invocationSchema.parse(input),input);
 assert.equal(invocationSchema.safeParse({...input,accountId:'untrusted'}).success,false);
 assert.equal(invocationSchema.safeParse({...input,arguments:[]}).success,false);
 const response={jsonrpc:'2.0',id:'12345678-1234-4234-8234-123456789abc',result:{content:[{type:'text',text:'Result'}]}};
 assert.deepEqual(driverMessageSchema.parse(response),response);
 assert.deepEqual(sessionOptionsSchema.parse({}),{timeoutMs:120000,maxConcurrent:64});
 assert.equal(sessionOptionsSchema.safeParse({timeoutMs:-1}).success,false);
});
