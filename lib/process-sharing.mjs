import {AccountStoreError,readAccount,commitAccount} from './account-store.mjs';
import {createProposal} from '../public/quality/core.mjs';
import {stepSignature,mappingFor} from './process-explorer.mjs';
import {catalogMappingFor} from './dynamics-catalog.mjs';

const fail=(message,status=400,code='INVALID_SHARE')=>{throw new AccountStoreError(message,status,code);};
const key=value=>typeof value==='string'&&/^[A-Za-z0-9_-]{1,160}$/.test(value);
const normalize=value=>typeof value==='string'?value.trim().toLowerCase():'';
function access(db,user){if(!user?.userId)fail('Logi oma ChatGPT kontoga sisse.',401,'SIGN_IN_REQUIRED');if(!db)fail('Jagamise salvestus ei ole kättesaadav.',503);}
const actorName=user=>(user.displayName||user.email||'Kasutaja').slice(0,100);
const event=(db,g,user,action,at)=>db.prepare('INSERT INTO studio_grant_events(id,grant_id,owner_id,actor_id,action,at) VALUES(?,?,?,?,?,?)').bind(crypto.randomUUID(),g.id,g.owner_id,user.userId,action,at);

export async function ownerGrants(db,user){
 access(db,user);const r=await db.prepare('SELECT id,document_id,part_id,email,user_id,recipient_role,scope,created_at,revoked_at FROM studio_grants WHERE owner_id=? ORDER BY created_at DESC LIMIT 1000').bind(user.userId).all();
 return r.results.map(g=>({id:g.id,docId:g.document_id,partId:g.part_id,email:g.email,recipientRole:g.recipient_role,scope:g.scope,claimed:!!g.user_id,createdAt:g.created_at,revokedAt:g.revoked_at}));
}
export async function grantPart(db,bucket,user,input){
 access(db,user);const email=normalize(input.email);if(!email||email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))fail('Sisesta saaja ChatGPT konto e-posti aadress.');
 const recipientRole=input.recipientRole??'employee',scope=input.scope??'part';
 if(!['employee','client'].includes(recipientRole))fail('Vali saajaks Digmatixi töötaja või klient.');
 if(!['part','process'].includes(scope))fail('Vali jagatav samm või kogu protsess.');
 if(email===normalize(user.email))fail('Sinu enda kontol on omaniku ligipääs juba olemas.');
 const account=await readAccount(db,bucket,user),doc=account.documents.find(d=>d.id===input.docId&&!d.supersededBy),part=doc?.parts.find(p=>p.id===input.partId&&!p.archived);
 if(!doc||(scope==='part'?!part:!doc.parts.some(p=>!p.archived)))fail('Vali oma konto aktiivne protsessiosa.',404);
 const partId=scope==='process'?'__process__':part.id;
 const existing=await db.prepare('SELECT id,recipient_role FROM studio_grants WHERE owner_id=? AND document_id=? AND part_id=? AND email=? AND scope=? AND revoked_at IS NULL').bind(user.userId,doc.id,partId,email,scope).first();
 if(existing){if(existing.recipient_role!==recipientRole)fail('Selle ligipääsu saaja roll on teine. Lõpeta senine ligipääs ja jaga soovitud rolliga uuesti.');return {id:existing.id,existing:true};}
 const count=await db.prepare('SELECT COUNT(*) AS count FROM studio_grants WHERE owner_id=? AND revoked_at IS NULL').bind(user.userId).first();if(count.count>=500)fail('Aktiivsete jagamiste piir on täis. Lõpeta varasemad mittevajalikud ligipääsud.');
 const g={id:crypto.randomUUID(),owner_id:user.userId},at=new Date().toISOString();
 await db.batch([
  db.prepare('INSERT INTO studio_grants(id,owner_id,document_id,part_id,email,user_id,owner_name,recipient_role,scope,created_at,revoked_at) VALUES(?,?,?,?,?,NULL,?,?,?,?,NULL)').bind(g.id,user.userId,doc.id,partId,email,actorName(user),recipientRole,scope,at),
  event(db,g,user,'granted',at),
 ]);return {id:g.id,existing:false};
}
export async function revokePart(db,user,grantId){
 access(db,user);if(!key(grantId))fail('Jagamist ei leitud.',404);
 const g=await db.prepare('SELECT id,owner_id,revoked_at FROM studio_grants WHERE id=? AND owner_id=?').bind(grantId,user.userId).first();if(!g)fail('Jagamist ei leitud.',404);if(g.revoked_at)return;
 const at=new Date().toISOString();await db.batch([db.prepare('UPDATE studio_grants SET revoked_at=? WHERE id=? AND owner_id=? AND revoked_at IS NULL').bind(at,g.id,user.userId),event(db,g,user,'revoked',at)]);
}
async function bindRecipient(db,user){
 // Sites supplies the signed-in email. Bind invitations once, then authorize by stable Site user ID.
 await db.prepare('UPDATE studio_grants SET user_id=? WHERE email=? AND user_id IS NULL AND revoked_at IS NULL').bind(user.userId,normalize(user.email)).run();
}
function projection(g,d,p){
 const node=d.process?.nodes.find(n=>n.id===p.nodeId),role=d.process?.roles.find(r=>r.id===node?.roleId)?.label;
 return {id:g.scope==='process'?g.id+':'+p.id:g.id,grantId:g.id,scope:g.scope,recipientRole:g.recipient_role,docId:d.id,processName:d.name,ownerName:g.owner_name,part:{id:p.id,nodeId:p.nodeId||null,label:p.label,area:p.area,kind:p.kind,version:p.version,role:role||null,instructions:(p.notes||[]).map(n=>n.text)}};
}
// A whole-process invitation exposes the diagram, never the uploaded file,
// source evidence, internal metadata, account history or other authors' proposals.
export function sharedDiagram(process){
 if(!process)return null;
 const fields=['id','type','label','roleId','systemId','execution','humanDecision','businessArea','areaReviewed'];
 const diagram={schemaVersion:process.schemaVersion,title:process.title,mode:process.mode,version:process.version,source:'',notes:[],questions:[],
  roles:process.roles.map(({id,label})=>({id,label})),systems:(process.systems||[]).map(({id,label})=>({id,label})),
  nodes:process.nodes.map(n=>({...Object.fromEntries(fields.filter(k=>Object.hasOwn(n,k)).map(k=>[k,n[k]])),evidence:''})),
  edges:process.edges.map(({from,to,label})=>({from,to,label})),
  explorer:{schemaVersion:1,groups:(process.explorer?.groups||[]).map(({id,label,nodeIds,confirmed})=>({id,label,nodeIds:[...nodeIds],confirmed})),bcMappings:[]}};
 diagram.explorer.bcMappings=(process.explorer?.bcMappings||[]).map(m=>({nodeId:m.nodeId,referenceId:m.referenceId,status:mappingFor(process,m.nodeId).status,note:m.note,signature:stepSignature(diagram,m.nodeId)}));
 if(process.explorer?.catalogMappings)diagram.explorer.catalogMappings=process.explorer.catalogMappings.map(m=>({nodeId:m.nodeId,entryId:m.entryId,status:catalogMappingFor(process,m.nodeId).status,note:m.note,catalogVersion:m.catalogVersion,signature:stepSignature(diagram,m.nodeId)}));
 return diagram;
}
export async function sharedParts(db,user){
 access(db,user);await bindRecipient(db,user);
 const rows=(await db.prepare("SELECT g.*,r.payload FROM studio_grants g JOIN studio_records r ON r.owner_id=g.owner_id AND r.store='documents' AND r.record_id=g.document_id WHERE g.user_id=? AND g.revoked_at IS NULL ORDER BY g.created_at DESC LIMIT 500").bind(user.userId).all()).results;
 const processes=[],parts=rows.flatMap(g=>{const d=JSON.parse(g.payload);if(d.supersededBy)return [];const active=d.parts.filter(p=>!p.archived&&(g.scope==='process'||p.id===g.part_id));
  if(g.scope==='process'&&active.length&&d.process)processes.push({grantId:g.id,process:sharedDiagram(d.process)});
  return active.map(p=>projection(g,d,p));}),allowed=new Set(parts.map(g=>g.docId+':'+g.part.id+':'+g.grantId));
 // SQL selects this user's authored proposals only. No source files, graph, other steps or colleagues' proposals leave the server.
 const pr=(await db.prepare("SELECT r.payload,g.document_id,json_extract(r.payload,'$.partId') AS part_id,g.id AS grant_id FROM studio_grants g JOIN studio_records r ON r.owner_id=g.owner_id AND r.store='proposals' AND json_extract(r.payload,'$.grantId')=g.id AND json_extract(r.payload,'$.docId')=g.document_id AND (g.scope='process' OR json_extract(r.payload,'$.partId')=g.part_id) WHERE g.user_id=? AND g.revoked_at IS NULL AND json_extract(r.payload,'$.authorUserId')=? ORDER BY r.updated_at DESC LIMIT 1000").bind(user.userId,user.userId).all()).results;
 const proposals=pr.filter(r=>allowed.has(r.document_id+':'+r.part_id+':'+r.grant_id)).map(r=>{
  const p=JSON.parse(r.payload);return {id:p.id,grantId:p.grantId,partId:p.partId,authorRole:p.authorRole||'employee',partLabel:p.partLabel,title:p.title,problem:p.problem,suggestion:p.suggestion,benefit:p.benefit,status:p.status,createdAt:p.createdAt,basePartVersion:p.basePartVersion,events:p.events.map(e=>({at:e.at,actor:e.actor,status:e.status,reason:e.reason,thanks:e.thanks||''}))};
 });
 return {user:{name:actorName(user),email:user.email},parts,processes,proposals};
}
export async function submitSharedProposal(db,bucket,user,input){
 access(db,user);if(!key(input.grantId))fail('Jagatud osa ei leitud.',404);await bindRecipient(db,user);
 const g=await db.prepare('SELECT * FROM studio_grants WHERE id=? AND user_id=? AND revoked_at IS NULL').bind(input.grantId,user.userId).first();if(!g)fail('Selle protsessiosa ligipääs puudub või on lõpetatud.',403,'SHARE_REVOKED');
 const owner={userId:g.owner_id,displayName:g.owner_name},account=await readAccount(db,bucket,owner),doc=account.documents.find(d=>d.id===g.document_id&&!d.supersededBy),part=doc?.parts.find(p=>p.id===(g.scope==='process'?input.partId:g.part_id)&&!p.archived);
 if(!part)fail('Protsessiosa pole enam aktiivne.',403,'SHARE_REVOKED');
 if(input.partVersion!==part.version)fail('Sammu kirjeldus on vahepeal muutunud. Vaata uus kirjeldus üle ja esita säilinud mustand uuesti.',409,'PART_CHANGED');
 let proposal;try{proposal=createProposal(doc,{title:input.title,problem:input.problem,suggestion:input.suggestion,benefit:input.benefit,type:'general',partId:part.id},{role:g.recipient_role,name:actorName(user),area:part.area,canProposeAnyArea:true});}catch(e){fail(e.message);}
 proposal.authorUserId=user.userId;proposal.grantId=g.id;
 await commitAccount(db,bucket,owner,{baseRevision:account.revision,expected:[doc],records:[{store:'proposals',value:proposal}]},new Map(),{grantId:g.id,userId:user.userId});
 return {id:proposal.id};
}
