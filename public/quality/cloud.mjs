export class CloudWorkspace{
 constructor(onStatus=()=>{}){this.snapshot=null;this.onStatus=onStatus;}
 async request(url,options={}){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),45000);
  try{const response=await fetch(url,{...options,credentials:'same-origin',signal:controller.signal,cache:'no-store'});
   if(!response.ok){let data={};try{data=await response.json();}catch{}const error=new Error(data.error||'Konto ühendus ei vasta. Sinu senine töö on alles.');error.code=data.code;error.status=response.status;throw error;}
   return response;
  }finally{clearTimeout(timer);}
 }
 async refresh(){const response=await this.request('/api/workspace');this.snapshot=await response.json();return this.snapshot;}
 async file(id){const response=await this.request('/api/workspace?file='+encodeURIComponent(id));return {id,blob:await response.blob(),cloudVersion:this.snapshot.files.find(f=>f.id===id)?.version};}
 async commit(records,expected=[]){
  if(!this.snapshot)throw new Error('Konto ühendus pole veel valmis.');
  for(const r of records)if(r.store==='documents')r.value.revisionId=crypto.randomUUID();
  const form=new FormData(),payload={baseRevision:this.snapshot.revision,expected:expected.map(d=>({id:d.id,version:d.version,revisionId:d.revisionId||null,process:d.process?{version:d.process.version}:undefined})),records:records.map(r=>r.store==='files'?{store:r.store,value:{id:r.value.id}}:r)};
  for(const r of records)if(r.store==='files')form.append('file:'+r.value.id,r.value.blob,'source');
  form.append('payload',JSON.stringify(payload));this.onStatus('saving');
  try{const result=await (await this.request('/api/workspace',{method:'POST',body:form})).json();
   const snapshot=this.snapshot;for(const r of records){const list=snapshot[r.store];const value=r.store==='files'?result.files.find(f=>f.id===r.value.id):structuredClone(r.value);const i=list.findIndex(item=>item.id===value.id);if(i<0)list.push(value);else list[i]=value;}
   snapshot.revision=result.revision;this.onStatus('saved');return result;
  }catch(error){this.onStatus('error');throw error;}
 }
}
