import test from 'node:test';
import assert from 'node:assert/strict';
import {examples} from '../lib/examples.mjs';
import {clone,createDocument,RECEIPT_COMMAND,applyReceiptDemo,applyClarification} from '../lib/process.mjs';
import {generateProcessDraft,MAX_REQUEST_BYTES,modelFields,prepareProcessRequest,PROCESS_SCHEMA,readProcessBody,sameOriginRequest} from '../lib/ai-process.mjs';
import {matchesAIRequest} from '../lib/ai-workspace.mjs';

const expense=()=>clone(examples[0].process);
const request=(extra={})=>({intent:'generate',source:expense().source,expectedVersion:1,...extra});
const prepared=()=>prepareProcessRequest(request());
const response=(model=expense(),extra={})=>new Response(JSON.stringify({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(model)}]}],...extra}));
const expectError=(promise,code)=>assert.rejects(promise,error=>error.code===code);

test('generation binds source, mode and version independently of model metadata',async()=>{
 let sent;const raw={...expense(),source:'invented source',reviewed:true,version:999};
 const result=await generateProcessDraft(prepared(),{apiKey:'test-only',fetcher:async(url,options)=>{assert.equal(url,'https://api.openai.com/v1/responses');sent=JSON.parse(options.body);return response(raw);}});
 assert.equal(result.draft.source,expense().source);assert.equal(result.draft.reviewed,false);assert.equal(result.draft.version,2);assert.equal(result.expectedVersion,1);assert.equal(result.draft.origin,'model-api');
 assert.equal(sent.store,false);assert.equal(sent.text.format.strict,true);assert.deepEqual(sent.text.format.schema,PROCESS_SCHEMA);assert.equal(sent.max_output_tokens,12000);assert.equal(JSON.parse(sent.input).requiredMode,'as-is');
});
test('arbitrary supplied source cannot validate a fabricated model quotation',async()=>{
 const model=expense();model.nodes.find(n=>n.type==='activity').evidence='invented unsupported evidence';model.source='invented unsupported evidence';
 await expectError(generateProcessDraft(prepared(),{apiKey:'test',fetcher:async()=>response(model)}),'INVALID_DRAFT');
});
test('an unassigned step always asks its own role question without inventing an owner',async()=>{
 const model=expense(),node=model.nodes.find(n=>n.type==='activity');node.roleId=null;
 const {draft}=await generateProcessDraft(prepared(),{apiKey:'test',fetcher:async()=>response(model)});
 assert.equal(draft.nodes.find(n=>n.id===node.id).roleId,null);assert.deepEqual(draft.roles,model.roles);
 assert.equal(draft.questions.filter(q=>q.kind==='role'&&q.nodeIds.includes(node.id)).length,1);
 assert.equal(draft.reviewed,false);
});
test('a role answer cannot assign the same owner to unrelated grouped tasks',async()=>{
 const model=expense(),nodes=model.nodes.filter(n=>n.type==='activity').slice(0,2);nodes.forEach(n=>n.roleId=null);
 model.questions=[{id:'q_group',kind:'role',text:'Who submits and reviews?',nodeIds:nodes.map(n=>n.id)}];
 const {draft}=await generateProcessDraft(prepared(),{apiKey:'test',fetcher:async()=>response(model)});
 assert.equal(draft.questions.length,2);assert.ok(draft.questions.every(q=>q.nodeIds.length===1));
 const answered=applyClarification(draft,draft.questions[0].id,'Confirmed owner');
 assert.equal(answered.nodes.find(n=>n.id===nodes[1].id).roleId,null);assert.equal(answered.questions.length,1);
});
test('an explicit unmapped end needs a continuation question even if notes mention it',async()=>{
 const model=expense(),end=model.nodes.find(n=>n.type==='end');end.label='Unmapped boundary: after approval';model.notes=['Next step is not provided.'];
 const {draft}=await generateProcessDraft(prepared(),{apiKey:'test',fetcher:async()=>response(model)});
 assert.ok(draft.questions.some(q=>q.kind==='missing_step'&&q.nodeIds.includes(end.id)));assert.equal(draft.nodes.length,model.nodes.length);assert.deepEqual(draft.roles,model.roles);
});
test('an edit is a separate to-be draft with evidence from the explicit command',async()=>{
 const current=expense(),p=prepareProcessRequest(request({intent:'edit',current,command:RECEIPT_COMMAND}));
 const next=(await generateProcessDraft(p,{apiKey:'test',fetcher:async()=>response(applyReceiptDemo(current))})).draft;
 assert.equal(next.mode,'to-be');assert.ok(next.source.endsWith(RECEIPT_COMMAND));assert.equal(current.mode,'as-is');assert.equal(next.nodes.filter(n=>n.id==='receipt_check').length,1);assert.ok(next.edges.some(e=>e.to==='rejected'));
});
test('edit rejects a dirty description and stale expected version',()=>{
 assert.throws(()=>prepareProcessRequest(request({intent:'edit',current:expense(),source:'new text',command:'Add a check'})),e=>e.code==='STALE_REQUEST');
 assert.throws(()=>prepareProcessRequest(request({intent:'edit',current:expense(),expectedVersion:2,command:'Add a check'})),e=>e.code==='STALE_REQUEST');
});
test('empty or overlong input and commands fail before the provider call',()=>{
 for(const source of ['', ' '.repeat(3),'x'.repeat(120001)])assert.throws(()=>prepareProcessRequest(request({source})));
 for(const command of ['', 'x'.repeat(6001)])assert.throws(()=>prepareProcessRequest(request({intent:'edit',current:expense(),command})));
 assert.throws(()=>prepareProcessRequest(request({intent:'edit',command:'Add a check'})));
 assert.throws(()=>prepareProcessRequest(request({intent:'unknown'})));
});
test('clarification retains its exact question and answer in authoritative source',()=>{
 const current=clone(examples.find(e=>e.process.questions.length).process),question=current.questions[0];
 const p=prepareProcessRequest({intent:'clarify',source:current.source,current,expectedVersion:current.version,questionId:question.id,answer:'The department manager handles this.'});
 assert.equal(p.mode,current.mode);assert.ok(p.source.endsWith('Answer: The department manager handles this.'));assert.deepEqual(p.question,question);
 assert.throws(()=>prepareProcessRequest({...request(),intent:'clarify',current:expense(),questionId:'missing',answer:'Someone'}),e=>e.code==='STALE_QUESTION');
});
test('current metadata is not included in the model context',()=>{
 assert.deepEqual(Object.keys(modelFields(expense())),['schemaVersion','title','mode','roles','nodes','edges','questions','notes','systems']);
});
test('as-is generation refuses a to-be response',async()=>{
 await expectError(generateProcessDraft(prepared(),{apiKey:'test',fetcher:async()=>response({...expense(),mode:'to-be'})}),'INVALID_DRAFT');
});
test('an artificial start shortcut cannot bypass stated process order',async()=>{
 const model=expense(),start=model.nodes.find(n=>n.type==='start'),later=model.nodes.find(n=>n.id==='reimburse');
 model.edges.push({from:start.id,to:later.id,label:'Unmapped later entry'});
 await expectError(generateProcessDraft(prepared(),{apiKey:'test',fetcher:async()=>response(model)}),'INVALID_DRAFT');
});
test('explicit requested improvements cannot leak into as-is evidence',()=>{
 const model=expense();model.nodes.find(n=>n.type==='activity').evidence='The robot archives the form';
 assert.throws(()=>createDocument(model,model.source+'\nRequested improvement: The robot archives the form'),/future need/);
});
test('a multi-paragraph numbered improvement remains proposed until a clarification',()=>{
 const model=expense();model.nodes.find(n=>n.type==='activity').evidence='The robot archives the form';
 assert.throws(()=>createDocument(model,model.source+'\nRequested improvement: Add automation.\n\n1. The robot archives the form'),/future need/);
});
test('missing server configuration never starts a provider request',async()=>{
 await expectError(generateProcessDraft(prepared(),{fetcher:()=>assert.fail('must not call')}),'NOT_CONFIGURED');
});
test('refusal and incomplete responses leave no usable draft',async()=>{
 await expectError(generateProcessDraft(prepared(),{apiKey:'test',fetcher:async()=>response(null,{output:[{type:'message',content:[{type:'refusal',refusal:'Provider text must not be relayed'}]}]})}),'REFUSED');
 await expectError(generateProcessDraft(prepared(),{apiKey:'test',fetcher:async()=>response(expense(),{status:'incomplete'})}),'INCOMPLETE');
});
test('malformed provider output and non-JSON response fail safely',async()=>{
 await expectError(generateProcessDraft(prepared(),{apiKey:'test',fetcher:async()=>response(null,{output:[]})}),'INVALID_DRAFT');
 await expectError(generateProcessDraft(prepared(),{apiKey:'test',fetcher:async()=>new Response('not JSON')}),'INVALID_RESPONSE');
});
test('provider errors are redacted and are not automatically retried',async()=>{
 for(const [status,code] of [[429,'PROVIDER_LIMIT'],[401,'PROVIDER_ACCESS'],[403,'PROVIDER_ACCESS'],[500,'PROVIDER_ERROR'],[400,'PROVIDER_ERROR']]){
  let calls=0;await assert.rejects(generateProcessDraft(prepared(),{apiKey:'test',fetcher:async()=>{calls++;return new Response('SENSITIVE_PROVIDER_DETAIL',{status});}}),e=>e.code===code&&!e.message.includes('SENSITIVE'));assert.equal(calls,1);
 }
});
test('cancel and connection errors are distinguished without relaying raw errors',async()=>{
 const controller=new AbortController();controller.abort();
 await expectError(generateProcessDraft(prepared(),{apiKey:'test',signal:controller.signal,fetcher:async()=>{throw new Error('sensitive');}}),'CANCELLED');
 await expectError(generateProcessDraft(prepared(),{apiKey:'test',fetcher:async()=>{throw new Error('sensitive');}}),'CONNECTION_ERROR');
});
test('a deadline aborts a slow provider call',async()=>{
 await expectError(generateProcessDraft(prepared(),{apiKey:'test',timeoutMs:1,fetcher:async(_url,{signal})=>new Promise((resolve,reject)=>{const handle=setTimeout(()=>resolve(response()),50);signal.addEventListener('abort',()=>{clearTimeout(handle);reject(new Error('abort'));},{once:true});})}),'TIMEOUT');
});
test('request parser accepts JSON and rejects unsupported or oversized bodies',async()=>{
 const req=data=>new Request('https://example.com/api/process',{method:'POST',headers:{'Content-Type':'application/json'},body:data});
 assert.deepEqual(await readProcessBody(req(JSON.stringify(request()))),request());
 await expectError(readProcessBody(req('{')),'INVALID_REQUEST');
 await expectError(readProcessBody(new Request('https://example.com/api/process',{method:'POST',body:'{}'})),'CONTENT_TYPE');
 await expectError(readProcessBody(req('x'.repeat(MAX_REQUEST_BYTES+1))),'REQUEST_TOO_LARGE');
});
test('cross-origin browser generation is rejected',()=>{
 assert.equal(sameOriginRequest(new Request('https://example.com/api/process',{headers:{origin:'https://example.com'}})),true);
 assert.equal(sameOriginRequest(new Request('https://example.com/api/process',{headers:{origin:'https://other.com'}})),false);
 assert.equal(sameOriginRequest(new Request('https://example.com/api/process',{headers:{'sec-fetch-site':'cross-site'}})),false);
});
test('async output requires unchanged source, graph, version and edit command',()=>{
 const current={process:expense(),source:expense().source,command:'Add a check',answers:{q:'answer'}};
 const snapshot={intent:'edit',version:1,process:clone(current.process),source:current.source,command:current.command};
 assert.equal(matchesAIRequest(snapshot,current),true);
 assert.equal(matchesAIRequest(snapshot,{...current,source:'edited text'}),false);
 assert.equal(matchesAIRequest(snapshot,{...current,command:'another change'}),false);
 assert.equal(matchesAIRequest(snapshot,{...current,process:{...current.process,version:2}}),false);
 assert.equal(matchesAIRequest(snapshot,{...current,process:{...current.process,reviewed:true}}),false);
 assert.equal(matchesAIRequest({...snapshot,intent:'clarify',questionId:'q',answer:'old'},current),false);
});
test('a system mentioned elsewhere cannot justify an assignment without a named source quote',async()=>{
 const model=expense(),node=model.nodes.find(n=>n.type==='activity');
 const source=model.source+'\nThe application is Process Studio.';
 model.systems=[{id:'studio',label:'Process Studio'}];
 node.systemId='studio';node.systemEvidence=node.evidence;node.execution='assisted';
 await assert.rejects(generateProcessDraft(prepareProcessRequest(request({source})),{apiKey:'test',fetcher:async()=>response(model)}),e=>e.code==='INVALID_DRAFT'&&e.details.some(d=>d.includes('System evidence must name the selected system')));
 node.systemId=null;node.execution='unknown';node.systemEvidence='';node.humanDecision=null;
 const {draft}=await generateProcessDraft(prepareProcessRequest(request({source})),{apiKey:'test',fetcher:async()=>response(model)});
 assert.equal(draft.nodes.find(n=>n.id===node.id).systemId,null);
 assert.deepEqual(draft.edges,model.edges);
});

