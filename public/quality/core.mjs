import {validateProcess} from './lib/process.mjs';
export const AREAS = Object.freeze([
 ['accounting','Raamatupidamine'],['sales','Müük'],['production','Tootmine'],
 ['digital','Digitaliseerimine'],['purchasing','Ost'],['warehouse','Ladu'],
 ['other','Muu'],['unassigned','Määramata']
]);
export const ROLES=Object.freeze({manager:'Kvaliteedijuht',consultant:'Digmatix ERP consultant',employee:'Töötaja',client:'Klient'});
export const canManage=role=>role==='manager'||role==='consultant';
export const roleLabel=role=>ROLES[role]||ROLES.employee;
export const canPropose=role=>role==='employee'||role==='client';
export const proposalRole=proposal=>proposal.authorRole||'employee';
export const STATUSES = Object.freeze({submitted:'Esitatud',reviewing:'Läbivaatamisel',accepted:'Heaks kiidetud',rejected:'Tagasi lükatud',implemented:'Rakendatud'});
export const LIMITS=Object.freeze({bytes:20_000_000,pages:50,parts:300,proposals:500});
const fail=message=>{throw new Error(message);};
export const uid=()=>crypto.randomUUID();
export const stamp=()=>new Date().toISOString();
export const areaLabel=id=>AREAS.find(area=>area[0]===id)?.[1]||'Määramata';
const hasArea=id=>AREAS.some(area=>area[0]===id);
function text(value,name,max=4000){if(typeof value!=='string'||!value.trim()||value.trim().length>max)fail(`${name}: sisesta 1–${max} märki.`);return value.trim();}
export function validateBounds(bounds){
 if(!bounds||!['x','y','w','h'].every(k=>Number.isFinite(bounds[k])))fail('Protsessiosa asukoht on vigane.');
 if(bounds.x<0||bounds.y<0||bounds.w<.003||bounds.h<.003||bounds.x+bounds.w>1.001||bounds.y+bounds.h>1.001)fail('Märgi ala dokumendi lehekülje sisse.');
 return Object.fromEntries(['x','y','w','h'].map(k=>[k,bounds[k]]));
}
export function validateFile(name,size){
 if(!/\.(pdf|png|jpe?g)$/i.test(name))fail('Vali PDF, PNG või JPG.');
 if(!Number.isSafeInteger(size)||size<=0||size>LIMITS.bytes)fail('Fail peab olema kuni 20 MB ja sisaldama andmeid.');
 return /\.pdf$/i.test(name)?'pdf':'image';
}
export function createPart(doc,input,actor){
 if(!canManage(actor.role))fail('Protsessiosi haldab kvaliteedijuht.');
 if(doc.parts.length>=LIMITS.parts)fail('Ühes dokumendis saab olla kuni 300 protsessiosa.');
 if(!Number.isInteger(input.page)||input.page<1||input.page>doc.pages.length)fail('Lehekülge ei leitud.');
 if(!hasArea(input.area))fail('Vali valdkond.');
 return {id:uid(),page:input.page,label:text(input.label,'Protsessiosa nimi',400),area:input.area,bounds:validateBounds(input.bounds),kind:input.kind==='decision'?'decision':'activity',version:1,notes:[],createdAt:stamp()};
}
export function updatePart(doc,input,actor){
 if(!canManage(actor.role))fail('Protsessiosi haldab kvaliteedijuht.');
 const previous=doc.parts.find(part=>part.id===input.id);if(!previous)fail('Protsessiosa ei leitud.');
 if(!hasArea(input.area))fail('Vali valdkond.');
 const next={...previous,label:text(input.label,'Protsessiosa nimi',400),area:input.area,kind:input.kind==='decision'?'decision':'activity'};
 const changed=next.label!==previous.label||next.area!==previous.area||next.kind!==previous.kind;
 if(!changed)return doc;
 next.version++;
 return {...doc,version:doc.version+1,parts:doc.parts.map(part=>part.id===next.id?next:part),history:[...(doc.history||[]),{at:stamp(),actor:actor.name,action:'part_updated',partId:next.id,before:previous.label,after:next.label}]};
}
export function createProposal(doc,input,actor){
 if(!canPropose(actor.role))fail('Ettepaneku esitab töötaja või kliendi vaates.');
 const part=doc.parts.find(part=>part.id===input.partId);if(!part)fail('Vali protsessiosa.');
 if(part.archived||(!actor.canProposeAnyArea&&(part.area!==actor.area||part.area==='unassigned')))fail('Vali oma valdkonna aktiivne protsessiosa.');
 const type=input.type==='label'?'label':'general';
 return {id:uid(),docId:doc.id,partId:part.id,partLabel:part.label,area:part.area,author:text(actor.name,'Sinu nimi',100),authorRole:actor.role,title:text(input.title,'Ettepaneku pealkiri',160),problem:text(input.problem,'Probleem'),suggestion:text(input.suggestion,'Parandusettepanek'),benefit:text(input.benefit,'Oodatav kasu',1500),type,proposedLabel:type==='label'?text(input.proposedLabel,'Uus sammukirjeldus',400):'',basePartVersion:part.version,status:'submitted',createdAt:stamp(),events:[]};
}
export function reviewProposal(proposal,input,actor){
 if(!canManage(actor.role))fail('Otsuse teeb kvaliteedijuht.');
 const allowed={submitted:['reviewing','accepted','rejected'],reviewing:['accepted','rejected'],accepted:[],rejected:[],implemented:[]};
 if(!allowed[proposal.status]?.includes(input.status))fail('Seda olekumuutust ei saa teha.');
 const reason=input.status==='reviewing'?(input.reason||'Võetud läbivaatusele.'):text(input.reason,'Otsuse põhjendus');
 const thanks=input.status==='reviewing'?'':text(input.thanks,'Tagasiside ettepaneku esitajale',1500);
 const event={at:stamp(),actor:text(actor.name,'Ülevaataja nimi',100),status:input.status,reason,thanks,decisionMaker:String(input.decisionMaker||'').trim().slice(0,150)};
 return {...proposal,status:input.status,events:[...proposal.events,event]};
}
export function implementProposal(doc,proposal,note,actor){
 if(!canManage(actor.role))fail('Muudatuse rakendab kvaliteedijuht.');
 if(proposal.docId!==doc.id||proposal.status!=='accepted')fail('Rakendada saab selle dokumendi heakskiidetud ettepaneku.');
 const part=doc.parts.find(part=>part.id===proposal.partId);if(!part)fail('Protsessiosa ei leitud.');
 if(part.archived||proposal.needsRebase||part.version!==proposal.basePartVersion)fail('Protsessiosa on vahepeal muutunud või eemaldatud. Ära rakenda vana ettepanekut; koosta uuendatud ettepanek.');
 const implementation=text(note,'Rakendamise märkus',2000),at=stamp();
 const nextPart={...part,version:part.version+1,label:proposal.type==='label'?proposal.proposedLabel:part.label,notes:[...part.notes,{at,proposalId:proposal.id,text:implementation}]};
 const nextDoc={...doc,version:doc.version+1,parts:doc.parts.map(p=>p.id===part.id?nextPart:p),history:[...(doc.history||[]),{at,actor:actor.name,action:'proposal_implemented',proposalId:proposal.id,partId:part.id,before:part.label,after:nextPart.label,note:implementation}]};
 const nextProposal={...proposal,status:'implemented',events:[...proposal.events,{at,actor:actor.name,status:'implemented',reason:implementation,thanks:proposal.events.at(-1)?.thanks||'Aitäh panuse eest! Ettepanek on lisatud digitaalsesse protsessikaarti.',documentVersion:nextDoc.version}]};
 return {document:nextDoc,proposal:nextProposal};
}
export function visibleParts(doc,actor){return doc.parts.filter(part=>!part.archived&&(canManage(actor.role)||part.area===actor.area&&part.area!=='unassigned'));}
export function visibleProposals(proposals,doc,actor){return proposals.filter(p=>p.docId===doc.id&&(canManage(actor.role)||p.author===actor.name&&proposalRole(p)===actor.role));}

