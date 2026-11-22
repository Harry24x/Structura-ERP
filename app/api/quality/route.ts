import {env} from 'cloudflare:workers';
import {getChatGPTUser} from '@/app/chatgpt-auth';
import {readProcessBody,sameOriginRequest,ProcessAIError} from '@/lib/ai-process.mjs';
import {qualityAI,prepareQualityRequest} from '@/lib/quality-ai.mjs';
import {resolveProvider} from '@/lib/ai-provider.mjs';
export const dynamic='force-dynamic';
const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'private, no-store'}});
export async function POST(request:Request){
 const user=await getChatGPTUser();
 const local=import.meta.env.DEV&&['localhost','127.0.0.1','terminal.local'].includes(new URL(request.url).hostname);
 if(!user&&!local)return json({error:'Logi AI kasutamiseks sisse.',code:'SIGN_IN_REQUIRED'},401);
 if(!sameOriginRequest(request))return json({error:'Ava tööriista enda tööruum.',code:'ORIGIN_REJECTED'},403);
 try{return json(await qualityAI(prepareQualityRequest(await readProcessBody(request,4_100_000)),{...resolveProvider(env as unknown as Record<string,string|undefined>),signal:request.signal}));}
 catch(error){if(error instanceof ProcessAIError)return json({error:error.message,code:error.code,details:error.details},error.status);return json({error:'AI päring ebaõnnestus. Varasem töö on alles.',code:'INTERNAL_ERROR'},500);}
}
