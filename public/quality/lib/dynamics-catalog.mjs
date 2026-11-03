import {CATALOG_IDS,UNCONFIRMABLE_CATALOG_IDS,CATALOG_META,CATALOG_AREA_ROOTS} from './dynamics-catalog-index.mjs';
import {stepSignature} from './process-signature.mjs';
export {CATALOG_META};
const task=n=>['activity','decision'].includes(n?.type);
export function validateCatalogMappings(p){
 const mappings=p.explorer?.catalogMappings;if(mappings===undefined)return [];
 if(!Array.isArray(mappings)||mappings.length>90)return ['Invalid Dynamics 365 catalog associations.'];
 const seen=new Set(),errors=[];
 for(const m of mappings){
  if(!m||!p.nodes.some(n=>task(n)&&n.id===m.nodeId)||seen.has(m.nodeId)||m.catalogVersion!==CATALOG_META.version||typeof m.note!=='string'||m.note.length>1000||typeof m.signature!=='string'||m.signature.length>80000||!['unlinked','suggested','confirmed'].includes(m.status)||
   (m.entryId===null?m.status!=='unlinked':!CATALOG_IDS.has(m.entryId)||m.status==='unlinked')||
   (m.status==='confirmed'&&(m.note.trim().length<5||UNCONFIRMABLE_CATALOG_IDS.has(m.entryId))))errors.push('Invalid Dynamics 365 catalog association.');
  seen.add(m?.nodeId);
 }
 return [...new Set(errors)];
}
export function catalogMappingFor(p,nodeId){
 const saved=p.explorer?.catalogMappings?.find(m=>m.nodeId===nodeId);
 if(saved)return {...saved,status:saved.status==='confirmed'&&(saved.signature!==stepSignature(p,nodeId)||UNCONFIRMABLE_CATALOG_IDS.has(saved.entryId))?'suggested':saved.status,automatic:false};
 const n=p.nodes.find(n=>n.id===nodeId),entryId=task(n)?CATALOG_AREA_ROOTS[n.businessArea]||null:null;
 return {nodeId,entryId,status:entryId?'suggested':'unlinked',automatic:!!entryId,catalogVersion:CATALOG_META.version,note:''};
}
export function reconcileCatalogMappings(next,mappings){
 return mappings.filter(m=>next.nodes.some(n=>task(n)&&n.id===m.nodeId)).map(m=>({...m,status:m.status==='confirmed'&&(m.signature!==stepSignature(next,m.nodeId)||UNCONFIRMABLE_CATALOG_IDS.has(m.entryId))?'suggested':m.status}));
}
export function setCatalogMappings(p,nodeIds,{entryId,status='suggested',note=''}){
 if(!Array.isArray(nodeIds)||!nodeIds.length||new Set(nodeIds).size!==nodeIds.length||nodeIds.some(id=>!p.nodes.some(n=>task(n)&&n.id===id)))throw new Error('Select existing process steps.');
 const result=(p.explorer?.catalogMappings||[]).filter(m=>!nodeIds.includes(m.nodeId));
 for(const nodeId of nodeIds)result.push({nodeId,entryId:status==='unlinked'?null:entryId,status,note:note.trim(),catalogVersion:CATALOG_META.version,signature:stepSignature(p,nodeId)});
 const errors=validateCatalogMappings({...p,explorer:{...p.explorer,catalogMappings:result}});if(errors.length)throw new Error(errors.join(' '));return result;
}
export function createCatalogIndex(data){
 if(data?.meta?.version!==CATALOG_META.version||data.meta.sha256!==CATALOG_META.sha256||!Array.isArray(data.entries)||data.entries.length!==CATALOG_IDS.size)throw new Error('Unexpected catalog snapshot.');
 const byId=new Map(data.entries.map(e=>[e.id,e])),children=new Map(),paths=new Map();
 if(byId.size!==data.entries.length||data.entries.some(e=>!CATALOG_IDS.has(e.id)||typeof e.title!=='string'||!e.title.trim()||e.level<1||e.level>6||(e.level===1?e.parent!==null:byId.get(e.parent)?.level!==e.level-1)))throw new Error('Invalid catalog hierarchy.');
 for(const e of data.entries){const list=children.get(e.parent)||[];list.push(e);children.set(e.parent,list);}
 const path=id=>{if(paths.has(id))return paths.get(id);const entry=byId.get(id),list=entry?[...(entry.parent?path(entry.parent):[]),entry]:[];paths.set(id,list);return list;};
 return {meta:data.meta,entries:data.entries,byId,children,path};
}
export function catalogScope(p,index,entryId='all'){
 const nodes=p.nodes.filter(task);
 if(entryId==='all')return nodes.map(n=>n.id);
 if(entryId==='unlinked')return nodes.filter(n=>!catalogMappingFor(p,n.id).entryId).map(n=>n.id);
 if(!index.byId.has(entryId))return [];
 return nodes.filter(n=>index.path(catalogMappingFor(p,n.id).entryId).some(e=>e.id===entryId)).map(n=>n.id);
}
export function catalogCoverage(p,index){
 const counts=new Map(),confirmed=new Map();let unlinked=0;
 for(const n of p.nodes.filter(task)){
  const m=catalogMappingFor(p,n.id);if(!m.entryId){unlinked++;continue;}
  for(const e of index.path(m.entryId)){counts.set(e.id,(counts.get(e.id)||0)+1);if(m.status==='confirmed')confirmed.set(e.id,(confirmed.get(e.id)||0)+1);}
 }
 return {counts,confirmed,unlinked,total:p.nodes.filter(task).length};
}
export function searchCatalog(index,{parent=null,query='',level=0,limit=50}={}){
 const normal=s=>String(s).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase(),terms=normal(query).trim().split(/\s+/).filter(Boolean);
 const candidates=terms.length||level?index.entries:(index.children.get(parent)||[]);
 const matches=candidates.filter(e=>!e.retired&&(!level||e.level===Number(level))&&(!terms.length||terms.every(term=>normal(e.id+' '+e.sequence+' '+e.title+' '+e.products).includes(term))));
 return {entries:matches.slice(0,limit),total:matches.length};
}
export function catalogReferenceURL(entry){
 try{const url=new URL(entry?.url);if(url.protocol==='https:'&&url.hostname==='learn.microsoft.com')return url.href;}catch{}
 return CATALOG_META.source;
}
