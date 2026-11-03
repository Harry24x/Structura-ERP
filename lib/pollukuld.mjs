import {createDocument} from './process.mjs';
import {goodsReceiptSource} from './pollukuld-source.mjs';
const n=(id,type,label,roleId=null,evidence='')=>({id,type,label,roleId,evidence});
const e=(from,to,label='')=>({from,to,label});
const q=(id,kind,text,...nodeIds)=>({id,kind,text,nodeIds});
const accountant={id:'accountant',label:'Accountant'},driver={id:'driver',label:'Driver'};
const make=(id,label,stage,roles,nodes,edges,questions,notes)=>({id,label,stage,family:'pollukuld',
  description:'Supplied Example 1 · Põllukuld AS · current process scope '+stage,
  source:goodsReceiptSource,
  process:createDocument({schemaVersion:'1.0',title:'Põllukuld · '+label,mode:'as-is',roles,nodes,edges,questions,
    notes:['Assistant-prepared, unapproved draft. The full source includes future needs; these are kept outside the current-process nodes.',...notes]},goodsReceiptSource,'source-draft')});

export const pollukuldExamples=[
  make('pollukuld-supplier1','Supplier 1 · current receipt',1,[driver,accountant],[
    n('start','start','Supplier 1 goods arrive'),
    n('paper_slip','activity','Give paper packing slip','driver','upon the arrival of the goods, the driver gives the warehouse a paper packing slip'),
    n('compare_excel','activity','Compare slip with Excel order',null,'the packing slip is compared with the order created in Excel'),
    n('manual_check','activity','Count and check goods manually',null,'The goods are counted and checked manually on the basis of paper documents.'),
    n('quantity_differs','decision','Quantity differs from order?',null,'If the goods arrive more or less than ordered, the actual quantity will be accepted.'),
    n('accept_actual','activity','Accept actual received quantity',null,'the actual quantity will be accepted'),
    n('email_difference','activity','Email supplier about difference',null,'The supplier will be informed of the difference by e-mail.'),
    n('condition','decision','Packaging or item damaged?',null,'If the packaging is broken or the item is otherwise damaged'),
    n('credit_claim','activity','Send supplier credit claim',null,'a credit claim will be sent to the supplier'),
    n('damage_boundary','end','Disposition not described'),
    n('store','activity','Store at assigned location',null,'Goods have established specific locations in the warehouse.'),
    n('batch_exists','decision','Same item already present?',null,'If the same item is present, the older batch is moved forward and the new batch is placed backwards.'),
    n('rotate_batch','activity','Older batch forward; newer back',null,'the older batch is moved forward and the new batch is placed backwards'),
    n('erp_entry','activity','Make necessary ERP entries','accountant','the necessary ERP transactions are made by the accountant'),
    n('end','end','Mapped receipt / ERP follow-up')
  ],[
    e('start','paper_slip'),e('paper_slip','compare_excel'),e('compare_excel','manual_check'),e('manual_check','quantity_differs'),
    e('quantity_differs','accept_actual','More or less'),e('quantity_differs','condition','Matches'),e('accept_actual','email_difference'),e('email_difference','condition'),
    e('condition','credit_claim','Damaged'),e('credit_claim','damage_boundary'),e('condition','store','Intact'),e('store','batch_exists'),
    e('batch_exists','rotate_batch','Yes'),e('batch_exists','erp_entry','No'),e('rotate_batch','erp_entry'),e('erp_entry','end')
  ],[
    q('q_checks_owner','role','Who compares the documents and performs the quantity and visual checks?','compare_excel','manual_check','quantity_differs','condition'),
    q('q_actual_owner','role','Who accepts and records the actual quantity?','accept_actual'),
    q('q_difference_owner','role','Who emails the supplier about the quantity difference?','email_difference'),
    q('q_claim_owner','role','Who sends the supplier credit claim?','credit_claim'),
    q('q_storage_owner','role','Who stores goods and rotates the older and newer batches?','store','batch_exists','rotate_batch'),
    q('q_damage_disposition','missing_step','After the credit claim, are damaged goods held, stored, returned or handled another way?','credit_claim','damage_boundary'),
    q('q_timing','other','Confirm the relative timing of quantity checks, quality checks, storage and the accountant entry; the workshop lists these topics separately.','manual_check','condition','store','erp_entry')
  ],[
    'Scope: Supplier 1 receipt, inspection, stock placement and the stated accountant ERP follow-up. The already prepared Excel order is an input; upstream purchase planning is not drawn.',
    'Current practice uses Excel and paper. The source says stock is viewed when ordering and Supplier 1 orders are prepared in Excel in advance. No current ERP purchase-order creation or electronic receipt is added.',
    'Receipt data includes item, batch, quantity and best-before date. Inspection is manual and includes visual condition. Exact operational owners are not stated; the interview does not justify assigning every task to warehouse workers.',
    'The source states a credit claim for damage, but does not give the physical disposition or continuation. The draft stops at a clarification boundary; it does not claim that the real process stops there.',
    'Accountants make the necessary ERP transactions after receipt or order completion. Warehouse workers explicitly do not make ERP transactions. Supplier 1 entry type and exact timing require confirmation.',
    'Storage has established locations, is arranged by handling speed and spans Warehouse 1 and Warehouse 2. Older batches go forward. Rare cross-docking is context, not an invented normal-path step.',
    'Packaging quantity is calculated in Excel under the historical practice described. Its weighing/measurement timing and owner are outside this receipt scope. Automation is a future need.'
  ]),
  make('pollukuld-other','Other sources · current documents',2,[accountant],[
    n('start','start','Goods from another source'),
    n('origin','decision','External or own production?',null,'Goods arriving at the warehouse from our own production are not inspected upon receipt.'),
    n('inspect_note','activity','Inspect using delivery note',null,'the goods are inspected on the basis of the delivery note'),
    n('record_note','activity','Mark received goods and batches',null,'the goods received, batch, best before and quantity are marked on the consignment note'),
    n('forward_note','activity','Forward note to accountant',null,'the delivery note is forwarded to the accountant'),
    n('purchase_invoice','activity','Enter ERP purchase invoice','accountant','the accountant enters the information into the ERP as a purchase invoice'),
    n('external_end','end','Invoice entry; other steps to map'),
    n('own_end','end','Own production: no receipt check')
  ],[
    e('start','origin'),e('origin','inspect_note','Other external supplier'),e('inspect_note','record_note'),e('record_note','forward_note'),
    e('forward_note','purchase_invoice'),e('purchase_invoice','external_end'),e('origin','own_end','Own production')
  ],[
    q('q_origin_owner','role','Who identifies the source of the arriving goods?','origin'),
    q('q_note_owner','role','Who inspects and records the incoming goods on the delivery or consignment note?','inspect_note','record_note'),
    q('q_forward_owner','role','Who forwards the delivery note to the accountant?','forward_note'),
    q('q_own_next','missing_step','How are own-production receipts recorded and moved into stock after the stated absence of receipt inspection?','own_end'),
    q('q_exception_links','missing_step','How are quantity differences, damage claims and storage linked to this other-supplier document route?','inspect_note','external_end'),
    q('q_invoice_timing','other','When does the accountant invoice entry occur relative to physical storage and order completion?','purchase_invoice')
  ],[
    'Scope: the document route for other external suppliers, plus the explicit own-production inspection exception. This is a partial view, not the complete physical receipt or storage process.',
    'Other suppliers have no pre-created Excel order. The delivery note provides the inspection basis. Do not apply the Supplier 1 Excel-order comparison to this branch.',
    'The accountant currently enters an ERP purchase invoice. This is current ERP use; purchase orders and electronic receipt are future needs. Keeping future needs separate must not remove the existing accountant invoice activity.',
    'Own-production goods are explicitly not inspected on receipt. The source does not describe their subsequent recording route; no accountant purchase invoice or supplier claim is invented for own production.',
    'Quantity differences, visual quality checks, batch positioning and packaging accounting appear elsewhere in the full source. Their exact links to this document route require clarification rather than a guessed sequence.'
  ])
];
