import {env} from 'cloudflare:workers';
import {getChatGPTUser} from '@/app/chatgpt-auth';
import {sameOriginRequest} from '@/lib/ai-process.mjs';
import {readAccount,commitAccount,accountFile,AccountStoreError} from '@/lib/account-store.mjs';
export const dynamic='force-dynamic';
const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
function failure(error:unknown){if(error instanceof AccountStoreError)return json({error:error.message,code:error.code},error.status);return json({error:'Konto salvestamine ebaõnnestus. Sinu senine töö on alles.',code:'STORAGE_ERROR'},503);}
export async function GET(request:Request){
 try{const user=await getChatGPTUser();const file=new URL(request.url).searchParams.get('file');
  if(file){const result=await accountFile(env.DB,env.BUCKET,user,file);return new Response(result.object.body,{headers:{'Content-Type':result.mime,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Disposition':'inline'}});}
  return json(await readAccount(env.DB,env.BUCKET,user));
 }catch(error){return failure(error);}
}
export async function POST(request:Request){
 if(!sameOriginRequest(request))return json({error:'Ava tööriist oma kontol.',code:'ORIGIN_REJECTED'},403);
 try{const user=await getChatGPTUser();if(!user)return json({error:'Logi oma konto kasutamiseks sisse.',code:'SIGN_IN_REQUIRED'},401);
  if(Number(request.headers.get('content-length'))>26_000_000)return json({error:'Üleslaadimine on liiga suur.'},413);
  const form=await request.formData(),raw=form.get('payload');if(typeof raw!=='string'||raw.length>3_000_000)return json({error:'Salvestamise andmed on liiga suured.'},413);
  const payload=JSON.parse(raw),uploads=new Map<string,File>();for(const [key,value]of form.entries())if(key.startsWith('file:')&&value instanceof File)uploads.set(key.slice(5),value);
  return json(await commitAccount(env.DB,env.BUCKET,user,payload,uploads));
 }catch(error){return failure(error);}
}
