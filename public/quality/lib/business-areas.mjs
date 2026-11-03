// Project taxonomy aligned with Business Central documentation, not a copy of
// Microsoft's full process catalog. It never adds steps to a customer's model.
const UNKNOWN_AREA=Object.freeze({id:'unknown',label:'Area unknown',color:'#9a7948',url:null});
export const BUSINESS_AREAS = Object.freeze([
 {id:'sales',label:'Sales',color:'#4e79a7',url:'https://learn.microsoft.com/en-us/dynamics365/business-central/sales-manage-sales'},
 {id:'purchasing',label:'Purchasing',color:'#7d66a2',url:'https://learn.microsoft.com/en-us/dynamics365/business-central/purchasing-manage-purchasing'},
 {id:'warehouse',label:'Warehouse',color:'#438675',url:'https://learn.microsoft.com/en-us/dynamics365/business-central/design-details-warehouse-management'},
 {id:'finance',label:'Finance',color:'#a77737',url:'https://learn.microsoft.com/en-us/dynamics365/business-central/finance'},
 {id:'production',label:'Production',color:'#b56552',url:'https://learn.microsoft.com/en-us/dynamics365/business-central/production-about-production-orders'},
 {id:'other',label:'Other area',color:'#697c8e',url:null},
 UNKNOWN_AREA
]);
export const BUSINESS_REFERENCE = Object.freeze({
 id:'bc-project-areas-2026-10-26',checked:'2026-10-26',
 url:'https://learn.microsoft.com/en-us/dynamics365/business-central/design-details-inbound-warehouse-flow',
 catalogUrl:'https://learn.microsoft.com/en-us/dynamics365/guidance/business-processes/about-catalog-levels'
});
export const areaCard = node => ({businessArea:node?.businessArea===undefined?'unknown':node.businessArea,areaReason:node?.areaReason===undefined?'':node.areaReason,areaReviewed:node?.areaReviewed===undefined?false:node.areaReviewed});
export const areaDefinition = id => BUSINESS_AREAS.find(area=>area.id===id)||UNKNOWN_AREA;
const isTask = node => ['activity','decision'].includes(node?.type);
export const withBusinessAreas = process => ({...process,nodes:Array.isArray(process?.nodes)?process.nodes.map(node=>node&&typeof node==='object'&&!Array.isArray(node)?{...node,businessArea:node.businessArea===undefined?'unknown':node.businessArea,areaReason:node.areaReason===undefined?'':node.areaReason,areaReviewed:node.areaReviewed===undefined?false:node.areaReviewed}:node):process?.nodes});

export function validateBusinessAreas(process) {
 const errors=[];
 for(const node of process.nodes||[]){
  if(!node||typeof node!=='object'||Array.isArray(node))continue; // The graph validator reports malformed nodes.
  const card=areaCard(node);
  // Explicit nulls and invalid values must not silently become unknown.
  if((Object.hasOwn(node,'businessArea')&&node.businessArea===null)||!BUSINESS_AREAS.some(area=>area.id===card.businessArea))errors.push('Choose a valid business area.');
  if(typeof card.areaReason!=='string'||card.areaReason.length>600||(card.businessArea!=='unknown'&&!card.areaReason.trim()))errors.push('Explain the area assignment in 1–600 characters.');
  if(typeof card.areaReviewed!=='boolean'||(card.areaReviewed&&card.businessArea==='unknown'))errors.push('Unknown business areas cannot be marked as confirmed.');
  if(!isTask(node)&&(card.businessArea!=='unknown'||card.areaReason||card.areaReviewed))errors.push('Business areas belong to activities and decisions.');
 }
 return [...new Set(errors)];
}

export const AREA_INSTRUCTIONS = `Classify each activity and decision by its business function using businessArea: sales, purchasing, warehouse, finance, production, other, unknown. This is a small project taxonomy aligned with Business Central documentation, not Microsoft's complete catalog. Choose from the actual action and its exact evidence, not merely a person's title, a software name or a reference workflow. Sales covers customer orders and customer-facing sales work; purchasing covers sourcing and supplier orders; warehouse covers physical receipt, storage, picking and shipment; finance covers credit, invoices, payment and employee reimbursement; production covers manufacturing, production planning and control of work in production. Moving finished goods to storage or picking remains warehouse work. Use other for a clear function outside these areas and unknown for insufficient or ambiguous evidence. Give a concise areaReason in the requested output language for every known area. Do not insert a Microsoft standard activity, configure a customer in Business Central, or replace the customer's observed process with a reference process. Keep uncertainty and as-is/to-be separation. Start/end markers use businessArea:unknown and areaReason:"". For edit/clarify retain manually confirmed assignments on unchanged tasks; never claim a human has reviewed a new model assignment.`;

