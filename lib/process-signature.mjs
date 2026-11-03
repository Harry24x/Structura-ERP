export function stepSignature(p,id){
 const n=p.nodes.find(n=>n.id===id);if(!n)return '';
 return JSON.stringify({node:n,role:p.roles.find(r=>r.id===n.roleId)||null,system:p.systems?.find(s=>s.id===n.systemId)||null,edges:p.edges.filter(e=>e.from===id||e.to===id).map(e=>[e.from,e.to,e.label]).sort()});
}
