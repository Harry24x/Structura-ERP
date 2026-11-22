// Local check for the Gemini setup. Reads GEMINI_API_KEY from .env.local, shows which
// models the key can use, then generates one real draft from the built-in expense example.
// The key is never printed. Run: pnpm check:gemini
import {readFile} from 'node:fs/promises';
import {parseEnv} from 'node:util';
import {examples} from '../lib/examples.mjs';
import {generateProcessDraft,prepareProcessRequest} from '../lib/ai-process.mjs';
import {resolveProvider} from '../lib/ai-provider.mjs';

let env={};
for(const file of ['.env','.env.local']){
 try{env={...env,...parseEnv(await readFile(file,'utf8'))};}catch(error){if(error.code!=='ENOENT')throw error;}
}
const config=resolveProvider({...env,...process.env});
if(config.provider!=='gemini'){
 console.error('GEMINI_API_KEY was not found. Create .env.local in the project folder with the line:\n  GEMINI_API_KEY=your-key');
 process.exit(1);
}
console.log(`Key found. Model: ${config.model} (fallback when overloaded: ${config.fallbackModel})`);

const listed=await fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=200',{headers:{'x-goog-api-key':config.apiKey}});
if(!listed.ok){
 const body=await listed.json().catch(()=>({}));
 console.error(`Google rejected the key (HTTP ${listed.status}): ${String(body?.error?.message||'no detail').slice(0,300)}`);
 process.exit(1);
}
const names=((await listed.json()).models||[]).filter(model=>model.supportedGenerationMethods?.includes('generateContent')).map(model=>model.name.replace('models/',''));
console.log(`Models this key can use for generation (${names.length}):\n  ${names.join(', ')}`);
for(const [setting,name] of [['GEMINI_MODEL',config.model],['GEMINI_FALLBACK_MODEL',config.fallbackModel]])if(!names.includes(name))console.warn(`\nWarning: "${name}" is not in that list. Add a line ${setting}=<one of the names above> to .env.local.`);

// Show the provider's own error text here only; the app itself never relays it.
const fetcher=async(url,options)=>{
 const response=await fetch(url,options);
 if(!response.ok){const body=await response.clone().json().catch(()=>({}));console.error(`\nGemini error from ${String(url).split('/models/')[1]?.split(':')[0]} (HTTP ${response.status} ${body?.error?.status||''}): ${String(body?.error?.message||'no detail').slice(0,600)}`);if(response.status===503)console.error('Trying the fallback model...');}
 return response;
};
console.log('\nGenerating a draft from the expense example...');
const started=Date.now();
try{
 const {draft}=await generateProcessDraft(prepareProcessRequest({intent:'generate',source:examples[0].process.source,expectedVersion:1}),{...config,fetcher});
 console.log(`Success in ${((Date.now()-started)/1000).toFixed(1)}s: "${draft.title}" with ${draft.nodes.length} steps, ${draft.edges.length} connections, ${draft.questions.length} open questions.`);
}catch(error){
 console.error(`Failed after ${((Date.now()-started)/1000).toFixed(1)}s: ${error.code||'ERROR'} - ${error.message}`);
 if(error.details?.length)console.error(`Details: ${error.details.join(' ')}`);
 process.exit(1);
}
