import {env} from 'cloudflare:workers';
import {getChatGPTUser} from '@/app/chatgpt-auth';
import {resolveProvider} from '@/lib/ai-provider.mjs';
import {generateProcessDraft, prepareProcessRequest, ProcessAIError, readProcessBody, sameOriginRequest} from '@/lib/ai-process.mjs';

export const dynamic = 'force-dynamic';
const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'private, no-store'}});

async function allowed(request:Request) {
 const user=await getChatGPTUser();
 // Development preview only; Vite removes this branch from production builds.
 const localPreview=import.meta.env.DEV&&['localhost','127.0.0.1','terminal.local'].includes(new URL(request.url).hostname);
 return !!user||localPreview;
}
function configuration() {
 // Runtime binding only: no key in a client variable or build-time substitution.
 return resolveProvider(env as unknown as Record<string,string|undefined>);
}
export async function GET(request:Request) {
 if(!await allowed(request))return json({ready:false,error:'Sign in with ChatGPT to use AI generation.'},401);
 return json({ready:!!configuration().apiKey});
}
export async function POST(request:Request) {
 if(!await allowed(request))return json({error:'Sign in with ChatGPT to use AI generation.',code:'SIGN_IN_REQUIRED'},401);
 if(!sameOriginRequest(request))return json({error:'Open the workspace to generate a process.',code:'ORIGIN_REJECTED'},403);
 try {
  const prepared=prepareProcessRequest(await readProcessBody(request));
  return json(await generateProcessDraft(prepared,{...configuration(),signal:request.signal}));
 } catch(error) {
  if(error instanceof ProcessAIError)return json({error:error.message,code:error.code,details:error.details},error.status);
  return json({error:'Generation could not complete. Your previous draft is unchanged.',code:'INTERNAL_ERROR'},500);
 }
}
