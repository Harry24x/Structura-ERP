import http from 'node:http';

// Local development transport only. Node owns the client-facing socket so its
// Connection: close is honored; each hop to Wrangler also uses a fresh socket.
// Bodies stream unchanged, WebSocket upgrades tunnel, and POSTs are never retried.
export function createLocalWorkerProxy(upstreamURL){
 const upstream=new URL(upstreamURL);
 if(upstream.protocol!=='http:'||upstream.hostname!=='127.0.0.1')throw new Error('The Worker runtime must use HTTP loopback.');
 const options=request=>({hostname:upstream.hostname,port:upstream.port,method:request.method,path:request.url,
  headers:{...request.headers},agent:false});
 const unavailable=response=>{
  if(response.destroyed)return;
  if(response.headersSent){response.destroy();return;}
  response.writeHead(502,{'Content-Type':'application/json','Connection':'close'});
  response.end(JSON.stringify({code:'LOCAL_RUNTIME_UNAVAILABLE',error:'The local Worker is unavailable. Check the server before trying again.'}));
 };
 const server=http.createServer((request,response)=>{
  const config=options(request);config.headers.connection='close';delete config.headers['keep-alive'];
  const outgoing=http.request(config,incoming=>{
   const headers={...incoming.headers,connection:'close'};delete headers['keep-alive'];
   response.writeHead(incoming.statusCode||502,headers);
   incoming.on('error',()=>response.destroy());incoming.pipe(response);
  });
  outgoing.on('error',()=>unavailable(response));
  request.on('error',()=>outgoing.destroy());
  request.on('aborted',()=>outgoing.destroy());
  response.on('close',()=>outgoing.destroy());
  request.pipe(outgoing);
 });
 const writeHead=(socket,response)=>{
  socket.write(`HTTP/1.1 ${response.statusCode} ${response.statusMessage}\r\n`);
  for(let i=0;i<response.rawHeaders.length;i+=2)socket.write(`${response.rawHeaders[i]}: ${response.rawHeaders[i+1]}\r\n`);
  socket.write('\r\n');
 };
 server.on('upgrade',(request,socket,head)=>{
  const outgoing=http.request(options(request));
  outgoing.on('upgrade',(response,remote,remoteHead)=>{
   writeHead(socket,response);
   if(remoteHead.length)socket.write(remoteHead);
   if(head.length)remote.write(head);
   socket.on('error',()=>remote.destroy());remote.on('error',()=>socket.destroy());
   socket.on('close',()=>remote.destroy());remote.on('close',()=>socket.destroy());
   remote.pipe(socket);socket.pipe(remote);
  });
  outgoing.on('response',response=>{writeHead(socket,response);response.pipe(socket);});
  outgoing.on('error',()=>socket.destroy());
  socket.on('error',()=>outgoing.destroy());socket.on('close',()=>outgoing.destroy());
  outgoing.end();
 });
 return server;
}