test('Consultant generation sends numbered source and validates separate step and arrow references',async()=>{
 const input=prepareProcessRequest({...request(),current:undefined,ruleSet:'consultant'});
 let sent;
 const raw=expense();
 raw.nodes=raw.nodes.map(node=>({...node,sourceIds:['s1']}));
 raw.edges=raw.edges.map(edge=>({...edge,sourceIds:['s1']}));
 const result=await generateProcessDraft(input,{apiKey:'test',fetcher:async(_,options)=>{
  sent=JSON.parse(options.body);
  return response(raw);
 }});
 assert.match(sent.instructions,/CONSULTANT RULES/);
 assert.equal(sent.text.format.name,'consultant_draft');
 assert.ok(sent.text.format.schema.properties.edges.items.required.includes('sourceIds'));
 const first=JSON.parse(sent.input).numberedSource[0];
 assert.equal(first.id,'s1');
 assert.ok(input.source.includes(first.text));
 assert.deepEqual(result.evidence.nodes[0].references,[first]);
 assert.deepEqual(result.evidence.edges[0].references,[first]);
 assert.equal(result.draft.edges[0].sourceIds,undefined);
 raw.edges[0].sourceIds=['s999999'];
 await expectError(generateProcessDraft(input,{apiKey:'test',fetcher:async()=>response(raw)}),'INVALID_DRAFT');
 assert.throws(()=>prepareProcessRequest({...request(),intent:'edit',ruleSet:'consultant'}),{code:'INVALID_REQUEST'});
});
