import {validateBackup,LIMITS} from '../public/quality/core.mjs';
import {accountRole} from './account-roles.mjs';

export class AccountStoreError extends Error{
 constructor(message,status=400,code='INVALID_WORKSPACE'){super(message);this.status=status;this.code=code;}
}
const fail=(message,status=400,code)=>{throw new AccountStoreError(message,status,code);};
const id=value=>typeof value==='string'&&/^[A-Za-z0-9_-]{1,160}$/.test(value);
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const prefix=(old,next)=>Array.isArray(next)&&old.every((item,index)=>same(item,next[index]));
function requireOwner(owner){if(!owner?.userId)fail('Logi oma konto kasutamiseks sisse.',401,'SIGN_IN_REQUIRED');}
function requireStorage(db,bucket){if(!db||!bucket)fail('Konto salvestus ei ole praegu kättesaadav. Varasem töö on alles.',503,'STORAGE_UNAVAILABLE');}

export async function readAccount(db,bucket,owner){
 requireOwner(owner);requireStorage(db,bucket);
 await db.prepare('INSERT INTO studio_workspaces(owner_id,revision,last_operation,updated_at) VALUES(?,0,?,?) ON CONFLICT(owner_id) DO NOTHING').bind(owner.userId,'',new Date().toISOString()).run();
 // A single read batch observes one consistent revision plus its records.
 const result=await db.batch([
  db.prepare('SELECT revision FROM studio_workspaces WHERE owner_id=?').bind(owner.userId),
  db.prepare('SELECT store,payload FROM studio_records WHERE owner_id=? ORDER BY store,record_id').bind(owner.userId),
 ]);
 const records=result[1].results.map(row=>({store:row.store,value:JSON.parse(row.payload)}));
 return {revision:result[0].results[0].revision,user:{id:owner.userId,name:owner.displayName,email:owner.email,role:accountRole(owner)},
  permissions:{manage:true,propose:true},documents:records.filter(r=>r.store==='documents').map(r=>r.value),
  proposals:records.filter(r=>r.store==='proposals').map(r=>r.value),files:records.filter(r=>r.store==='files').map(r=>({id:r.value.id,mime:r.value.mime,size:r.value.size,version:r.value.key.split('/').at(-1)}))};
}

