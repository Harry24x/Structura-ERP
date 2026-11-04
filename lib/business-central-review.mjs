import {numberSource} from './khaled-rules.mjs';
import {sourceBlocks} from './source-sections.mjs';
import {BC_REFERENCES} from './process-explorer.mjs';

const reference = id => BC_REFERENCES.find(item=>item.id===id).url;
export const BC_REVIEW_RULES = [
 {id:'purchase',pattern:/purchase order|ostutellim|commande d[’']achat|bestellung/i,url:reference('purchase-order'),guide:'Use a purchase order for partial receipts.'},
 {id:'receipt',pattern:/goods receipt|receive (?:the )?(?:goods|items|delivery)|vastuvõ|réception|wareneingang/i,url:reference('warehouse-receipt'),guide:'Separate receipt and put-away where warehouse setup requires separate operations.'},
 {id:'purchaseInvoice',pattern:/purchase invoice|(?:supplier|vendor) invoice|ostuarv|tarnija arve|facture fournisseur|einkaufsrechnung|lieferantenrechnung/i,url:reference('purchase-invoice'),guide:'When invoicing from a purchase order, post the receipt before or together with the invoice.'},
 {id:'sales',pattern:/sales order|sales quote|sales invoice|partial shipment|müügitellim|müügipakkum|müügiarv|osali[ns]e? lähet|commande client|facture vente|verkaufsauftrag|verkaufsrechnung|teillieferung/i,url:'https://learn.microsoft.com/en-us/dynamics365/business-central/sales-how-invoice-sales',guide:'Distinguish quote, order, shipment and invoice. Use a sales order for partial shipments.'},
 {id:'payment',pattern:/vendor payment|supplier payment|pay (?:the )?(?:vendor|supplier)|tarnijale (?:mak|tas)|tarnijamaks|paiement fournisseur|lieferantenzahlung/i,url:'https://learn.microsoft.com/en-us/dynamics365/business-central/payables-how-apply-purchase-transactions-manually',guide:'Distinguish posting the invoice, paying the vendor and applying the payment to the open invoice.'},
 {id:'approval',pattern:/approv|kinnita|approbation|genehmig/i,url:'https://learn.microsoft.com/en-us/dynamics365/business-central/walkthrough-setting-up-and-using-a-purchase-approval-workflow',guide:'Confirm the approver and amount limit. Distinguish the approval request, decision and document processing.'},
 {id:'match',pattern:/three[- ]way match|invoice mismatch|arve lahknev|kolmepoolne võrdlus|écart de facture|rechnungsabweichung/i,url:reference('purchase-invoice')}
];

export function reviewBusinessCentral(process,locale) {
 const passages=sourceBlocks(process.source).filter(block=>process.mode!=='as-is'||!block.future)
  .flatMap(block=>numberSource(block.text,locale).map(({text})=>text));
 const steps=process.nodes.filter(node=>node.type==='activity'||node.type==='decision');
 const findings=BC_REVIEW_RULES.flatMap(rule=>{
  const sources=passages.filter(passage=>rule.pattern.test(passage));
  const nodes=steps.filter(node=>rule.pattern.test(node.label));
  if(!sources.length&&!nodes.length)return [];
  const questions=process.questions.filter(question=>question.nodeIds.some(id=>nodes.some(node=>node.id===id)));
  return [
   ...(sources.length&&!nodes.length?[{rule,kind:'missing',sources,nodes,questions:[]}]:[]),
   ...(questions.length?[{rule,kind:'question',sources,nodes,questions}]:[]),
   ...(rule.guide?[{rule,kind:'reference',sources,nodes,questions:[]}]:[])
  ];
 });
 const invoice=BC_REVIEW_RULES.find(rule=>rule.id==='purchaseInvoice');
 const receipt=BC_REVIEW_RULES.find(rule=>rule.id==='receipt');
 const purchase=BC_REVIEW_RULES.find(rule=>rule.id==='purchase');
 if(!passages.some(passage=>purchase.pattern.test(passage)))return findings;
 const posting=steps.filter(step=>invoice.pattern.test(step.label)&&/post|konteer|valider|buch/i.test(step.label));
 const receiving=steps.filter(step=>receipt.pattern.test(step.label));
 for(const posted of posting)for(const received of receiving){
  if(reaches(process.edges,posted.id,received.id)&&!reaches(process.edges,received.id,posted.id)) {
   findings.push({rule:invoice,kind:'order',sources:passages.filter(passage=>invoice.pattern.test(passage)||receipt.pattern.test(passage)),nodes:[posted,received],questions:[]});
   return findings;
  }
 }
 return findings;
}

function reaches(edges,start,target) {
 const visited=new Set();
 const pending=[start];
 while(pending.length){
  const id=pending.pop();
  if(id===target)return true;
  if(visited.has(id))continue;
  visited.add(id);
  for(const edge of edges)if(edge.from===id)pending.push(edge.to);
 }
 return false;
}
