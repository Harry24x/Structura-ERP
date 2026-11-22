import {readFile,readdir} from 'node:fs/promises';
import {parseEnv} from 'node:util';
import path from 'node:path';

// Values stay in memory. Never print a credential, matching line or file contents.
const candidates=[];
for(const file of ['.env.local','.env']){
 try{const parsed=parseEnv(await readFile(file,'utf8'));for(const [name,value] of Object.entries(parsed))if(/KEY|SECRET|TOKEN/.test(name)&&value)candidates.push(value);}
 catch(error){if(error.code!=='ENOENT')throw error;}
}
for(const name of ['OPENAI_API_KEY','GEMINI_API_KEY'])if(process.env[name])candidates.push(process.env[name]);
let count=0;
async function scan(directory){
 for(const item of await readdir(directory,{withFileTypes:true})){
  const target=path.join(directory,item.name);
  if(item.isSymbolicLink())throw new Error('Build contains a symlink; inspect it before publication.');
  if(item.isDirectory()){await scan(target);continue;}
  if(!item.isFile())continue;
  count++;const bytes=await readFile(target);
  if(candidates.some(value=>bytes.includes(Buffer.from(value)))||/sk-(?:proj-)?[A-Za-z0-9_-]{24,}|AIza[0-9A-Za-z_-]{35}/.test(bytes.toString('utf8')))throw new Error('Credential-like material found in build output. Publication blocked.');
  if(/^\.(?:env|dev\.vars)(?:\.|$)/.test(item.name))throw new Error('Local environment file found in build output. Publication blocked.');
  if(target.startsWith(path.join('dist','client'))&&['https://api.openai.com/v1/responses','https://generativelanguage.googleapis.com/v1beta/models'].some(endpoint=>bytes.includes(Buffer.from(endpoint))))throw new Error('Provider endpoint found in client output. Publication blocked.');
 }
}
await scan('dist');
console.log(`Build secret scan passed (${count} files).`);