export function reconcileModelAreas(draft,current,intent) {
 return withBusinessAreas({...draft,nodes:draft.nodes.map(node=>{
  const prior=current?.nodes?.find(item=>item.id===node.id);
  const unchanged=prior&&['label','type','roleId','evidence'].every(key=>prior[key]===node[key]);
  return {...node,...(intent!=='generate'&&unchanged&&areaCard(prior).areaReviewed?areaCard(prior):{areaReviewed:false})};
 })});
}

// Never merge cycles, decisions, questioned activities, different owners or
// different system cards. Only an unlabelled, unambiguous linear path contracts.
export function customerOverview(current,translate=(key,values={})=>key.replace(/\{(\w+)\}/g,(_,name)=>String(values[name]??''))) {
 const p=withBusinessAreas(current),byId=new Map(p.nodes.map(node=>[node.id,node]));
 const incoming=new Map(p.nodes.map(node=>[node.id,[]])),outgoing=new Map(p.nodes.map(node=>[node.id,[]]));
 for(const edge of p.edges){incoming.get(edge.to).push(edge);outgoing.get(edge.from).push(edge);}
 const cyclic=new Set(),visited=new Set(),stack=[],active=new Set();
 const visit=id=>{visited.add(id);active.add(id);stack.push(id);for(const edge of outgoing.get(id)){if(active.has(edge.to))stack.slice(stack.indexOf(edge.to)).forEach(item=>cyclic.add(item));else if(!visited.has(edge.to))visit(edge.to);}stack.pop();active.delete(id);};
 p.nodes.forEach(node=>{if(!visited.has(node.id))visit(node.id);});
 const questioned=new Set(p.questions.flatMap(question=>question.nodeIds));
 const eligible=node=>node.type==='activity'&&node.businessArea!=='unknown'&&!cyclic.has(node.id)&&!questioned.has(node.id)&&node.humanDecision!==true;
 const same=(a,b)=>['businessArea','roleId','systemId','execution','humanDecision','systemEvidence'].every(key=>a[key]===b[key]);
 const joins=(a,b)=>eligible(a)&&eligible(b)&&outgoing.get(a.id).length===1&&incoming.get(b.id).length===1&&!outgoing.get(a.id)[0].label.trim()&&same(a,b);
 /** @type {Record<string,string[]>} */
 const members={};
 const assigned=new Set(),mapping=new Map(),nodes=[];
 // Begin chains at their actual graph entry, even if a model orders its node
 // array differently. Array order is not authority for process sequence.
 const ordered=[...p.nodes.filter(node=>{const edge=incoming.get(node.id)[0];return incoming.get(node.id).length!==1||!joins(byId.get(edge.from),node);}),...p.nodes];
 for(const first of ordered){
  if(assigned.has(first.id))continue;
  const group=[first];assigned.add(first.id);let node=first;
  while(outgoing.get(node.id).length===1){const next=byId.get(outgoing.get(node.id)[0].to);if(assigned.has(next.id)||!joins(node,next))break;group.push(next);assigned.add(next.id);node=next;}
  const ids=group.map(item=>item.id);members[first.id]=ids;ids.forEach(id=>mapping.set(id,first.id));
  nodes.push(group.length===1?first:{...first,label:translate('{area} · {count} activities',{area:translate(areaDefinition(first.businessArea).label),count:group.length}),areaReviewed:group.every(item=>item.areaReviewed),overviewMembers:ids});
 }
 const edges=p.edges.filter(edge=>mapping.get(edge.from)!==mapping.get(edge.to)).map(edge=>({...edge,from:mapping.get(edge.from),to:mapping.get(edge.to)}));
 return {process:{...p,nodes,edges},members,groupCount:Object.values(members).filter(ids=>ids.length>1).length,activityCount:p.nodes.filter(isTask).length};
}
