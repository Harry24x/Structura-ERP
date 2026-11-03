import http from 'node:http';
import {setTimeout as delay} from 'node:timers/promises';
import {performance} from 'node:perf_hooks';

// Exercise the compiled local Worker. Valid source is sent only after the
// authenticated configuration check confirms that no model key is bound.
const base=new URL(process.argv[2]||'http://127.0.0.1:8787');
if(base.protocol!=='http:'||!['127.0.0.1','localhost','[::1]'].includes(base.hostname))throw new Error('Use an HTTP loopback URL for the local runtime check.');
const samples=Number(process.env.RUNTIME_CHECK_SAMPLES||12);
if(!Number.isInteger(samples)||samples<2||samples>60)throw new Error('Use 2–60 cadence samples.');
const agent=new http.Agent({keepAlive:true});
const identity={'oai-authenticated-user-id':'synthetic-runtime-check','oai-authenticated-user-email':'synthetic@example.invalid'};
let checked=0,failed=0;
async function probe(name,{method='POST',headers={},body='',status,code,path='/api/process'}={}){
 try{
  const result=await new Promise((resolve,reject)=>{
   const request=http.request(new URL(path,base),{method,agent,headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(body),...headers}},response=>{
    let text='';response.setEncoding('utf8');response.on('data',chunk=>{text+=chunk;});response.on('error',reject);
    response.on('end',()=>resolve({status:response.statusCode,text}));
   });
   request.setTimeout(10000,()=>request.destroy(new Error('Request deadline exceeded.')));
   request.on('error',reject);request.end(body);
  });
  let data;try{data=JSON.parse(result.text);}catch{throw new Error(`HTTP ${result.status}: non-JSON proxy response`);}
  if(result.status!==status||(code&&data.code!==code))throw new Error(`Expected ${status}/${code}, received ${result.status}/${data.code}`);
  checked++;console.log(`${name}: ${result.status}${code?' '+code:''}`);
  return data;
 }catch(error){checked++;failed++;console.error(`${name}: FAIL ${error.message}`);}
}
try{
 await probe('anonymous',{status:401,code:'SIGN_IN_REQUIRED'});
 await probe('cross-origin',{headers:{...identity,Origin:'https://other.invalid'},status:403,code:'ORIGIN_REJECTED'});
 const configuration=await probe('configuration',{method:'GET',headers:identity,status:200});
 const invalid={headers:{...identity,Origin:base.origin},body:JSON.stringify({intent:'generate',locale:'en',source:'',expectedVersion:1}),status:400,code:'INVALID_SOURCE'};
 const unconfigured=configuration?.ready===false?{...invalid,body:JSON.stringify({intent:'generate',locale:'en',source:'A clerk checks a synthetic request.',expectedVersion:1}),status:503,code:'NOT_CONFIGURED'}:null;
 const input=index=>unconfigured&&index%2?unconfigured:invalid;
 for(let i=0;i<20;i++)await probe(`burst ${i+1}`,input(i));
 // Align send times (not response times) with KJ's 5-second idle timeout.
 const start=performance.now();
 for(let i=0;i<samples;i++){
  await delay(Math.max(0,start+i*5000-performance.now()));
  await probe(`cadence ${i+1}/${samples}`,input(i));
 }
 console.log(JSON.stringify({checked,failed,cadenceMs:5000,samples}));
 if(failed)process.exitCode=1;
}finally{agent.destroy();}
