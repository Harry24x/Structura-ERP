import {env} from 'cloudflare:workers';
import {getChatGPTUser} from '@/app/chatgpt-auth';
import {sameOriginRequest,readProcessBody,ProcessAIError} from '@/lib/ai-process.mjs';
import {AccountStoreError} from '@/lib/account-store.mjs';
import {ownerGrants,grantPart,revokePart,sharedParts,submitSharedProposal} from '@/lib/process-sharing.mjs';
export const dynamic='force-dynamic';
const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
function failure(error:unknown){if(error instanceof AccountStoreError||error instanceof ProcessAIError)return json({error:error.message,code:error.code},error.status);return json({error:'Jagamise päring ebaõnnestus. Varasem töö on alles.'},503);}
export async function GET(request:Request){try{const user=await getChatGPTUser();return json(new URL(request.url).searchParams.get('view')==='owner'?{grants:await ownerGrants(env.DB,user)}:await sharedParts(env.DB,user));}catch(error){return failure(error);}}
export async function POST(request:Request){
 if(!sameOriginRequest(request))return json({error:'Ava tööriista enda leht.'},403);
 try{const user=await getChatGPTUser();if(!user)return json({error:'Logi oma kontoga sisse.'},401);
  const input=await readProcessBody(request,16000);if(!input||typeof input!=='object')return json({error:'Päring on vigane.'},400);
  if(input.action==='grant')return json(await grantPart(env.DB,env.BUCKET,user,input));
  if(input.action==='revoke'){await revokePart(env.DB,user,input.grantId);return json({ok:true});}
  if(input.action==='propose')return json(await submitSharedProposal(env.DB,env.BUCKET,user,input));
  return json({error:'Tundmatu toiming.'},400);
 }catch(error){return failure(error);}
}
