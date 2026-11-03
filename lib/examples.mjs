import {createDocument} from './process.mjs';
import {challengeExamples} from './digmatix.mjs';
import {pollukuldExamples} from './pollukuld.mjs';
const node=(id,type,label,roleId=null,evidence='')=>({id,type,label,roleId,evidence});
const edge=(from,to,label='')=>({from,to,label});
const role=(id,label)=>({id,label});
// Curated assignments for synthetic teaching examples only; supplied customer
// drafts and legacy imports remain unknown until AI or a person maps them.
const preparedAreas={
 expense:{finance:['submit','approval','reimburse','rejected']},
 sales:{sales:['record','confirm','refuse'],finance:['credit'],warehouse:['pick','ship']},
 incomplete:{purchasing:['submit','approve','order','notify']},
 purchasing:{purchasing:['request','revise','order','replace'],finance:['budget','invoice'],warehouse:['deliver','inspect','receive']}
};
const make=(id,label,description,source,roles,nodes,edges,questions=[],notes=[])=>({id,label,description,source,process:createDocument({schemaVersion:'1.0',title:label,mode:'as-is',roles,nodes:nodes.map(node=>{const businessArea=Object.keys(preparedAreas[id]||{}).find(area=>preparedAreas[id][area].includes(node.id));return businessArea?{...node,businessArea,areaReason:'Prepared example: '+node.label,areaReviewed:false}:node;}),edges,questions,notes},source,'sample')});
export const examples=[
  make('expense','Expense approval','Simple · 3 roles · 1 decision',
    'An employee submits an expense claim. The manager reviews it. If approved, finance reimburses the employee and the process ends. If rejected, the employee receives the reason and the process ends.',
    [role('employee','Employee'),role('manager','Manager'),role('finance','Finance')],
    [node('start','start','Expense received'),node('submit','activity','Submit expense claim','employee','employee submits an expense claim'),node('approval','decision','Claim approved?','manager','The manager reviews it. If approved'),node('reimburse','activity','Reimburse employee','finance','finance reimburses the employee'),node('rejected','activity','Receive rejection reason','employee','the employee receives the reason'),node('end','end','Process complete')],
    [edge('start','submit'),edge('submit','approval'),edge('approval','reimburse','Approved'),edge('approval','rejected','Rejected'),edge('reimburse','end'),edge('rejected','end')]),
  make('sales','Sales order fulfilment','Medium · 4 roles · credit decision',
    'Sales records a sales order. Finance checks customer credit. If credit is approved, the warehouse picks and packs the goods, logistics ships them and sales confirms dispatch. If credit is refused, sales informs the customer and closes the order.',
    [role('sales','Sales'),role('finance','Finance'),role('warehouse','Warehouse'),role('logistics','Logistics')],
    [node('start','start','Order received'),node('record','activity','Record sales order','sales','Sales records a sales order'),node('credit','decision','Credit approved?','finance','Finance checks customer credit'),node('pick','activity','Pick and pack goods','warehouse','the warehouse picks and packs the goods'),node('ship','activity','Ship goods','logistics','logistics ships them'),node('confirm','activity','Confirm dispatch','sales','sales confirms dispatch'),node('refuse','activity','Inform customer; close order','sales','sales informs the customer and closes the order'),node('end','end','Process complete')],
    [edge('start','record'),edge('record','credit'),edge('credit','pick','Approved'),edge('credit','refuse','Refused'),edge('pick','ship'),edge('ship','confirm'),edge('confirm','end'),edge('refuse','end')]),
  make('incomplete','Purchase request','Incomplete · 3 questions to resolve',
    'An employee submits a purchase request. If approved, the buyer places the order. If rejected, the employee is notified and the process ends. The reviewer and approval rule are not specified.',
    [role('employee','Employee'),role('buyer','Buyer')],
    [node('start','start','Request received'),node('submit','activity','Submit purchase request','employee','employee submits a purchase request'),node('approve','decision','Request approved?',null,'If approved, the buyer places the order. If rejected'),node('order','activity','Place purchase order','buyer','the buyer places the order'),node('notify','activity','Receive rejection notice','employee','the employee is notified'),node('order_boundary','end','Unmapped boundary: after purchase order'),node('end','end','Process complete')],
    [edge('start','submit'),edge('submit','approve'),edge('approve','order','Approved'),edge('approve','notify','Rejected'),edge('order','order_boundary'),edge('notify','end')],
    [{id:'q_reviewer',kind:'role',text:'Who reviews and approves the purchase request?',nodeIds:['approve']},{id:'q_rule',kind:'decision_rule',text:'What rule determines whether the request is approved?',nodeIds:['approve']},{id:'q_after_order',kind:'missing_step',text:'What happens after the buyer places the order?',nodeIds:['order_boundary']}]),
  make('purchasing','Purchasing and receipt','Complex · 6 roles · correction loop',
    'An employee submits a purchase request. The manager checks it against the approved budget. If it is outside the budget, the employee revises the request and sends it back to the manager. If it is within the budget, procurement creates the purchase order. The supplier delivers the goods. The warehouse inspects the delivery. If goods are damaged, procurement agrees a replacement with the supplier and the supplier delivers again. If the goods are intact, the warehouse records receipt and finance matches the invoice. The process ends.',
    [role('employee','Employee'),role('manager','Manager'),role('procurement','Procurement'),role('supplier','Supplier'),role('warehouse','Warehouse'),role('finance','Finance')],
    [node('start','start','Purchase needed'),node('request','activity','Submit request','employee','employee submits a purchase request'),node('budget','decision','Within approved budget?','manager','The manager checks it against the approved budget'),node('revise','activity','Revise request','employee','the employee revises the request and sends it back to the manager'),node('order','activity','Create purchase order','procurement','procurement creates the purchase order'),node('deliver','activity','Deliver goods','supplier','The supplier delivers the goods'),node('inspect','decision','Goods intact?','warehouse','The warehouse inspects the delivery'),node('replace','activity','Agree replacement','procurement','procurement agrees a replacement with the supplier'),node('receive','activity','Record receipt','warehouse','the warehouse records receipt'),node('invoice','activity','Match invoice','finance','finance matches the invoice'),node('end','end','Process complete')],
    [edge('start','request'),edge('request','budget'),edge('budget','revise','Outside budget'),edge('revise','budget','Review again'),edge('budget','order','Within budget'),edge('order','deliver'),edge('deliver','inspect'),edge('inspect','replace','Damaged'),edge('replace','deliver','Replacement'),edge('inspect','receive','Intact'),edge('receive','invoice'),edge('invoice','end')],[],['Synthetic complex case. It does not replace the complete Paljuriideid interview test.'])
  ,...challengeExamples,...pollukuldExamples
];
export const exampleById=id=>examples.find(e=>e.id===id);
