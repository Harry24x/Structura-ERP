import {createDocument} from './process.mjs';
import {purchasingInterview} from './digmatix-source.mjs';

const n=(id,type,label,roleId=null,evidence='')=>({id,type,label,roleId,evidence});
const e=(from,to,label='')=>({from,to,label});
const q=(id,kind,text,...nodeIds)=>({id,kind,text,nodeIds});
const role=(id,label)=>({id,label});
const buyer=role('buyer','Buyer'), manager=role('manager','Purchasing manager');
const sales=role('sales','Sales'), erp=role('erp','ERP system');
const supplier=role('supplier','Supplier'), warehouse=role('warehouse','Warehouse worker');
const make=(id,label,stage,roles,nodes,edges,questions,notes)=>({
  id,label,stage,family:'digmatix',description:'Supplied Example 2 · Paljuriideid OÜ · stage '+stage+' of 3',
  source:purchasingInterview,
  process:createDocument({schemaVersion:'1.0',title:'Paljuriideid · '+label,mode:'as-is',roles,nodes,edges,questions,
    notes:['Assistant-prepared draft from the complete supplied interview. Not a live automatic generation or an approved reference.',...notes]},purchasingInterview,'source-draft')
});

export const challengeExamples=[
  make('digmatix-plan','Plan and approve',1,[buyer,manager,sales,erp],[
    n('start','start','Purchase need'),
    n('need_type','decision','Source of purchase need?',null,'In addition to the usual replenishment, there are customer-specific orders.'),
    n('stock_inputs','activity','Assess stock and demand',null,'We look at the existing stock in the ERP system, the quantities already reserved for customers, the sales forecast and previous sales.'),
    n('erp_recommendation','activity','Suggest regular purchases','erp','In the case of regular goods, we receive a purchase recommendation from the ERP'),
    n('sales_request','activity','Notify customer-specific need','sales','the sales department notifies the purchase that the item needs to be sourced for a specific customer'),
    n('review_need','activity','Review quantities and need','buyer','the buyer still reviews it'),
    n('supplier_route','decision','New item / supplier unable?','buyer','If it is a new product or a conventional supplier cannot provide the goods'),
    n('request_quotes','activity','Request supplier offers',null,'we usually ask for an offer from one or more suppliers'),
    n('compare_offers','activity','Compare and select offer','buyer','The buyer compares the price, delivery time and other conditions and chooses a suitable offer.'),
    n('create_order','activity','Create ERP purchase order','buyer','The buyer creates a purchase order in the ERP system.'),
    n('price_differs','decision','Price differs from agreement?','buyer','If the price in the system differs from the price last agreed with the supplier'),
    n('check_price','activity','Check correct price','buyer','the buyer must check which price is correct'),
    n('approval_route','decision','Small or larger purchase?','buyer','Regular smaller purchases can be confirmed by the buyer himself. In the case of a larger amount, the order goes to the purchasing manager for approval.'),
    n('buyer_confirms','activity','Confirm smaller purchase','buyer','Regular smaller purchases can be confirmed by the buyer himself.'),
    n('manager_review','decision','Manager approval outcome?','manager','the order goes to the purchasing manager for approval'),
    n('correct_order','activity','Correct and resubmit','buyer','The buyer makes corrections and sends the order for approval again.'),
    n('cancel_order','activity','Cancel unnecessary order',null,'Sometimes we also decide that it is not necessary to order this item at all. In this case, the order is canceled.'),
    n('confirmed','end','Confirmed → stage 2'),n('cancelled','end','Order cancelled')
  ],[
    e('start','need_type'),e('need_type','stock_inputs','Replenishment'),e('need_type','sales_request','Customer-specific'),
    e('stock_inputs','erp_recommendation'),e('erp_recommendation','review_need'),e('sales_request','review_need'),
    e('review_need','supplier_route'),e('supplier_route','create_order','Known supplier available'),e('supplier_route','request_quotes','New / unavailable'),
    e('request_quotes','compare_offers'),e('compare_offers','create_order'),e('create_order','price_differs'),
    e('price_differs','approval_route','No'),e('price_differs','check_price','Yes'),e('check_price','approval_route'),
    e('approval_route','buyer_confirms','Smaller regular purchase'),e('approval_route','manager_review','Larger amount'),e('buyer_confirms','confirmed'),
    e('manager_review','confirmed','Approved'),e('manager_review','correct_order','Return with comments'),e('correct_order','manager_review','Review again'),
    e('manager_review','cancel_order','Item no longer needed'),e('cancel_order','cancelled')
  ],[
    q('q_need_owner','role','Who classifies the initial purchase need?','need_type'),
    q('q_stock_owner','role','Who assesses stock, reservations and the sales forecast?','stock_inputs'),
    q('q_approval_amount','decision_rule','What amount and conditions separate buyer confirmation from manager approval?','approval_route'),
    q('q_cancel_owner','role','Who is authorised to cancel an unnecessary purchase order?','cancel_order'),
    q('q_quote_owner','role','Who requests offers from the candidate suppliers?','request_quotes'),
    q('q_price_update','missing_step','After checking a differing price, how is the order updated before approval?','check_price')
  ],[
    'Scope: need planning through order confirmation or cancellation. A confirmed order continues in stage 2; cancellation is an actual end.',
    'Stock assessment also considers minimum stock. The buyer considers forecast changes, discontinued goods, supplier minimum quantities and pack sizes. Existing supplier and terms are used when known.',
    'The source does not name the initial planning owner or an approval amount. Do not substitute the interview speaker for an operational role or invent a monetary threshold.',
    'The cancellation branch records the stated option, not an assumption that the manager alone may cancel. The authorisation remains an open question.'
  ]),
  make('digmatix-track','Confirm and track',2,[buyer,supplier,warehouse],[
    n('start','start','Confirmed order · stage 1'),
    n('send_order','activity','Send order to supplier',null,'The purchase order is sent to the supplier, usually by e-mail.'),
    n('supplier_confirmation','activity','Send order confirmation','supplier','The supplier sends us an order confirmation.'),
    n('check_confirmation','decision','Quantities, price, date match?','buyer','Yes, the buyer should check on this. The most important are the quantities, prices, and delivery date.'),
    n('resolve_deviation','activity','Choose response to deviation','buyer','the buyer must decide what to do next'),
    n('deviation_boundary','end','Response route to clarify'),
    n('record_date','activity','Record confirmed ERP date','buyer','the buyer enters the confirmed delivery time in the ERP'),
    n('monitor_orders','activity','Monitor approaching / late orders','buyer','Buyers keep track of approaching and late purchase orders.'),
    n('arrival','decision','Delivery status?','buyer','If the goods should have already arrived but have not arrived, the buyer contacts the supplier and asks for new delivery information.'),
    n('contact_supplier','activity','Ask for new delivery info','buyer','the buyer contacts the supplier and asks for new delivery information'),
    n('regular_expected','activity','View expected ERP orders','warehouse','In the case of regular deliveries, the warehouse sees the expected purchase orders from the ERP.'),
    n('await_update','end','Await supplier update'),n('arrived','end','Goods arrive → stage 3')
  ],[
    e('start','send_order'),e('send_order','supplier_confirmation'),e('supplier_confirmation','check_confirmation'),
    e('check_confirmation','record_date','Matches'),e('check_confirmation','resolve_deviation','Deviation'),e('resolve_deviation','deviation_boundary'),
    e('record_date','regular_expected'),e('regular_expected','monitor_orders'),e('monitor_orders','arrival'),
    e('arrival','arrived','Goods arrive'),e('arrival','contact_supplier','Due but not received'),e('arrival','monitor_orders','Not due yet'),e('contact_supplier','await_update')
  ],[
    q('q_sender','role','Who sends the confirmed purchase order to the supplier?','send_order'),
    q('q_deviation_route','missing_step','How are delay acceptance, partial delivery, an alternative supplier and customer negotiation sequenced, and how does each continue?','resolve_deviation'),
    q('q_warehouse_notice','other','For larger deliveries, who informs whom? The interview literally says the warehouse informs the buyer; the surrounding question suggests advance notice to the warehouse.','regular_expected'),
    q('q_followup','missing_step','After receiving new delivery information, who updates or reconfirms the date and resumes monitoring?','contact_supplier')
  ],[
    'Scope: confirmed order through goods arrival or an unresolved supplier-response boundary. Ends marked as waiting or clarification are handoffs, not completed purchases.',
    'Deviation options explicitly stated: accept a modest delay for noncritical goods; ask for partial delivery when urgent; seek an alternative if unsuitable; buyer or sales negotiates later delivery with the customer for customer-specific goods. Their sequencing and continuation are unresolved, so the diagram does not invent a route.',
    'Orders are usually emailed; some larger suppliers support electronic orders. This does not make a live ERP or email integration mandatory.',
    'The warehouse ERP view shown here is the regular-delivery path. The larger-delivery advance-notice path is unresolved because the interview wording is contradictory; it is not silently reversed.',
    'The delivery-status decision separates arrival, an overdue exception and continued monitoring before the due date. No unsupported automatic reminder or escalation is added.'
  ]),
  make('digmatix-receive','Receive and close',3,[buyer,warehouse],[
    n('start','start','Goods physically arrive'),
    n('receiving_area','activity','Move to receiving area',null,'The goods are first taken to the receiving area.'),
    n('inspect','activity','Find order; inspect shipment','warehouse',"The warehouse worker finds the corresponding purchase order in the ERP and checks the shipment against the supplier's waybill and purchase order."),
    n('condition','decision','Wrong or damaged goods?','warehouse','What happens if the wrong or damaged goods arrive?'),
    n('separate_notify','activity','Separate goods; notify buyer','warehouse','The warehouse worker informs the buyer and the goods are separated from the rest of the goods.'),
    n('agree_resolution','activity','Agree supplier resolution','buyer','The buyer contacts the supplier and it is agreed whether the supplier will send a replacement item, return the item or make some other arrangement.'),
    n('resolution_boundary','end','Resolution details to clarify'),
    n('quantity','decision','Received quantity matches?','warehouse',"What if the quantity doesn't match the order?"),
    n('register_receipt','activity','Register receipt in ERP','warehouse','the warehouse worker registers the receipt of the goods in the ERP'),
    n('record_actual','activity','Record actual quantity','warehouse','only the quantity that actually arrived is recorded'),
    n('remaining','decision','Supplier will deliver balance?','buyer','If the supplier promised to ship the remaining quantity later, the rest of the order remains open. If the supplier no longer delivers it, the buyer must adjust the remaining quantity of the order.'),
    n('leave_open','activity','Keep remaining order open',null,'the rest of the order remains open'),
    n('adjust_balance','activity','Adjust undeliverable balance','buyer','the buyer must adjust the remaining quantity of the order'),
    n('store_pending','activity','Store accepted arrived goods',null,'the goods go to the warehouse'),
    n('partial_boundary','end','Received stock; balance open'),
    n('store_goods','activity','Store accepted goods',null,'the goods go to the warehouse'),
    n('customer_order','decision','Customer-specific purchase?',null,'If it was a customer-based purchase, the sales must also know about it'),
    n('notify_sales','activity','Inform sales of receipt',null,"the sales must also know about it so that the customer's order can be continued"),
    n('complete','end','Receipt complete · in stock')
  ],[
    e('start','receiving_area'),e('receiving_area','inspect'),e('inspect','condition'),e('condition','separate_notify','Wrong / damaged'),
    e('separate_notify','agree_resolution'),e('agree_resolution','resolution_boundary'),e('condition','quantity','Acceptable goods'),
    e('quantity','register_receipt','Matches'),e('quantity','record_actual','Quantity differs'),e('register_receipt','store_goods'),e('record_actual','remaining'),
    e('remaining','leave_open','Balance promised later'),e('remaining','adjust_balance','No further delivery'),
    e('leave_open','store_pending'),e('store_pending','partial_boundary'),e('adjust_balance','store_goods'),
    e('store_goods','customer_order'),e('customer_order','notify_sales','Customer-specific'),e('customer_order','complete','Regular stock'),e('notify_sales','complete')
  ],[
    q('q_receiving_owner','role','Who moves arriving goods into the receiving area?','receiving_area'),
    q('q_open_owner','role','Who ensures that the undelivered balance stays open?','leave_open'),
    q('q_store_owner','role','Who moves accepted goods into stock?','store_goods','store_pending'),
    q('q_customer_owner','role','Who identifies a customer-specific receipt and ensures sales is informed?','customer_order','notify_sales'),
    q('q_resolution_detail','missing_step','How are replacement, return and other supplier arrangements executed and recorded?','agree_resolution'),
    q('q_quantity_exception','other','What happens with over-delivery or a changed balance, and is sales informed about partial customer deliveries?','quantity','adjust_balance','partial_boundary')
  ],[
    'Scope: physical arrival through accepted receipt and stock, an open delivery balance, or a supplier-resolution handoff. This is not invoice checking or payment.',
    'Inspection covers correct goods, quantity and, for applicable goods, batch or expiry. Wrong or damaged goods never follow the normal stock path in this draft.',
    'A promised remaining delivery stays open. Only the arrived quantity is recorded. Returning from a later delivery belongs to a new receipt instance; no unconfirmed replacement loop is invented.',
    'The interview describes shortages, but not an over-delivery rule. The “quantity differs” route is provisional for shortages; confirm other differences before approving the model.',
    'Invoice checking and supplier payment are explicitly the next finance process, outside this case. Sales notification is needed for customer-specific purchasing; the sender and partial-delivery treatment need confirmation.'
  ])
];
