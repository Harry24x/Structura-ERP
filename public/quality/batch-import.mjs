import {validateProcess} from './lib/process.mjs';
import {partsFromProcess} from './shared-model.mjs';

export async function sourceHash(blob){
 const bytes=await crypto.subtle.digest('SHA-256',await blob.arrayBuffer());
 return [...new Uint8Array(bytes)].map(n=>n.toString(16).padStart(2,'0')).join('');
}
export const pendingImport=d=>d.intake?.kind==='image-batch'&&['pending','failed'].includes(d.intake.state)&&!d.process&&!d.parts.length&&!d.history.length;
export function findSource(documents,hash){return documents.find(d=>d.intake?.sha256===hash);}
export function importedDraft(document,result,actor){
 // Only untouched, explicitly queued new cards can receive a batch draft.
 if(!pendingImport(document))throw new Error('See protsess on juba kasutusel. Hulgiimport ei kirjuta seda üle.');
 const process=structuredClone(result.draft),errors=validateProcess(process).errors;
 if(errors.length)throw new Error(errors.join(' '));
 if(process.mode!==document.intake.mode)throw new Error('AI protsessi vaade ei vasta valitud allikale.');
 process.reviewed=false;
 const parts=partsFromProcess(process,1,result.regions),connections=process.edges.flatMap(e=>{
  const from=parts.find(p=>p.nodeId===e.from),to=parts.find(p=>p.nodeId===e.to);
  return from&&to?[{id:crypto.randomUUID(),from:from.id,to:to.id,label:e.label}]:[];
 });
 return {...document,version:document.version+1,process,parts,connections,
  analysis:{page:1,crop:{x:0,y:0,w:1,h:1},warnings:result.warnings||[]},
  intake:{...document.intake,state:'ready',error:'',finishedAt:new Date().toISOString()},
  history:[{at:new Date().toISOString(),actor,action:'image_digitalized',sourceSha256:document.intake.sha256}]};
}
export function importScope(document){
 return `Digitaliseeri kogu protsess allikast ${document.intake.sourceName}. ${document.intake.mode==='to-be'?'See on WISH TO-BE tulevikuvisioon, mitte kinnitatud tänane töökorraldus.':'See on ajalooline DigiMK AS-IS allikas, mitte kinnitus tänase töökorralduse kohta.'} Säilita kõik selgelt nähtavad protsessisammud, otsused, tagasisuunad ja tulemid. Väärtusahela korral loe põhivoo protsessid tegevusteks; dokumentide, süsteemide ja vastutajate seoseid ära muuda tööjärjekorra noolteks. Legend ja kommentaarid ei ole sammud. Kirjuta ebaselged seosed ja puuduvad vastutajad küsimustesse. Ära lisa tüüpilisi samme oma teadmistest.`;
}