export async function commitAccount(db,bucket,owner,input,uploads=new Map(),delegation=null){
 requireOwner(owner);requireStorage(db,bucket);
 if(!Number.isSafeInteger(input?.baseRevision)||input.baseRevision<0||!Array.isArray(input.records)||!input.records.length||input.records.length>1000)fail('Salvestamise andmed on vigased.');
 const current=await readAccount(db,bucket,owner);
 if(current.revision!==input.baseRevision)fail('Tööruum muutus teises aknas. Värskenda vaadet ja proovi uuesti. Sinu pooleli tekst jäi alles.',409,'REVISION_CONFLICT');
 const documents=new Map(current.documents.map(d=>[d.id,d])),proposals=new Map(current.proposals.map(p=>[p.id,p]));
 const keys=new Set(),records=input.records.map(record=>{
  if(!['documents','proposals','files'].includes(record?.store)||!id(record.value?.id))fail('Kirje tunnus on vigane.');
  const key=record.store+':'+record.value.id;if(keys.has(key))fail('Korduv kirje.');keys.add(key);
  return {store:record.store,value:structuredClone(record.value)};
 });
 if(input.expected!==undefined&&!Array.isArray(input.expected))fail('Salvestamise kontrollandmed on vigased.');
 for(const expected of input.expected||[]){const d=documents.get(expected.id);if(!d||d.version!==expected.version||(d.revisionId||null)!==(expected.revisionId||null)||d.process?.version!==expected.process?.version)fail('Protsessikaart on vahepeal muutunud. Ava uusim kaart.',409,'REVISION_CONFLICT');}
 for(const r of records){
  const old=(r.store==='documents'?documents:proposals).get(r.value.id);
  if(r.store==='documents'){
   if(old&&(!prefix(old.history||[],r.value.history)||r.value.version<old.version||(old.process&&(!r.value.process||r.value.process.version<old.process.version))))fail('Varasemat protsessi ajalugu ei saa üle kirjutada.',409,'HISTORY_CONFLICT');
   documents.set(r.value.id,r.value);
  }
  if(r.store==='proposals'){
   if(old){
    if(!prefix(old.events,r.value.events))fail('Varasemaid otsuseid ei saa üle kirjutada.',409,'HISTORY_CONFLICT');
    // A legacy copy may move to its retained original, but authored facts stay immutable.
    for(const field of ['author','authorRole','authorUserId','grantId','title','problem','suggestion','benefit','createdAt','type','proposedLabel'])if(!same(old[field],r.value[field]))fail('Esitatud ettepaneku algteksti ei saa muuta.',409,'HISTORY_CONFLICT');
    if(old.docId!==r.value.docId&&documents.get(old.docId)?.supersededBy!==r.value.docId)fail('Ettepanekut ei saa teise protsessi tõsta.');
   }
   proposals.set(r.value.id,r.value);
  }
 }
 if(documents.size>150||proposals.size>5000)fail('Konto katseversiooni mahu piir on täis.');
 for(const d of documents.values()){
  const list=[...proposals.values()].filter(p=>p.docId===d.id);
  try{validateBackup({format:'process-studio-local-pilot',version:1,document:d,proposals:list,fileBase64:'YQ=='});}catch(error){fail(error.message);}
  if(JSON.stringify(d).length>1_000_000)fail('Protsessikaardi tekst on salvestamiseks liiga suur.');
 }
 for(const p of proposals.values())if(!documents.has(p.docId))fail('Ettepaneku protsess puudub.');
 const staged=[];
 try{
  let totalBytes=0;for(const r of records)if(r.store==='files'){
   const file=uploads.get(r.value.id),d=documents.get(r.value.id);
   if(!file||!d||file.size<=0||file.size>LIMITS.bytes)fail('Algfail puudub või on liiga suur.');
   totalBytes+=file.size;if(totalBytes>24_000_000)fail('Salvesta korraga kuni 24 MB algfaile.');
   const bytes=new Uint8Array(await file.arrayBuffer());
   const pdf=new TextDecoder().decode(bytes.slice(0,5))==='%PDF-',png=bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71,jpg=bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
   if(d.format==='pdf'?!pdf:!png&&!jpg)fail('Algfaili sisu ei vasta failitüübile.');
   const key='accounts/'+encodeURIComponent(owner.userId)+'/'+crypto.randomUUID(),mime=pdf?'application/pdf':png?'image/png':'image/jpeg';
   await bucket.put(key,bytes,{httpMetadata:{contentType:mime}});staged.push(key);
   r.value={id:d.id,key,mime,size:bytes.length};
  }
  const existingFiles=new Set(current.files.map(f=>f.id));for(const d of documents.values())if(!existingFiles.has(d.id)&&!records.some(r=>r.store==='files'&&r.value.id===d.id))fail('Protsessi algfaili ei leitud.');
  const operation=crypto.randomUUID(),now=new Date().toISOString();
  // Check a delegated submission inside the same transaction as its write, including revocation races.
  const guard=delegation?' AND EXISTS(SELECT 1 FROM studio_grants WHERE id=? AND owner_id=? AND user_id=? AND revoked_at IS NULL)':'';
  const statements=[db.prepare('UPDATE studio_workspaces SET revision=revision+1,last_operation=?,updated_at=? WHERE owner_id=? AND revision=?'+guard).bind(operation,now,owner.userId,input.baseRevision,...(delegation?[delegation.grantId,owner.userId,delegation.userId]:[]))];
  for(const r of records)statements.push(db.prepare('INSERT INTO studio_records(owner_id,store,record_id,payload,updated_at) SELECT ?,?,?,?,? WHERE EXISTS(SELECT 1 FROM studio_workspaces WHERE owner_id=? AND last_operation=?) ON CONFLICT(owner_id,store,record_id) DO UPDATE SET payload=excluded.payload,updated_at=excluded.updated_at').bind(owner.userId,r.store,r.value.id,JSON.stringify(r.value),now,owner.userId,operation));
  const result=await db.batch(statements);
  if(result[0].meta.changes!==1)fail('Teine aken salvestas enne sind. Värskenda vaadet ja proovi uuesti.',409,'REVISION_CONFLICT');
  return {revision:input.baseRevision+1,files:records.filter(r=>r.store==='files').map(r=>({id:r.value.id,mime:r.value.mime,size:r.value.size,version:r.value.key.split('/').at(-1)}))};
 }catch(error){if(staged.length)await bucket.delete(staged).catch(()=>{});throw error;}
}

export async function accountFile(db,bucket,owner,documentId){
 requireOwner(owner);requireStorage(db,bucket);if(!id(documentId))fail('Faili ei leitud.',404);
 const row=await db.prepare('SELECT payload FROM studio_records WHERE owner_id=? AND store=? AND record_id=?').bind(owner.userId,'files',documentId).first();
 if(!row)fail('Faili ei leitud.',404);const meta=JSON.parse(row.payload),object=await bucket.get(meta.key);
 if(!object)fail('Faili ei leitud.',404);return {object,mime:meta.mime};
}
