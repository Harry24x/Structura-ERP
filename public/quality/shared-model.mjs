import {reconcileExplorer} from './lib/process-explorer.mjs';
import {validateProcess,diagramLayout,toSVG} from './lib/process.mjs';
const toArea=id=>({finance:'accounting',unknown:'unassigned'})[id]||id;
const fromArea=id=>({accounting:'finance',unassigned:'unknown',digital:'other'})[id]||id;
export function partsFromProcess(process,page=1,regions=[],crop={x:0,y:0,w:1,h:1}){
 const report=validateProcess(process);if(report.errors.length)throw new Error(report.errors.join(' '));
 const layout=diagramLayout(process),dimensions=toSVG(process).match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/),width=Number(dimensions[1]),height=Number(dimensions[2]);
 return process.nodes.filter(n=>['activity','decision'].includes(n.type)).map((n,i)=>{
  const box=layout.nodes.find(b=>b.id===n.id),region=regions.find(r=>r.nodeId===n.id),located=region&&region.w*crop.w>=.003&&region.h*crop.h>=.003,r=located?region:{x:(box.x-box.w/2)/width,y:box.y/height,w:box.w/width,h:box.h/height};
  if(!['x','y','w','h'].every(k=>Number.isFinite(r[k]))||r.x<0||r.y<0||r.w<=0||r.h<=0||r.x+r.w>1.002||r.y+r.h>1.002)throw new Error('Protsessiosa asukoht on vigane.');
  return {id:crypto.randomUUID(),nodeId:n.id,page,label:n.label,area:toArea(n.businessArea),kind:n.type,version:1,notes:[],suggested:!n.areaReviewed,...(regions.length&&!located?{diagramOnly:true}:{}),createdAt:new Date().toISOString(),bounds:{x:crop.x+r.x*crop.w,y:crop.y+r.y*crop.h,w:Math.min(r.w*crop.w,1-(crop.x+r.x*crop.w)),h:Math.min(r.h*crop.h,1-(crop.y+r.y*crop.h))}};
 });
}
export function syncProcess(doc){
 if(!doc.process)return doc;
 const notes=doc.parts.flatMap(p=>p.notes.map(note=>('Kinnitatud parendus ['+(p.nodeId||p.id)+':'+note.proposalId+']: '+note.text).slice(0,2000))).filter(note=>!doc.process.notes.includes(note));
 const changes=doc.parts.filter(p=>p.nodeId).filter(p=>{const n=doc.process.nodes.find(n=>n.id===p.nodeId);return n&&(n.label!==p.label||n.businessArea!==fromArea(p.area)||n.type!==p.kind||!!n.areaReviewed!==(!p.suggested&&p.area!=='unassigned')); });
 if(!changes.length&&!notes.length)return doc;
 const process=structuredClone(doc.process);process.version++;process.reviewed=false;
 if(notes.length){if(process.notes.length+notes.length>30)throw new Error('Skeemi märkuste piir on täis. Koosta struktuurimuudatus tekstigeneraatoris.');process.notes.push(...notes.map(n=>n.slice(0,2000)));process.mode='to-be';}
 for(const p of changes){const n=process.nodes.find(n=>n.id===p.nodeId);if(p.label.length>180)throw new Error('AI-skeemi sammu nimi võib olla kuni 180 märki.');
  if(n.label!==p.label||n.type!==p.kind){process.source+='\nKinnitatud muudatus: '+p.label;n.evidence=p.label;process.mode='to-be';}
  n.label=p.label;n.type=p.kind;n.businessArea=fromArea(p.area);n.areaReviewed=!p.suggested&&p.area!=='unassigned';n.areaReason='Inimese määratud valdkond.';
 }
 reconcileExplorer(process,doc.process);
 const errors=validateProcess(process).errors;if(errors.length)throw new Error(errors.join(' '));
 return {...doc,process};
}
