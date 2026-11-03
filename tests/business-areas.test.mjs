import test from 'node:test';
import assert from 'node:assert/strict';
import {examples} from '../lib/examples.mjs';
import {applyReceiptDemo,clone,createDocument,diagramLayout,saveBusinessArea,toSVG,toMermaid,validateProcess} from '../lib/process.mjs';
import {areaCard,areaDefinition,BUSINESS_AREAS,customerOverview,withBusinessAreas} from '../lib/business-areas.mjs';
import {generateProcessDraft,prepareProcessRequest,PROCESS_SCHEMA} from '../lib/ai-process.mjs';
import {matchesAIRequest} from '../lib/ai-workspace.mjs';
import {translate} from '../lib/i18n.mjs';
const expense=()=>clone(examples[0].process);
test('production is supported across JSON, localized exports and the safe unknown fallback',()=>{
 const source='The production planner schedules the shift. The process ends.';
 const p=createDocument({schemaVersion:'1.0',title:'Shift planning',mode:'as-is',roles:[{id:'planner',label:'Production planner'}],nodes:[{id:'start',type:'start',label:'Start',roleId:null,evidence:''},{id:'plan',type:'activity',label:'Schedule shift',roleId:'planner',evidence:'The production planner schedules the shift',businessArea:'production',areaReason:'Plans manufacturing work.',areaReviewed:false},{id:'end',type:'end',label:'Process complete',roleId:null,evidence:''}],edges:[{from:'start',to:'plan',label:''},{from:'plan',to:'end',label:''}],questions:[],notes:[]},source);
 assert.deepEqual(validateProcess(p).errors,[]);
 const saved=saveBusinessArea(p,'plan','production','Plans the production shift.');
 assert.deepEqual(createDocument(JSON.parse(JSON.stringify(saved)),source).nodes,saved.nodes);
 for(const [locale,label] of [['en','Production'],['et','Tootmine'],['fr','Production'],['de','Produktion']]){
  assert.equal(translate(locale,'Production'),label);
  const options={areaLabels:{production:label}};assert.ok(toSVG(saved,[],options).includes(label));assert.ok(toMermaid(saved,options).includes(label));
 }
 assert.equal(areaDefinition('invalid').id,'unknown');assert.equal(areaDefinition('other').id,'other');
 const older=expense();older.nodes[1].businessArea='other';assert.equal(withBusinessAreas(older).nodes[1].businessArea,'other');
});
function sales(){
 const p=clone(examples[1].process);
 p.source=p.source.replace('Sales records a sales order.','Sales records a sales order. Sales verifies the order.');
 p.nodes.splice(2,0,{...clone(p.nodes.find(n=>n.id==='record')),id:'verify',label:'Verify sales order',evidence:'Sales verifies the order',areaReason:'Checks the customer order.'});
 p.edges=p.edges.flatMap(e=>e.from==='record'&&e.to==='credit'?[{from:'record',to:'verify',label:''},{from:'verify',to:'credit',label:''}]:[e]);
 return createDocument(p,p.source,'test-fixture');
}
test('legacy imports retain unknown areas without inferring function from role or software',()=>{
 const p=sales();for(const n of p.nodes)for(const key of ['businessArea','areaReason','areaReviewed'])delete n[key];
 const next=createDocument(p,p.source);
 assert.ok(next.nodes.every(n=>areaCard(n).businessArea==='unknown'&&!areaCard(n).areaReviewed));
 assert.deepEqual(next.roles,p.roles);assert.deepEqual(next.edges,p.edges);assert.equal(next.source,p.source);
});
test('a manual area assignment preserves customer facts and creates a new unreviewed version',()=>{
 const p=expense();p.reviewed=true;const original=clone(p);
 const next=saveBusinessArea(p,'submit','finance','This is an employee expense claim.');
 assert.deepEqual(p,original);assert.equal(next.version,p.version+1);assert.equal(next.reviewed,false);
 assert.equal(next.source,p.source);assert.equal(next.mode,p.mode);assert.deepEqual(next.edges,p.edges);assert.deepEqual(next.questions,p.questions);
 assert.equal(next.nodes.find(n=>n.id==='submit').evidence,p.nodes.find(n=>n.id==='submit').evidence);
 assert.deepEqual(areaCard(next.nodes.find(n=>n.id==='submit')),{businessArea:'finance',areaReason:'This is an employee expense claim.',areaReviewed:true});
 const cleared=saveBusinessArea(next,'submit','unknown','Insufficient context.');assert.equal(areaCard(cleared.nodes.find(n=>n.id==='submit')).areaReviewed,false);
 assert.equal(matchesAIRequest({intent:'generate',version:p.version,source:p.source,process:p},{process:next,source:next.source}),false);
});
test('invalid area metadata and unsupported terminal classifications fail before import',()=>{
 for(const patch of [{businessArea:'<script>'},{businessArea:null},{areaReason:null},{areaReason:''},{areaReason:'x'.repeat(601)},{areaReviewed:null},{areaReviewed:'yes'},{businessArea:'unknown',areaReviewed:true}]){
  const p=expense();Object.assign(p.nodes.find(n=>n.id==='submit'),patch);assert.ok(validateProcess(p).errors.length);assert.throws(()=>createDocument(p,p.source));
 }
 assert.throws(()=>saveBusinessArea(expense(),'start','sales','Start of sales.'),/activities and decisions/);
 assert.throws(()=>saveBusinessArea(expense(),'submit','sales',''),/1–600/);
 const malformed=expense();malformed.nodes[1]=null;assert.ok(validateProcess(malformed).errors.length);
});
test('area mapping and human confirmation round-trip with JSON while process approval resets',()=>{
 const p=saveBusinessArea(expense(),'submit','finance','An expense claim is finance work.');p.reviewed=true;
 const restored=createDocument(JSON.parse(JSON.stringify(p)),p.source);
 assert.equal(restored.reviewed,false);assert.deepEqual(restored.nodes,p.nodes);assert.equal(restored.source,p.source);
});
test('AI uses the controlled area schema and cannot claim human area confirmation',async()=>{
 const p=expense();p.nodes.find(n=>n.id==='submit').areaReviewed=true;let sent;
 const prepared=prepareProcessRequest({intent:'generate',locale:'fr',source:p.source,current:p,expectedVersion:p.version});
 const {draft}=await generateProcessDraft(prepared,{apiKey:'test-only',fetcher:async(_url,options)=>{sent=JSON.parse(options.body);return new Response(JSON.stringify({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(p)}]}]}));}});
 assert.ok(sent.instructions.includes('not merely a person'));assert.ok(sent.instructions.includes('business-area reasons in French'));
 assert.deepEqual(PROCESS_SCHEMA.properties.nodes.items.properties.businessArea.enum,BUSINESS_AREAS.map(a=>a.id));
 assert.ok(PROCESS_SCHEMA.properties.nodes.items.required.includes('areaReason'));assert.ok(!PROCESS_SCHEMA.properties.nodes.items.required.includes('areaReviewed'));
 assert.ok(draft.nodes.every(n=>!n.areaReviewed));assert.equal(draft.source,p.source);assert.deepEqual(draft.edges,p.edges);
});
test('AI edits retain human-confirmed areas on unchanged tasks and reject invalid categories',async()=>{
 const p=saveBusinessArea(expense(),'submit','finance','An expense claim is finance work.');
 const command='After approval add a receipt check.',prepared=prepareProcessRequest({intent:'edit',source:p.source,current:p,expectedVersion:p.version,command});
 const raw=clone(p);raw.mode='to-be';Object.assign(raw.nodes.find(n=>n.id==='submit'),{businessArea:'sales',areaReason:'Changed without support.'});
 const response=model=>new Response(JSON.stringify({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(model)}]}]}));
 const {draft}=await generateProcessDraft(prepared,{apiKey:'test-only',fetcher:async()=>response(raw)});
 assert.deepEqual(areaCard(draft.nodes.find(n=>n.id==='submit')),areaCard(p.nodes.find(n=>n.id==='submit')));
 raw.nodes.find(n=>n.id==='submit').businessArea='invented';await assert.rejects(generateProcessDraft(prepared,{apiKey:'test-only',fetcher:async()=>response(raw)}),error=>error.code==='INVALID_DRAFT');
});
test('a customer overview contracts only a real linear path and accounts for every original node',()=>{
 const p=sales(),before=clone(p),overview=customerOverview(p),o=overview.process;
 assert.equal(overview.groupCount,1);assert.deepEqual(overview.members.record,['record','verify']);
 assert.deepEqual(Object.values(overview.members).flat().sort(),p.nodes.map(n=>n.id).sort());
 assert.deepEqual(validateProcess(o).errors,[]);assert.deepEqual(p,before);assert.equal(o.source,p.source);assert.equal(o.mode,p.mode);
 for(const n of p.nodes.filter(n=>['decision','start','end'].includes(n.type)))assert.deepEqual(o.nodes.find(item=>item.id===n.id),n);
 for(const e of p.edges.filter(e=>e.label))assert.ok(o.edges.some(item=>item.from===e.from&&item.to===e.to&&item.label===e.label));
 assert.equal(o.edges.length,p.edges.length-1);assert.ok(o.edges.some(e=>e.from==='record'&&e.to==='credit'));
});
test('overview grouping follows graph sequence even when the model node array is reversed',()=>{
 const p=sales();p.nodes.reverse();const overview=customerOverview(p);
 assert.deepEqual(overview.members.record,['record','verify']);assert.deepEqual(validateProcess(overview.process).errors,[]);
});
test('unknowns, questions, ownership, human decisions and labelled edges prevent unsafe grouping',()=>{
 for(const mutate of [
  p=>Object.assign(p.nodes.find(n=>n.id==='verify'),{businessArea:'unknown',areaReason:'',areaReviewed:false}),
  p=>p.questions.push({id:'q_verify',kind:'other',text:'What is checked?',nodeIds:['verify']}),
  p=>p.nodes.find(n=>n.id==='verify').roleId='finance',
  p=>{const n=p.nodes.find(n=>n.id==='verify');n.humanDecision=true;n.systemEvidence=n.evidence;},
  p=>p.edges.find(e=>e.from==='record').label='After customer confirmation'
 ]){const p=sales();mutate(p);const overview=customerOverview(p);assert.equal(overview.groupCount,0);assert.deepEqual(overview.process.questions,p.questions);assert.deepEqual(validateProcess(overview.process).errors,[]);}
});
test('correction cycles and unresolved boundaries cannot disappear into an overview group',()=>{
 const source='Sales checks the order. If correction is needed, sales corrects the order and validates it, then checks again. Otherwise the process ends.';
 const task=(id,type,label,evidence)=>({id,type,label,evidence,roleId:'sales',businessArea:'sales',areaReason:'Customer order work.'});
 const p=createDocument({schemaVersion:'1.0',title:'Correction loop',mode:'as-is',roles:[{id:'sales',label:'Sales'}],nodes:[{id:'start',type:'start',label:'Start',roleId:null,evidence:''},task('check','decision','Correction needed?','Sales checks the order'),task('correct','activity','Correct order','sales corrects the order'),task('verify','activity','Validate order','validates it'),{id:'end',type:'end',label:'Unmapped boundary: after correction',roleId:null,evidence:''}],edges:[{from:'start',to:'check',label:''},{from:'check',to:'correct',label:'Correction needed'},{from:'correct',to:'verify',label:''},{from:'verify',to:'check',label:'Check again'},{from:'check',to:'end',label:'Otherwise'}],questions:[{id:'q_end',kind:'missing_step',text:'What follows?',nodeIds:['end']}],notes:[]},source);
 const overview=customerOverview(p);assert.equal(overview.groupCount,0);assert.deepEqual(overview.process.edges,p.edges);assert.deepEqual(overview.process.questions,p.questions);
});
test('ninety-node input keeps complete membership and finite top-down geometry',()=>{
 const tasks=Array.from({length:88},(_,i)=>({id:'task_'+i,type:'activity',label:'Handle item '+i,roleId:'warehouse',evidence:'Warehouse handles item '+i+'.',businessArea:'warehouse',areaReason:'Physical goods handling.'}));
 const nodes=[{id:'start',type:'start',label:'Start',roleId:null,evidence:''},...tasks,{id:'end',type:'end',label:'End',roleId:null,evidence:''}],edges=nodes.slice(0,-1).map((n,i)=>({from:n.id,to:nodes[i+1].id,label:''}));
 const p=createDocument({schemaVersion:'1.0',title:'Long warehouse process',mode:'as-is',roles:[{id:'warehouse',label:'Warehouse'}],nodes,edges,questions:[],notes:[]},tasks.map(n=>n.evidence).join(' '));
 const overview=customerOverview(p);assert.equal(overview.groupCount,1);assert.equal(overview.members.task_0.length,88);assert.equal(overview.process.nodes.length,3);assert.deepEqual(validateProcess(overview.process).errors,[]);
 const layout=diagramLayout(overview.process,'TD');assert.ok(layout.nodes.every(n=>Number.isFinite(n.x)&&Number.isFinite(n.y)&&n.y+n.h<=layout.height));
});
test('translated overview and diagram exports retain stable areas and original evidence without changing data',()=>{
 const p=sales(),before=clone(p);
 for(const locale of ['en','et','fr','de']){
  const t=(key,values)=>translate(locale,key,values),labels=Object.fromEntries(BUSINESS_AREAS.map(area=>[area.id,t(area.label)])),overview=customerOverview(p,t),svg=toSVG(overview.process,[],{direction:'TD',areaLabels:labels,areaLegendTitle:t('Business areas'),viewLabel:t('Customer overview')}),mermaid=toMermaid(p,{direction:'LR',areaLabels:labels,areaLegendTitle:t('Business areas')});
  assert.ok(svg.includes(t('Customer overview')));assert.ok(svg.includes(areaDefinition('sales').color));assert.ok(svg.includes(t('Business areas')));assert.ok(mermaid.startsWith('flowchart LR\n'));assert.ok(mermaid.includes(labels.sales));
  assert.deepEqual(Object.values(overview.members).flat().sort(),p.nodes.map(n=>n.id).sort());
 }
 assert.deepEqual(p,before);
 const edited=applyReceiptDemo(expense());assert.ok(withBusinessAreas(edited).nodes.filter(n=>['receipt_check','attach_receipt'].includes(n.id)).every(n=>n.businessArea==='unknown'));
});
