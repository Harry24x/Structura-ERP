import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
import {createLocalWorkerProxy} from '../lib/local-worker-proxy.mjs';

const projectRoot=fileURLToPath(new URL('../',import.meta.url));
// Compiled previews must not share Vite's live Worker registry. Respect explicit
// runtime paths supplied by a managed execution environment or the caller.
process.env.SITES_RUNTIME_ROOT??=path.join(projectRoot,'.sites-runtime','production-preview',String(process.pid));
await import('./sites-env.mjs');

// Keep a stable browser origin for localStorage; only the private runtime port
// is ephemeral. --port 0 remains available for isolated tests.
const args=[];let port=8787;
const input=process.argv.slice(2);
for(let i=0;i<input.length;i++){
 const arg=input[i];
 if(arg==='--port'||arg==='-p')port=Number(input[++i]);
 else if(arg.startsWith('--port='))port=Number(arg.slice(7));
 else args.push(arg);
}
if(!Number.isInteger(port)||port<0||port>65535)throw new Error('Use a port from 0 to 65535.');
const cli=new URL('../node_modules/wrangler/bin/wrangler.js',import.meta.url);
const workerArgs=['dev','--config','dist/server/wrangler.json',
 '--local','--persist-to','.wrangler/state','--ip','127.0.0.1','--inspector-port','0',
 '--port','0',...args];
// Wrangler's bin checks require.main, so execute its supported CLI entrypoint.
const child=spawn(process.execPath,[fileURLToPath(cli),...workerArgs],{stdio:['inherit','pipe','inherit'],windowsHide:true});
let proxy,pending='',stopping=false;
function stop(signal='SIGTERM'){
 if(stopping)return;stopping=true;
 proxy?.close();proxy?.closeAllConnections();child.kill(signal);
}
child.stdout.setEncoding('utf8');
child.stdout.on('data',chunk=>{
 pending+=chunk;
 for(let end;(end=pending.indexOf('\n'))>=0;){
  const line=pending.slice(0,end);pending=pending.slice(end+1);
  const ready=line.match(/Ready on (http:\/\/127\.0\.0\.1:\d+)/);
  if(!ready){process.stdout.write(line+'\n');continue;}
  if(proxy)continue;
  proxy=createLocalWorkerProxy(ready[1]);
  proxy.on('error',error=>{console.error(`Local preview could not listen: ${error.code||error.message}. Try --port 0.`);process.exitCode=1;stop();});
  proxy.listen(port,'127.0.0.1',()=>console.log(`Ready on http://127.0.0.1:${proxy.address().port}`));
 }
});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>stop(signal));
child.on('error',error=>{console.error(error.message);process.exitCode=1;});
child.on('exit',code=>{proxy?.close();proxy?.closeAllConnections();process.exitCode=process.exitCode||(code??(stopping?0:1));});
