import {reconcileExplorer} from './lib/process-explorer.mjs';
import {validateProcess} from './lib/process.mjs';
import {partsFromProcess} from './shared-model.mjs';

export function originForDocument(doc){
 if(!doc?.process||doc.supersededBy)throw new Error('Ava selle protsessi aktiivne kaart.');
 return {documentId:doc.id,documentVersion:doc.version,revisionId:doc.revisionId||null,processVersion:doc.process.version};
}
export function assertOrigin(doc,origin){
 if(!doc||!origin||doc.id!==origin.documentId||doc.supersededBy||doc.version!==origin.documentVersion||(doc.revisionId||null)!==origin.revisionId||doc.process?.version!==origin.processVersion)throw new Error('Protsessikaart on vahepeal muutunud. Ava parendusruumis uusim kaart ja vii see uuesti generaatorisse. Senist tööd ei kirjutatud üle.');
}
const taskSignature=(process,id)=>{
 const node=process.nodes.find(n=>n.id===id);if(!node)return null;
 // Unrelated notes and other tasks do not invalidate an unchanged task proposal.
 const role=process.roles.find(r=>r.id===node.roleId)?.label||null,system=process.systems?.find(s=>s.id===node.systemId)?.label||null;
 return JSON.stringify({type:node.type,label:node.label,role,system,execution:node.execution,humanDecision:node.humanDecision,businessArea:node.businessArea,edges:process.edges.filter(e=>e.from===id||e.to===id).map(e=>[e.from,e.to,e.label]).sort()});
};
export function updateFromGenerator(doc,process,origin,{actor='Kvaliteedijuht',at=new Date().toISOString()}={}){
 assertOrigin(doc,origin);
 process=reconcileExplorer(structuredClone(process),process);
 const errors=validateProcess(process).errors;if(errors.length)throw new Error(errors.join(' '));
 if(process.version<doc.process.version)throw new Error('Generaatoris on kaardist vanem skeem. Ava uusim kaart uuesti generaatoris.');
 if(JSON.stringify(process)===JSON.stringify(doc.process))return {document:doc,changed:false};
 const generated=partsFromProcess(process),matched=new Set(),parts=generated.map(part=>{
  const old=doc.parts.find(p=>p.nodeId===part.nodeId);
  if(!old)return {...part,diagramOnly:true};
  matched.add(old.id);const changed=old.archived||taskSignature(doc.process,old.nodeId)!==taskSignature(process,part.nodeId);
  return {...old,label:part.label,kind:part.kind,area:part.area,suggested:part.suggested,archived:false,version:old.version+(changed?1:0)};
 });
 for(const old of doc.parts)if(!matched.has(old.id))parts.push(old.nodeId?{...old,archived:true,version:old.version+(old.archived?0:1)}:{...old});
 if(parts.length>300)throw new Error('Protsessi sammude ja ajalooliste sammude piir on täis. Senine kaart jäi muutmata.');
 const connections=process.edges.flatMap(e=>{const from=parts.find(p=>!p.archived&&p.nodeId===e.from),to=parts.find(p=>!p.archived&&p.nodeId===e.to);return from&&to?[{id:`${e.from}_${e.to}_${connectionsKey(e.label)}`,from:from.id,to:to.id,label:e.label}]:[];});
 const event={action:'generator_updated',at,actor,beforeVersion:doc.version,afterVersion:doc.version+1,processVersion:process.version,beforeProcess:structuredClone(doc.process),beforeParts:structuredClone(doc.parts),beforeConnections:structuredClone(doc.connections||[])};
 return {changed:true,document:{...doc,version:doc.version+1,process:structuredClone(process),parts,connections,aiCandidate:null,roundtripEstablished:true,history:[...(doc.history||[]),event]}};
}
const connectionsKey=text=>encodeURIComponent(text).slice(0,180);

// Explicitly chosen legacy copies can be consolidated without deleting data.
export function mergeGeneratorCopy(target,copy,proposals,origin,options={}){
 if(target.id===copy.id||!copy.process||copy.supersededBy)throw new Error('Vali teine aktiivne protsessikaart.');
 const updated=updateFromGenerator(target,copy.process,origin,options).document;
 const next=structuredClone(updated),partMap=new Map();
 for(const part of copy.parts){
  let existing=part.nodeId?next.parts.find(p=>p.nodeId===part.nodeId):null;
  if(!existing){existing={...structuredClone(part),diagramOnly:true,archived:!copy.process.nodes.some(n=>n.id===part.nodeId)};next.parts.push(existing);}
  partMap.set(part.id,existing.id);
  for(const note of part.notes||[])if(!existing.notes.some(n=>n.proposalId===note.proposalId&&n.at===note.at&&n.text===note.text))existing.notes.push(structuredClone(note));
 }
 if(next.parts.length>300)throw new Error('Ajalooliste sammude piir on täis. Kaardid jäid muutmata.');
 const migrated=proposals.filter(p=>p.docId===copy.id).map(p=>({...p,docId:target.id,partId:partMap.get(p.partId),migratedFromDocId:p.docId}));
 // A migrated pending proposal must be reviewed against the canonical task version.
 for(const p of migrated)if(['submitted','reviewing','accepted'].includes(p.status))p.needsRebase=true;
 next.roundtripEstablished=true;next.history=[...(next.history||[]),{action:'generator_copy_linked',at:options.at||new Date().toISOString(),actor:options.actor||'Kvaliteedijuht',sourceDocumentId:copy.id,sourceHistory:structuredClone(copy.history||[])}];
 if(next.version===target.version)next.version++;
 return {document:next,copy:{...copy,supersededBy:target.id,version:copy.version+1},proposals:migrated};
}
