import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {createLocalWorkerProxy} from '../lib/local-worker-proxy.mjs';

async function listen(server){
 const sockets=new Set();server.on('connection',socket=>{sockets.add(socket);socket.on('close',()=>sockets.delete(socket));});
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
 return {url:`http://127.0.0.1:${server.address().port}`,close:async()=>{for(const socket of sockets)socket.destroy();await new Promise(resolve=>server.close(resolve));}};
}
function request(url,{body='',headers={},agent=false}={}){
 return new Promise((resolve,reject)=>{
  const req=http.request(url,{method:'POST',agent,headers:{'Content-Length':Buffer.byteLength(body),...headers}},res=>{
   let text='';res.setEncoding('utf8');res.on('data',chunk=>{text+=chunk;});res.on('error',reject);
   res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,text}));
  });req.on('error',reject);req.end(body);
 });
}

test('local transport preserves body, origin, identity and status while closing both HTTP hops',async()=>{
 let calls=0,seen;
 const worker=await listen(http.createServer(async(req,res)=>{
  calls++;const chunks=[];for await(const chunk of req)chunks.push(chunk);
  seen={body:Buffer.concat(chunks).toString(),headers:req.headers};
  res.writeHead(503,{'Content-Type':'application/json'});res.end('{"code":"NOT_CONFIGURED"}');
 }));
 const proxy=await listen(createLocalWorkerProxy(worker.url));
 const agent=new http.Agent({keepAlive:true});
 try{
  const body=JSON.stringify({source:'Töö · réception · Prüfung'});
  const result=await request(proxy.url+'/api/process',{body,agent,headers:{Host:'127.0.0.1:1234',Origin:'http://127.0.0.1:1234','oai-authenticated-user-id':'synthetic'}});
  assert.equal(result.status,503);assert.deepEqual(JSON.parse(result.text),{code:'NOT_CONFIGURED'});
  assert.equal(result.headers.connection,'close');assert.equal(seen.headers.connection,'close');
  assert.equal(seen.body,body);assert.equal(seen.headers.host,'127.0.0.1:1234');
  assert.equal(seen.headers.origin,'http://127.0.0.1:1234');assert.equal(seen.headers['oai-authenticated-user-id'],'synthetic');
  assert.equal(calls,1);
 }finally{agent.destroy();await proxy.close();await worker.close();}
});

test('a dropped local Worker connection returns a bounded error without retrying POST',async()=>{
 let calls=0;const worker=await listen(http.createServer(req=>{calls++;req.socket.destroy();}));
 const proxy=await listen(createLocalWorkerProxy(worker.url));
 try{
  const result=await request(proxy.url+'/api/process',{body:'synthetic'});
  assert.equal(result.status,502);assert.equal(JSON.parse(result.text).code,'LOCAL_RUNTIME_UNAVAILABLE');assert.equal(calls,1);
 }finally{await proxy.close();await worker.close();}
});

test('WebSocket upgrade headers and bidirectional bytes pass through the local transport',async()=>{
 const server=http.createServer();
 server.on('upgrade',(req,socket,head)=>{
  assert.equal(req.headers.upgrade,'websocket');
  socket.write('HTTP/1.1 101 Switching Protocols\r\nConnection: Upgrade\r\nUpgrade: websocket\r\n\r\n');
  if(head.length)socket.write(head);socket.on('data',data=>socket.write(data));
 });
 const worker=await listen(server),proxy=await listen(createLocalWorkerProxy(worker.url));
 try{
  await new Promise((resolve,reject)=>{
   const req=http.request(proxy.url,{headers:{Connection:'Upgrade',Upgrade:'websocket'}});
   req.setTimeout(5000,()=>req.destroy(new Error('Upgrade deadline exceeded.')));req.on('error',reject);
   req.on('upgrade',(res,socket)=>{
    assert.equal(res.statusCode,101);assert.equal(res.headers.upgrade,'websocket');
    socket.on('error',reject);socket.once('data',data=>{assert.equal(data.toString(),'audit');socket.destroy();resolve();});socket.write('audit');
   });req.end();
  });
 }finally{await proxy.close();await worker.close();}
});