// Text positions are suggestions, never inferred process order or arrows.
export function textRegions(items,width,height){
 const rows=[];
 for(const item of items.filter(item=>item.text?.trim()).sort((a,b)=>a.y-b.y||a.x-b.x)){
  const last=rows.at(-1),gap=last?item.x-last.x-last.w:Infinity;
  if(last&&Math.abs(item.y-last.y)<Math.max(item.h,last.h)*.55&&gap>=-2&&gap<Math.max(18,item.h*2)){
   last.text+=' '+item.text;last.w=Math.max(last.w,item.x+item.w-last.x);last.h=Math.max(last.h,item.h);
  }else rows.push({...item,text:item.text.trim()});
 }
 return rows.filter(row=>row.text.length>=3&&row.text.length<=400).slice(0,150).map(row=>({label:row.text,bounds:validateBounds({x:Math.max(0,row.x/width-.006),y:Math.max(0,row.y/height-.004),w:Math.min(.99,Math.max(.025,row.w/width+.012),1-Math.max(0,row.x/width-.006)),h:Math.min(Math.max(.012,row.h/height+.008),1-Math.max(0,row.y/height-.004))})}));
}

export function validateBackup(value){
 if(value?.format!=='process-studio-local-pilot'||value.version!==1)fail('See ei ole kohaliku katseversiooni varukoopia.');
 const doc=value.document;
 if(!doc||typeof doc.id!=='string'||!doc.id||typeof doc.name!=='string'||!['pdf','image'].includes(doc.format)||!Array.isArray(doc.pages)||!doc.pages.length||doc.pages.length>LIMITS.pages||!Array.isArray(doc.parts)||doc.parts.length>LIMITS.parts||!Number.isSafeInteger(doc.version)||doc.version<1)fail('Varukoopia dokument on vigane.');
 if(doc.process&&validateProcess(doc.process).errors.length)fail('Varukoopia AI-skeem on vigane.');
 const ids=new Set();
 const validDate=value=>typeof value==='string'&&Number.isFinite(Date.parse(value));
 if(!validDate(doc.createdAt)||!Array.isArray(doc.history)||doc.history.length>10000)fail('Varukoopia dokumendi ajalugu on vigane.');
 for(const page of doc.pages){
  if(!Number.isFinite(page.width)||!Number.isFinite(page.height)||page.width<=0||page.height<=0||page.width>1_000_000||page.height>1_000_000||!Array.isArray(page.texts)||page.texts.length>6000)fail('Varukoopia lehekülg on vigane.');
  for(const item of page.texts)if(typeof item.text!=='string'||item.text.length>10000||!['x','y','w','h'].every(key=>Number.isFinite(item[key])))fail('Varukoopia tekstiplokk on vigane.');
 }
 for(const part of doc.parts){if(typeof part.id!=='string'||ids.has(part.id)||typeof part.label!=='string'||!part.label.trim()||part.label.length>400||!hasArea(part.area)||!Number.isInteger(part.page)||part.page<1||part.page>doc.pages.length||!Number.isSafeInteger(part.version)||part.version<1||!Array.isArray(part.notes))fail('Varukoopia protsessiosa on vigane.');validateBounds(part.bounds);ids.add(part.id);}
 for(const part of doc.parts){if(part.notes.length>1000||!part.notes.every(note=>typeof note.text==='string'&&note.text.length<=2000&&validDate(note.at)))fail('Varukoopia kinnitatud märkused on vigased.');}
 if(!Array.isArray(doc.connections)||doc.connections.length>2000||!doc.connections.every(link=>ids.has(link.from)&&ids.has(link.to)&&link.from!==link.to&&typeof link.label==='string'&&link.label.length<=120))fail('Varukoopia seosed on vigased.');
 if(!Array.isArray(value.proposals)||value.proposals.length>LIMITS.proposals||typeof value.fileBase64!=='string'||value.fileBase64.length>28_000_000)fail('Varukoopia on vigane või liiga suur.');
 const proposalIds=new Set();
 for(const p of value.proposals){if(typeof p.id!=='string'||proposalIds.has(p.id)||p.docId!==doc.id||!ids.has(p.partId)||!Object.hasOwn(STATUSES,p.status)||!['label','general'].includes(p.type)||!Number.isSafeInteger(p.basePartVersion)||p.basePartVersion<1||!Array.isArray(p.events)||!hasArea(p.area))fail('Varukoopia ettepanek on vigane.');for(const field of ['author','title','problem','suggestion','benefit'])text(p[field],field,5000);if(p.type==='label')text(p.proposedLabel,'Uus kirjeldus',400);proposalIds.add(p.id);}
 for(const p of value.proposals){if(p.authorRole!==undefined&&!canPropose(p.authorRole))fail('Varukoopia ettepaneku esitaja roll on vigane.');if(!validDate(p.createdAt)||p.events.length>1000||!p.events.every(event=>validDate(event.at)&&Object.hasOwn(STATUSES,event.status)&&typeof event.actor==='string'&&typeof event.reason==='string'))fail('Varukoopia otsuste ajalugu on vigane.');if(p.status!=='submitted'&&p.events.at(-1)?.status!==p.status)fail('Varukoopia ettepaneku olek ei vasta ajaloole.');}
 if(value.fileBase64.length%4||! /^[A-Za-z0-9+/]*={0,2}$/.test(value.fileBase64))fail('Varukoopia algfail on vigane.');
 return value;
}
