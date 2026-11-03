import test from 'node:test';
import assert from 'node:assert/strict';
import {examples} from '../lib/examples.mjs';
import {challengeExamples} from '../lib/digmatix.mjs';
import {purchasingInterview} from '../lib/digmatix-source.mjs';
import {pollukuldExamples} from '../lib/pollukuld.mjs';
import {goodsReceiptSource} from '../lib/pollukuld-source.mjs';
import {applyClarification,applyReceiptDemo,clone,createDocument,diagramLayout,difference,explicitFutureNeeds,sourceBlocks,toMermaid,toSVG,validateProcess} from '../lib/process.mjs';
const fixture=id=>clone(examples.find(e=>e.id===id).process);
for(const e of examples)test('Prepared sample has supported structure: '+e.id,()=>assert.deepEqual(validateProcess(e.process).errors,[]));
test('An unknown role must remain an explicit clarification',()=>{const p=fixture('incomplete');assert.equal(p.nodes.find(n=>n.id==='approve').roleId,null);assert.equal(p.questions.length,3);p.questions=[];assert.match(validateProcess(p).errors.join(' '),/Ask who/);});
test('Role answer changes only the intended role and keeps the decision question',()=>{const p=fixture('incomplete'),next=applyClarification(p,'q_reviewer','Purchasing manager');assert.equal(next.questions.length,2);assert.equal(p.questions.length,3);assert.equal(p.nodes.find(n=>n.id==='approve').roleId,null);assert.equal(next.roles.find(r=>r.id===next.nodes.find(n=>n.id==='approve').roleId).label,'Purchasing manager');assert.deepEqual(p.edges,next.edges);assert.equal(next.reviewed,false);});
test('Decision answer is retained in the source and closes only its question',()=>{const p=applyClarification(fixture('incomplete'),'q_reviewer','Purchasing manager'),next=applyClarification(p,'q_rule','Within approved budget?');assert.deepEqual(next.questions.map(q=>q.id),['q_after_order']);assert.match(next.source,/Within approved budget/);assert.equal(next.nodes.find(n=>n.id==='approve').label,'Within approved budget?');assert.deepEqual(validateProcess(next).errors,[]);});
test('An incomplete purchase keeps unstated ordering continuation separate from stated rejection completion',()=>{
 const p=fixture('incomplete'),afterOrder=p.edges.find(e=>e.from==='order'),afterNotice=p.edges.find(e=>e.from==='notify');
 assert.notEqual(afterOrder.to,afterNotice.to);
 assert.match(p.nodes.find(n=>n.id===afterOrder.to).label,/^Unmapped boundary:/);
 assert.ok(p.questions.some(q=>q.kind==='missing_step'&&q.nodeIds.includes(afterOrder.to)));
 assert.equal(p.nodes.find(n=>n.id===afterNotice.to).label,'Process complete');
 assert.deepEqual(validateProcess(p).errors,[]);
});
test('Receipt change preserves the rejected branch, prior model and existing IDs',()=>{const p=fixture('expense'),old=clone(p),next=applyReceiptDemo(p);assert.deepEqual(p,old);assert.equal(next.mode,'to-be');assert.equal(p.mode,'as-is');assert.deepEqual(next.nodes.find(n=>n.id==='rejected'),p.nodes.find(n=>n.id==='rejected'));assert.ok(next.edges.some(e=>e.from==='approval'&&e.to==='rejected'&&e.label==='Rejected'));assert.ok(next.edges.some(e=>e.from==='attach_receipt'&&e.to==='receipt_check'));assert.deepEqual(difference(p,next).added,['receipt_check','attach_receipt']);assert.equal(next.reviewed,false);});
test('Repeating the receipt request is idempotent',()=>{const p=applyReceiptDemo(fixture('expense'));assert.deepEqual(applyReceiptDemo(p),p);});
test('Unsupported evidence cannot be accepted merely because a diagram could render',()=>{const p=fixture('expense');p.nodes[1].evidence='The CFO approves all claims over 500 euros';assert.match(validateProcess(p).errors.join(' '),/Source evidence/);assert.throws(()=>toSVG(p));});
test('Unknown IDs and duplicate IDs are rejected before rendering',()=>{const p=fixture('expense');p.edges.push({from:'approval',to:'ghost',label:'Other'});assert.match(validateProcess(p).errors.join(' '),/missing node/);const q=fixture('expense');q.nodes.push(clone(q.nodes[1]));assert.match(validateProcess(q).errors.join(' '),/unique safe/);const r=fixture('expense');delete r.nodes[1].id;assert.match(validateProcess(r).errors.join(' '),/unique safe/);});
test('Unlabelled decisions and disconnected nodes are rejected',()=>{const p=fixture('expense');p.edges.find(e=>e.from==='approval').label='';assert.match(validateProcess(p).errors.join(' '),/labelled branches/);const q=fixture('expense');q.edges=q.edges.filter(e=>e.to!=='submit');assert.match(validateProcess(q).errors.join(' '),/reachable/);});
test('Quotes and markup stay text in SVG and Mermaid exports',()=>{const p=fixture('expense');p.nodes[1].label='<script>alert("x")</script>';const svg=toSVG(p),m=toMermaid(p);assert.ok(!svg.includes('<script>'));assert.match(svg,/&lt;script&gt;/);assert.ok(!m.includes('<script>'));assert.match(m,/#quot;/);});
test('Loops get finite layout coordinates and preserve their return connection',()=>{const p=fixture('purchasing'),l=diagramLayout(p);assert.ok(l.back.size>=2);for(const n of l.nodes){assert.ok(Number.isFinite(n.x)&&Number.isFinite(n.y));assert.ok(n.x-n.w/2>=0);assert.ok(n.x+n.w/2<=l.width);}assert.match(toMermaid(p),/revise -->\|"Review again"\| budget/);});
test('A saved process round-trips while approval is explicitly reset on import',()=>{const p=fixture('sales');p.reviewed=true;const model=JSON.parse(JSON.stringify(p)),next=createDocument(model,model.source);assert.deepEqual(next.nodes,p.nodes);assert.deepEqual(next.edges,p.edges);assert.equal(next.reviewed,false);});

const reachable=(p,from)=>{const seen=new Set(),queue=[from];for(let i=0;i<queue.length;i++){if(seen.has(queue[i]))continue;seen.add(queue[i]);for(const e of p.edges.filter(e=>e.from===queue[i]))queue.push(e.to);}return seen;};
test('Supplied interview stays complete in every scoped, unapproved draft',()=>{
  assert.match(purchasingInterview,/^Example 2\r?\nCompany name: Paljuriideid OÜ/);
  assert.match(purchasingInterview,/Checking the invoice and paying the supplier is already the next part/);
  for(const {process:p} of challengeExamples){assert.equal(p.source,purchasingInterview);assert.equal(p.mode,'as-is');assert.equal(p.reviewed,false);assert.ok(p.notes.some(n=>n.includes('Scope:')));assert.ok(p.questions.length);assert.ok(!p.roles.some(r=>r.label==='Finance'));}
});
test('Actual purchasing approval keeps correction, cancellation and unspecified amount',()=>{
  const p=fixture('digmatix-plan');
  assert.ok(p.edges.some(e=>e.from==='correct_order'&&e.to==='manager_review'));
  assert.ok(p.edges.some(e=>e.from==='manager_review'&&e.to==='cancel_order'));
  assert.ok(p.edges.some(e=>e.from==='approval_route'&&e.to==='buyer_confirms'));
  assert.ok(p.questions.some(q=>q.id==='q_approval_amount'&&q.nodeIds.includes('approval_route')));
  assert.ok(!p.nodes.some(n=>/\d/.test(n.label)&&n.type!=='end'));
  for(const id of ['need_type','stock_inputs','request_quotes','cancel_order'])assert.equal(p.nodes.find(n=>n.id===id).roleId,null);
});
test('Supplier deviations and contradictory advance notice remain unresolved',()=>{
  const p=fixture('digmatix-track');
  assert.match(p.source,/the warehouse informs the buyer/);
  assert.ok(p.questions.some(q=>q.id==='q_warehouse_notice'&&q.kind==='other'));
  assert.ok(p.questions.some(q=>q.id==='q_deviation_route'&&q.kind==='missing_step'));
  assert.deepEqual([...reachable(p,'resolve_deviation')].sort(),['deviation_boundary','resolve_deviation']);
  assert.ok(p.notes.some(n=>/partial delivery/.test(n)&&/alternative/.test(n)&&/customer/.test(n)));
});
test('Wrong or damaged goods cannot reach accepted stock or receipt completion',()=>{
  const p=fixture('digmatix-receive'),route=reachable(p,'separate_notify');
  assert.ok(route.has('agree_resolution')&&route.has('resolution_boundary'));
  for(const id of ['register_receipt','store_goods','store_pending','complete'])assert.ok(!route.has(id));
  assert.ok(p.questions.some(q=>q.nodeIds.includes('agree_resolution')&&q.kind==='missing_step'));
});
test('A promised shortage stays open; an undeliverable balance is explicitly adjusted',()=>{
  const p=fixture('digmatix-receive'),open=reachable(p,'leave_open');
  assert.ok(open.has('partial_boundary'));
  assert.ok(!open.has('complete')&&!open.has('adjust_balance'));
  assert.ok(p.edges.some(e=>e.from==='quantity'&&e.to==='record_actual'));
  assert.ok(p.edges.some(e=>e.from==='remaining'&&e.to==='adjust_balance'&&e.label==='No further delivery'));
  assert.ok(p.questions.some(q=>q.id==='q_quantity_exception'));
});
test('Flow questions cannot be cleared by a short role-style answer',()=>{
  const p=fixture('digmatix-track'),old=clone(p);
  assert.throws(()=>applyClarification(p,'q_deviation_route','Ask supplier'),/updated process/);
  assert.deepEqual(p,old);
});
test('All supplied stages retain finite loop layouts and source-evidence exports',()=>{
  for(const {process:p} of challengeExamples){const l=diagramLayout(p);assert.ok(Number.isFinite(l.width)&&Number.isFinite(l.height));for(const n of l.nodes)assert.ok(Number.isFinite(n.x)&&Number.isFinite(n.y));assert.match(toSVG(p),/data-process-svg/);assert.match(toMermaid(p),/^flowchart TD/);}
});

test('Example 1 keeps the full source while excluding future ERP features from current nodes',()=>{
  assert.match(goodsReceiptSource,/^Example 1\r?\nCompany: Põllukuld AS/);
  for(const {process:p} of pollukuldExamples){assert.equal(p.source,goodsReceiptSource);assert.equal(p.mode,'as-is');assert.equal(p.reviewed,false);assert.ok(p.questions.length);assert.ok(!p.nodes.some(n=>/electronic|create ERP purchase order|automate packaging/i.test(n.label)));}
  assert.equal(explicitFutureNeeds(goodsReceiptSource).length,3);
});
test('An exact future-need quote cannot justify a current-process activity',()=>{
  const p=fixture('pollukuld-other');p.nodes.find(n=>n.id==='purchase_invoice').evidence='the receipt and inspection of goods will be carried out electronically';
  assert.match(validateProcess(p).errors.join(' '),/explicitly marked as a future need/);
  assert.throws(()=>createDocument(p,p.source),/outside the as-is/);
});
test('Future-summary evidence also needs a proposed to-be model',()=>{
  const p=fixture('pollukuld-other');p.nodes.find(n=>n.id==='purchase_invoice').evidence='Implementation of purchase orders in ERP';
  assert.match(validateProcess(p).errors.join(' '),/future need/);
  p.mode='to-be';assert.deepEqual(validateProcess(p).errors,[]);
});
test('A phrase also stated in current text is not rejected just because a need repeats it',()=>{
  const p=fixture('expense');p.source+='\nNeed: finance reimburses the employee';
  assert.deepEqual(validateProcess(p).errors,[]);
});
test('Explicit future blocks stop at current headings, blank paragraphs and the next example',()=>{
  const source='Need: planned step\ncontinued need\n\nCurrent unlabelled fact\nSummary of identified needs\nPlanned ERP\nExample 2\nAnother current fact\nNeed: future again\nToday’s process\nAn existing step';
  const blocks=sourceBlocks(source),future=blocks.filter(b=>b.future).map(b=>b.text).join('\n'),current=blocks.filter(b=>!b.future).map(b=>b.text).join('\n');
  assert.match(future,/continued need/);assert.match(future,/Planned ERP/);assert.ok(!future.includes('Another current fact'));assert.match(current,/Current unlabelled fact/);assert.match(current,/An existing step/);
});
test('Current accountant ERP use is retained while warehouse ERP posting is not invented',()=>{
  const p=fixture('pollukuld-other'),entry=p.nodes.find(n=>n.id==='purchase_invoice');
  assert.equal(entry.roleId,'accountant');assert.match(entry.evidence,/purchase invoice/);assert.ok(!p.roles.some(r=>r.id==='warehouse'));
  assert.deepEqual(validateProcess(p).errors,[]);
});
test('Own-production receipt skips external inspection and supplier invoice routing',()=>{
  const p=fixture('pollukuld-other'),own=reachable(p,'own_end');assert.deepEqual([...own],['own_end']);
  assert.ok(p.edges.some(e=>e.from==='origin'&&e.to==='own_end'&&e.label==='Own production'));
  assert.ok(p.questions.some(q=>q.id==='q_own_next'&&q.kind==='missing_step'));
});
test('Supplier 1 keeps paper, Excel, actual quantity and batch rotation without inventing damage disposition',()=>{
  const p=fixture('pollukuld-supplier1');assert.match(p.nodes.find(n=>n.id==='paper_slip').evidence,/paper packing slip/);assert.match(p.nodes.find(n=>n.id==='compare_excel').evidence,/Excel/);
  assert.ok(p.edges.some(e=>e.from==='quantity_differs'&&e.to==='accept_actual'&&e.label==='More or less'));
  assert.ok(p.nodes.some(n=>n.id==='rotate_batch'));assert.ok(!reachable(p,'credit_claim').has('store'));assert.ok(p.questions.some(q=>q.id==='q_damage_disposition'));
});

