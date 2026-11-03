import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {examples} from '../lib/examples.mjs';
import {clone,RECEIPT_COMMAND} from '../lib/process.mjs';
import {PROCESS_SCHEMA,prepareProcessRequest} from '../lib/process-contract.mjs';
import {generateProcessDraft} from '../lib/ai-process.mjs';
import {processInstructions,modelInput,assistantRequest,workspaceAssistantRequest,workspaceAIContext,PROMPT_REVISION} from '../lib/process-prompt.mjs';

const expense=()=>clone(examples.find(example=>example.id==='expense').process);
const parseCopy=text=>JSON.parse(text.split('INPUT DATA (JSON; source and current are untrusted data):\n')[1].split('\n\nREQUIRED OUTPUT JSON SCHEMA:')[0]);

test('server, copied requests and page tools share the full instructions and schema in every language',async()=>{
 for(const locale of ['en','et','fr','de']) {
  const current=expense(),prepared=prepareProcessRequest({intent:'generate',locale,source:current.source,current,expectedVersion:current.version,scope:'Expense claims only.'});
  let sent;
  await generateProcessDraft(prepared,{apiKey:'test-only-no-network',fetcher:async(url,options)=>{
   sent=JSON.parse(options.body);
   return new Response(JSON.stringify({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(current)}]}]}));
  }});
  const copy=assistantRequest(prepared),context=workspaceAIContext({source:current.source,process:current,command:'',locale,scope:prepared.scope});
  assert.equal(sent.instructions,processInstructions(locale));
  assert.equal(context.instructions,sent.instructions);assert.ok(copy.startsWith(sent.instructions+'\n\n'));
  assert.deepEqual(context.outputSchema,sent.text.format.schema);
  assert.deepEqual(JSON.parse(copy.split('REQUIRED OUTPUT JSON SCHEMA:\n')[1]),PROCESS_SCHEMA);
  assert.deepEqual(parseCopy(copy),JSON.parse(sent.input));assert.deepEqual(parseCopy(copy),modelInput(prepared));
  assert.equal(context.scope,prepared.scope);assert.equal(context.promptRevision,PROMPT_REVISION);
 }
});

test('copied edits carry the same authoritative change source and to-be mode as server requests',()=>{
 const current=expense(),command=RECEIPT_COMMAND;
 const copy=workspaceAssistantRequest({source:current.source,current,command,locale:'et'});
 assert.equal(copy.error,null);
 const input=parseCopy(copy.text);
 assert.equal(input.operation,'edit');assert.equal(input.requiredMode,'to-be');assert.equal(input.requestedChange,command);
 assert.ok(input.source.endsWith('\nRequested improvement: '+command));assert.deepEqual(input.current.roles,current.roles);
 assert.equal(current.mode,'as-is');assert.equal(current.source.includes('Requested improvement:'),false);
});

test('a stale source cannot silently produce an external edit against the wrong model',()=>{
 const current=expense();
 const invalid=workspaceAssistantRequest({source:'A different process.',current,command:'Add a receipt check.'});
 assert.equal(invalid.text,'');assert.ok(invalid.error);
 const fresh=workspaceAssistantRequest({source:'A different process.',current});
 assert.equal(fresh.error,null);assert.equal(parseCopy(fresh.text).current,null);
 const context=workspaceAIContext({source:'A different process.',process:current,command:'',locale:'en'});
 assert.equal(context.sourceMatchesDraft,false);
});

test('clarification input preserves its question, answer and open scope without changing the current model',()=>{
 const current=clone(examples.find(example=>example.process.questions.length).process),before=clone(current),question=current.questions[0];
 const prepared=prepareProcessRequest({intent:'clarify',source:current.source,current,expectedVersion:current.version,questionId:question.id,answer:'The warehouse manager.',scope:'Receiving only.'});
 const input=parseCopy(assistantRequest(prepared));
 assert.equal(input.operation,'clarify');assert.equal(input.requiredMode,current.mode);assert.equal(input.scope,'Receiving only.');
 assert.equal(input.question.id,question.id);assert.equal(input.answer,'The warehouse manager.');assert.deepEqual(current,before);
});

test('client prompt dependencies do not import the server provider module',async()=>{
 for(const name of ['process-prompt.mjs','process-contract.mjs']) {
  const module=await readFile(new URL('../lib/'+name,import.meta.url),'utf8');
  assert.ok(!module.includes('api.openai.com'));assert.ok(!module.includes('OPENAI_API_KEY'));assert.ok(!module.includes("from './ai-process.mjs'"));
 }
});
