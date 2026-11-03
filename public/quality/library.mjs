export function activeDocumentId(documents,preferred){
 const seen=new Set();let current=documents.find(d=>d.id===preferred);
 while(current?.supersededBy&&!seen.has(current.id)){seen.add(current.id);current=documents.find(d=>d.id===current.supersededBy);}
 if(current&&!current.supersededBy)return current.id;
 return documents.filter(d=>!d.supersededBy).at(-1)?.id||null;
}
export function filterDocuments(documents,query=''){
 const term=String(query).trim().toLocaleLowerCase();
 return documents.filter(d=>!d.supersededBy&&(!term||[d.name,d.process?.title].some(v=>String(v||'').toLocaleLowerCase().includes(term))));
}
