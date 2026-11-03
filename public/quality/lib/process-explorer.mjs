import {stepSignature} from './process-signature.mjs';
export {stepSignature} from './process-signature.mjs';
import {validateCatalogMappings,reconcileCatalogMappings} from './dynamics-catalog.mjs';
// Presentation metadata belongs to the canonical process; it never changes its flow.
import {customerOverview,areaDefinition} from './business-areas.mjs';
const copy=value=>JSON.parse(JSON.stringify(value));
export const BC_REFERENCES=[
 {id:'purchase-order',key:'purchaseOrder',url:'https://learn.microsoft.com/en-us/dynamics365/business-central/purchasing-how-record-purchases'},
 {id:'purchase-invoice',key:'purchaseInvoice',url:'https://learn.microsoft.com/en-us/dynamics365/business-central/purchasing-how-record-purchases'},
 {id:'warehouse-receipt',key:'warehouseReceipt',url:'https://learn.microsoft.com/en-us/dynamics365/business-central/warehouse-how-receive-items'},
 {id:'warehouse-putaway',key:'warehousePutaway',url:'https://learn.microsoft.com/en-us/dynamics365/business-central/warehouse-how-to-put-items-away-with-warehouse-put-aways'},
 {id:'approval-workflow',key:'approvalWorkflow',url:'https://learn.microsoft.com/en-us/dynamics365/business-central/across-how-to-create-workflows'}
];
export function validateExplorer(p){
 const x=p.explorer;if(x===undefined)return [];
 if(!x||x.schemaVersion!==1||!Array.isArray(x.groups)||x.groups.length>90||!Array.isArray(x.bcMappings)||x.bcMappings.length>90)return ['Invalid process view metadata.'];
 const nodes=new Set(p.nodes?.map(n=>n?.id)),groups=new Set(),members=new Set(),mapped=new Set(),errors=[];
 for(const g of x.groups){
  if(!g||typeof g.id!=='string'||!/^sp_[A-Za-z0-9_-]{1,60}$/.test(g.id)||groups.has(g.id)||typeof g.label!=='string'||!g.label.trim()||g.label.length>160||!Array.isArray(g.nodeIds)||!g.nodeIds.length||g.nodeIds.length>90||typeof g.confirmed!=='boolean'){errors.push('Invalid subprocess group.');continue;}
  groups.add(g.id);for(const id of g.nodeIds){if(!nodes.has(id)||members.has(id))errors.push('A step must belong to at most one subprocess.');members.add(id);}
 }
 for(const m of x.bcMappings){
  if(!m||!nodes.has(m.nodeId)||mapped.has(m.nodeId)||!BC_REFERENCES.some(r=>r.id===m.referenceId)||!['suggested','confirmed'].includes(m.status)||typeof m.note!=='string'||m.note.length>1000||typeof m.signature!=='string'||m.signature.length>80000||(m.status==='confirmed'&&m.note.trim().length<5))errors.push('Invalid Business Central mapping.');
  mapped.add(m?.nodeId);
 }
 return [...new Set([...errors,...validateCatalogMappings(p)])];
}
export function subprocesses(p,translate=(s,args={})=>s.replace(/\{(\w+)\}/g,(_,key)=>String(args[key]??key))){
 const explicit=p.explorer?.groups||[],used=new Set(explicit.flatMap(g=>g.nodeIds));
 // Existing conservative contraction suggests linear groups only; users define actual subprocess boundaries.
 const suggested=customerOverview(p,translate),groups=explicit.map(copy);
 for(const n of suggested.process.nodes){
  const runs=[];let run=[];
  for(const id of suggested.members[n.id]||[n.id]){if(used.has(id)){if(run.length)runs.push(run);run=[];}else run.push(id);}
  if(run.length)runs.push(run);
  for(const ids of runs){const first=p.nodes.find(n=>n.id===ids[0]);
   const label=ids.length===1?first.label:translate('{area} · {count} activities',{area:translate(areaDefinition(first.businessArea).label),count:ids.length});
   groups.push({id:'auto_'+first.id,label,nodeIds:ids,confirmed:false,automatic:true});
  }
 }
 return groups;
}
export function overviewProjection(p,groups=subprocesses(p)){
 const membership=new Map(groups.flatMap(g=>g.nodeIds.map(id=>[id,g.id]))),seen=new Set();
 const nodes=groups.map(g=>{const original=p.nodes.find(n=>n.id===g.nodeIds[0]);return {...original,id:g.id,type:g.nodeIds.length===1?original.type:'activity',label:g.label,roleId:g.nodeIds.length===1?original.roleId:null};});
 const edges=p.edges.flatMap(e=>{const from=membership.get(e.from),to=membership.get(e.to),key=JSON.stringify([from,to,e.label]);if(!from||!to||from===to||seen.has(key))return [];seen.add(key);return [{from,to,label:e.label}];});
 return {...p,nodes,edges,questions:[],notes:[]};
}
export function detailProjection(p,group,{incoming='From',outgoing='To'}={}){
 if(!group)return copy(p);
 const ids=new Set(group.nodeIds),nodes=p.nodes.filter(n=>ids.has(n.id)).map(copy),edges=[],boundaries=new Map();let serial=0;
 const boundary=(id,kind)=>{const key=kind+id;if(boundaries.has(key))return boundaries.get(key);let bid;do{bid='boundary_'+serial++;}while(p.nodes.some(n=>n.id===bid));boundaries.set(key,bid);nodes.push({id:bid,type:kind==='in'?'start':'end',label:(kind==='in'?incoming:outgoing)+': '+p.nodes.find(n=>n.id===id).label,roleId:null,evidence:'',boundary:true});return bid;};
 for(const e of p.edges){const from=ids.has(e.from),to=ids.has(e.to);if(from&&to)edges.push(copy(e));else if(from)edges.push({...e,to:boundary(e.to,'out')});else if(to)edges.push({...e,from:boundary(e.from,'in')});}
 return {...p,nodes,edges,questions:p.questions.filter(q=>q.nodeIds.some(id=>ids.has(id))),notes:[]};
}
export function mappingFor(p,nodeId){
 const m=p.explorer?.bcMappings?.find(m=>m.nodeId===nodeId);if(!m)return null;
 return {...m,status:m.status==='confirmed'&&m.signature===stepSignature(p,nodeId)?'confirmed':'suggested'};
}
export function reconcileExplorer(next,previous){
 if(!previous?.explorer)return next;
 const prior=previous.explorer;
 const ids=new Set(next.nodes.map(n=>n.id));
 next.explorer={schemaVersion:1,groups:prior.groups.map(g=>({...copy(g),nodeIds:g.nodeIds.filter(id=>ids.has(id)),confirmed:g.confirmed&&g.nodeIds.every(id=>ids.has(id)&&stepSignature(previous,id)===stepSignature(next,id))})).filter(g=>g.nodeIds.length),bcMappings:prior.bcMappings.filter(m=>ids.has(m.nodeId)).map(m=>({...copy(m),status:m.status==='confirmed'&&m.signature===stepSignature(next,m.nodeId)?'confirmed':'suggested'}))};
 if(prior.catalogMappings!==undefined)next.explorer.catalogMappings=reconcileCatalogMappings(next,prior.catalogMappings);
 return next;
}
export function saveExplorer(p,{groups=p.explorer?.groups||[],bcMappings=p.explorer?.bcMappings||[],catalogMappings=p.explorer?.catalogMappings}={}){
 const next=copy(p);next.explorer={schemaVersion:1,groups:copy(groups),bcMappings:copy(bcMappings)};
 if(catalogMappings!==undefined)next.explorer.catalogMappings=copy(catalogMappings);
 const errors=validateExplorer(next);if(errors.length)throw new Error(errors.join(' '));
 next.version=(Number(p.version)||1)+1;next.changeSummary='Process views updated';return next;
}
