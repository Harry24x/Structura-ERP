import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
import {createPart,createProposal} from '../../public/quality/core.mjs';
const manager={role:'manager',name:'A'},employee={role:'employee',name:'A',area:'purchasing'};
export function fixture(){
 const sqlite=new DatabaseSync(':memory:');for(const file of readdirSync(new URL('../../drizzle/',import.meta.url)).filter(f=>f.endsWith('.sql')))sqlite.exec(readFileSync(new URL('../../drizzle/'+file,import.meta.url),'utf8'));
 const prepare=sql=>{let args=[];return {bind(...values){args=values;return this;},async run(){const r=sqlite.prepare(sql).run(...args);return {meta:{changes:Number(r.changes)},results:[]};},async all(){return {results:sqlite.prepare(sql).all(...args)};},async first(){return sqlite.prepare(sql).get(...args)||null;},async execute(){return /^(SELECT|PRAGMA)/i.test(sql)?this.all():this.run();}};};
 const db={prepare,async batch(statements){sqlite.exec('BEGIN IMMEDIATE');try{const result=[];for(const stmt of statements)result.push(await stmt.execute());sqlite.exec('COMMIT');return result;}catch(e){sqlite.exec('ROLLBACK');throw e;}}};
 const objects=new Map(),bucket={async put(key,value){objects.set(key,new Uint8Array(value));},async delete(keys){for(const key of Array.isArray(keys)?keys:[keys])objects.delete(key);},async get(key){return objects.has(key)?{body:objects.get(key)}:null;}};
 const doc={id:'document-1',name:'Mainsten · Ostuprotsess',format:'image',mime:'image/png',createdAt:new Date().toISOString(),version:1,pages:[{width:600,height:900,texts:[]}],parts:[],connections:[],history:[]};doc.parts.push(createPart(doc,{page:1,label:'Kontrolli tellimust',area:'purchasing',bounds:{x:.1,y:.1,w:.5,h:.1}},manager));
 const file=new File([new Uint8Array([137,80,78,71,13,10,26,10])],'source.png',{type:'image/png'});
 const proposal=createProposal(doc,{partId:doc.parts[0].id,title:'Täpsusta puuduv info',problem:'Info võib puududa',suggestion:'Täpsusta ja kontrolli uuesti',benefit:'Selgem töö',type:'general'},employee);
 return {db,bucket,objects,doc,file,proposal};
}