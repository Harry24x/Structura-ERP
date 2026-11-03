import {roleLaneLayout, renderRoleLanes} from './bpmn.mjs';
import {validateExplorer} from './process-explorer.mjs';
import {sourceBlocks,explicitFutureNeeds} from './source-sections.mjs';
export {sourceBlocks,explicitFutureNeeds} from './source-sections.mjs';
import {normalizeDirection} from './diagram-direction.mjs';
import {EXECUTION_LABELS, isTask, systemColor, taskCard, validateSystemCards, withSystemRegistry} from './systems.mjs';
import {areaCard,areaDefinition,BUSINESS_AREAS,validateBusinessAreas,withBusinessAreas} from './business-areas.mjs';
export const SCHEMA_VERSION = "1.0";
export const MAX_SOURCE = 120000;
const IDENTIFIER = /^[A-Za-z][A-Za-z0-9_-]{0,63}$/;
const validId = value => typeof value === 'string' && IDENTIFIER.test(value);
const TYPES = new Set(["start", "activity", "decision", "end"]);
const normal = value => String(value).replace(/\s+/g, " ").trim().toLowerCase();
export const clone = value => value === undefined ? undefined : JSON.parse(JSON.stringify(value));

export function validateProcess(p) {
  const errors = [], warnings = [];
  const fail = message => errors.push(message);
  if (!p || typeof p !== "object" || Array.isArray(p)) return { errors: ["Import a process object."], warnings };
  if (p.schemaVersion !== SCHEMA_VERSION) fail("Unsupported process schema version.");
  if (typeof p.title !== "string" || !p.title.trim() || p.title.length > 160) fail("Use a process title of 1–160 characters.");
  if (!["as-is", "to-be"].includes(p.mode)) fail("Process mode must be as-is or to-be.");
  if (typeof p.source !== "string" || p.source.length > MAX_SOURCE) fail("The source must be text, at most 120,000 characters.");
  if (!Array.isArray(p.roles) || p.roles.length > 30) fail("Use at most 30 roles.");
  if (!Array.isArray(p.nodes) || p.nodes.length < 2 || p.nodes.length > 90) fail("Use between 2 and 90 process nodes.");
  if (!Array.isArray(p.edges) || p.edges.length > 200) fail("Use at most 200 connections.");
  if (!Array.isArray(p.questions) || p.questions.length > 30) fail("Questions must be a list of at most 30 items.");
  if (!Array.isArray(p.notes) || p.notes.length > 30 || p.notes.some(s => typeof s !== "string" || s.length > 2000)) fail("Notes must be short text entries.");
  if (errors.length) return { errors, warnings };
  errors.push(...validateExplorer(p));
  errors.push(...validateSystemCards(p));
  errors.push(...validateBusinessAreas(p));
  const roles = new Map(), nodes = new Map(), questions = new Set();
  const segments=sourceBlocks(p.source).map(b=>({...b,normal:normal(b.text)}));
  for (const role of p.roles) {
    if (!role || !validId(role.id) || roles.has(role.id)) fail("Each role needs a unique safe identifier.");
    if (typeof role?.label !== "string" || !role.label.trim() || role.label.length > 100) fail("Each role needs a short label.");
    roles.set(role?.id, role);
  }
  for (const n of p.nodes) {
    if (!n || !validId(n.id) || nodes.has(n.id)) fail("Each node needs a unique safe identifier.");
    if (!TYPES.has(n?.type)) fail("Unknown process node type.");
    if (typeof n?.label !== "string" || !n.label.trim() || n.label.length > 180) fail("Each node needs a label of 1–180 characters.");
    if (n?.roleId !== null && !roles.has(n?.roleId)) fail("A node refers to an unknown role.");
    if (typeof n?.evidence !== "string" || n.evidence.length > 1800) fail("Node evidence must be short text.");
    else if (["activity", "decision"].includes(n?.type)) {
      const quote=normal(n.evidence);
      if (!quote || !normal(p.source).includes(quote)) fail(`Source evidence is missing or does not match for ${n.id}.`);
      else if(p.mode==='as-is'&&segments.some(b=>b.future&&b.normal.includes(quote))&&!segments.some(b=>!b.future&&b.normal.includes(quote))) fail(`Evidence for ${n.id} is explicitly marked as a future need. Keep it outside the as-is process.`);
    }
    const card=taskCard(n), systemQuote=normal(card.systemEvidence);
    if(p.mode==='as-is'&&systemQuote&&(card.systemId!==null||card.execution!=='unknown'||card.humanDecision!==null)&&segments.some(b=>b.future&&b.normal.includes(systemQuote))&&!segments.some(b=>!b.future&&b.normal.includes(systemQuote)))fail(`System evidence for ${n.id} is explicitly marked as a future need.`);
    nodes.set(n?.id, n);
  }
  for (const q of p.questions) {
    if (!q || !validId(q.id) || questions.has(q.id)) fail("Each question needs a unique safe identifier.");
    if (!['role', 'decision_rule', 'missing_step', 'other'].includes(q?.kind)) fail("Unknown clarification type.");
    if (typeof q?.text !== "string" || !q.text.trim() || q.text.length > 600) fail("Each question needs a short question.");
    if (!Array.isArray(q?.nodeIds) || !q.nodeIds.length || q.nodeIds.some(id => !nodes.has(id))) fail("Each question must refer to existing nodes.");
    questions.add(q?.id);
  }
  if (errors.length) return { errors: [...new Set(errors)], warnings };
  const outbound = new Map(p.nodes.map(n => [n.id, []]));
  const inbound = new Map(p.nodes.map(n => [n.id, []]));
  const connections = new Set();
  for (const e of p.edges) {
    if (!nodes.has(e?.from) || !nodes.has(e?.to)) { fail("A connection refers to a missing node."); continue; }
    if (e.from === e.to) fail("Use a separate step for a self-loop.");
    if (typeof e.label !== "string" || e.label.length > 120) fail("Connection labels must be short text.");
    const key = `${e.from}|${e.to}|${e.label}`;
    if (connections.has(key)) fail("Duplicate process connection.");
    connections.add(key); outbound.get(e.from).push(e); inbound.get(e.to).push(e);
  }
  const starts = p.nodes.filter(n => n.type === 'start'), ends = p.nodes.filter(n => n.type === 'end');
  if (starts.length !== 1 || !ends.length) fail("Use one start and at least one end.");
  for (const n of p.nodes) {
    const out = outbound.get(n.id);
    if (n.type === 'start' && inbound.get(n.id).length) fail("The start cannot have incoming connections.");
    if (n.type === 'start' && out.length !== 1) fail("The start needs exactly one outgoing connection. Use an explicit decision for source-supported alternatives.");
    if (n.type === 'end' && out.length) fail("An end cannot have outgoing connections.");
    if (n.type !== 'end' && !out.length && !p.questions.some(q => q.nodeIds.includes(n.id))) fail(`No next step is defined for ${n.id}.`);
    if (n.type === 'decision' && (out.length < 2 || out.some(e => !e.label.trim()) || new Set(out.map(e => normal(e.label))).size !== out.length)) fail(`Decision ${n.id} needs distinct labelled branches.`);
    if (['activity', 'decision'].includes(n.type) && n.roleId === null && !p.questions.some(q => q.kind === 'role' && q.nodeIds.includes(n.id))) fail(`Ask who is responsible for ${n.id}.`);
  }
  const visit = (seeds, links, target) => { const stack = [...seeds], seen = new Set(); while (stack.length) { const id = stack.pop(); if (seen.has(id)) continue; seen.add(id); for (const e of links.get(id) || []) stack.push(e[target]); } return seen; };
  if (starts.length === 1) {
    const reached = visit([starts[0].id], outbound, 'to');
    if (p.nodes.some(n => !reached.has(n.id))) fail("Every node must be reachable from the start.");
  }
  const canEnd = visit(ends.map(n => n.id), inbound, 'from');
  if (p.nodes.some(n => !canEnd.has(n.id) && !p.questions.some(q => q.nodeIds.includes(n.id)))) fail("Every mapped branch must have a path to an end.");
  if (p.questions.length) warnings.push(`${p.questions.length} clarification${p.questions.length === 1 ? '' : 's'} still needed.`);
  if (p.nodes.length > 24) warnings.push("Review readability; this diagram may need separate views.");
  return { errors: [...new Set(errors)], warnings };
}

export function requireValid(p) {
  const report = validateProcess(p);
  if (report.errors.length) throw new Error(report.errors.join(" "));
  return p;
}

export function createDocument(model, source, origin = 'imported') {
  const fields = ['schemaVersion', 'title', 'mode', 'roles', 'nodes', 'edges', 'questions', 'notes', 'systems'];
  const clean = Object.fromEntries(fields.map(k => [k, clone(model[k])]));
  if(model.explorer!==undefined)clean.explorer=clone(model.explorer);
  return requireValid(withBusinessAreas(withSystemRegistry({ ...clean, source, version: 1, origin, reviewed: false, changeSummary: 'Initial process draft' })));
}

export function saveBusinessArea(current,nodeId,businessArea,reason) {
  requireValid(current);
  const node=current.nodes.find(item=>item.id===nodeId);
  if(!isTask(node))throw new Error('Business areas belong to activities and decisions.');
  if(!BUSINESS_AREAS.some(area=>area.id===businessArea))throw new Error('Choose a valid business area.');
  if(typeof reason!=='string'||reason.length>600||(businessArea!=='unknown'&&!reason.trim()))throw new Error('Explain the area assignment in 1–600 characters.');
  const next=withBusinessAreas(clone(current)),target=next.nodes.find(item=>item.id===nodeId);
  Object.assign(target,{businessArea,areaReason:reason.trim(),areaReviewed:businessArea!=='unknown'});
  next.version=(Number(current.version)||1)+1;next.reviewed=false;next.origin='business-area';next.changeSummary='Business area updated';
  // Classification is review metadata, not a new statement of customer facts.
  return requireValid(next);
}

export function saveSystemCard(current, nodeId, input, confirmation) {
  requireValid(current);
  const node=current.nodes.find(n=>n.id===nodeId);
  if(!isTask(node))throw new Error('System cards belong to activities and decisions.');
  if(typeof confirmation!=='string'||!confirmation.trim()||confirmation.length>1400)throw new Error('System evidence must be a short exact source quotation.');
  const next=withSystemRegistry(clone(current),input.systems??current.systems??[]),target=next.nodes.find(n=>n.id===nodeId);
  Object.assign(target,{systemId:input.systemId,execution:input.execution,humanDecision:input.humanDecision,systemEvidence:confirmation.trim()});
  next.source+='\nClarification: System card - '+node.label+'\nAnswer: '+confirmation.trim();
  next.version=(Number(current.version)||1)+1;next.reviewed=false;next.origin='system-card';next.changeSummary='System card updated';
  return requireValid(next);
}

export function applyClarification(current, questionId, answer) {
  requireValid(current);
  const q = current.questions.find(q => q.id === questionId);
  if (!q) throw new Error("That question has already been answered.");
  answer = String(answer).trim();
  if (!answer || answer.length > 100) throw new Error("Use a short answer of 1–100 characters.");
  if (!['role', 'decision_rule'].includes(q.kind)) throw new Error("Use the AI connection or import an updated process to map this answer.");
  const next = clone(current);
  next.source += `\nClarification: ${q.text}\nAnswer: ${answer}`;
  if (q.kind === 'role') {
    let role = next.roles.find(r => normal(r.label) === normal(answer));
    if (!role) { let i = 1; while (next.roles.some(r => r.id === `role_answer_${i}`)) i++; role = {id: `role_answer_${i}`, label: answer}; next.roles.push(role); }
    for (const n of next.nodes) if (q.nodeIds.includes(n.id)) n.roleId = role.id;
  } else {
    for (const n of next.nodes) if (q.nodeIds.includes(n.id) && n.type === 'decision') n.label = answer;
  }
  next.questions = next.questions.filter(item => item.id !== questionId);
  next.version = (Number(current.version) || 1) + 1;
  next.reviewed = false;
  next.origin = 'clarified';
  next.changeSummary = `Answered: ${q.text}`;
  return requireValid(next);
}

export const RECEIPT_COMMAND = 'After the manager approves, finance checks that a receipt is attached. If it is missing, ask the employee to attach it and repeat the receipt check. Otherwise reimburse as before.';

export function applyReceiptDemo(current) {
  requireValid(current);
  if (current.nodes.some(n => n.id === 'receipt_check')) return clone(current);
  const expected = ['approval', 'reimburse', 'submit', 'rejected'];
  if (!expected.every(id => current.nodes.some(n => n.id === id))) throw new Error("This demo change is available for the expense example.");
  const next = clone(current);
  next.mode = 'to-be';
  next.source += '\nRequested improvement: ' + RECEIPT_COMMAND;
  next.nodes.splice(next.nodes.findIndex(n => n.id === 'reimburse'), 0,
    {id:'receipt_check',type:'decision',label:'Receipt attached?',roleId:'finance',evidence:'finance checks that a receipt is attached'},
    {id:'attach_receipt',type:'activity',label:'Attach receipt',roleId:'employee',evidence:'ask the employee to attach it and repeat the receipt check'});
  next.edges = next.edges.filter(e => !(e.from === 'approval' && e.to === 'reimburse'));
  next.edges.push({from:'approval',to:'receipt_check',label:'Approved'},{from:'receipt_check',to:'reimburse',label:'Yes'},{from:'receipt_check',to:'attach_receipt',label:'Missing'},{from:'attach_receipt',to:'receipt_check',label:'Recheck'});
  next.version = (Number(current.version) || 1) + 1;
  next.reviewed = false; next.origin = 'demo-edit'; next.changeSummary = 'Proposed receipt check and correction loop';
  return requireValid(next);
}

export function difference(before, after) {
  if (!before) return {added:[], changed:[], removed:[], connections:0};
  const old = new Map(before.nodes.map(n => [n.id,n])), now = new Map(after.nodes.map(n => [n.id,n]));
  const changed = after.nodes.filter(n => old.has(n.id) && JSON.stringify(old.get(n.id)) !== JSON.stringify(n)).map(n => n.id);
  const oldEdges = new Set(before.edges.map(e => JSON.stringify(e))), newEdges = new Set(after.edges.map(e => JSON.stringify(e)));
  return {added:after.nodes.filter(n => !old.has(n.id)).map(n => n.id),changed,removed:before.nodes.filter(n=>!now.has(n.id)).map(n=>n.id),connections:[...newEdges].filter(e=>!oldEdges.has(e)).length};
}

const xml = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const mermaidLabel = s => String(s).replace(/&/g,'&amp;').replace(/"/g,'#quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/[\r\n]/g,' ');

export function toMermaid(p, {direction='TD',unknownRoleLabel='Role unknown',unknownSystemLabel='System unknown',manualSystemLabel='No software',executionLabels=EXECUTION_LABELS,legendTitle='Systems legend',humanDecisionLabel='Human decision',areaLabels={},areaLegendTitle='Business areas',areaStatusLabels={suggested:'Suggested',confirmed:'Confirmed',unknown:'Unclassified'}} = {}) {
  requireValid(p);
  const roles=new Map(p.roles.map(r=>[r.id,r.label])),systems=new Map((p.systems||[]).map(s=>[s.id,s]));
  const lines=['flowchart '+normalizeDirection(direction)];
  for(const n of p.nodes){
    const card=taskCard(n),system=systems.get(card.systemId);
    const area=areaCard(n),areaLabel=areaLabels[area.businessArea]||areaDefinition(area.businessArea).label;
    const extra=isTask(n)?` · ${system?.label||(card.execution==='manual'?manualSystemLabel:unknownSystemLabel)} · ${executionLabels[card.execution]}${card.humanDecision===true?' · '+humanDecisionLabel:''} · ${areaLabel} (${areaStatusLabels[area.businessArea==='unknown'?'unknown':area.areaReviewed?'confirmed':'suggested']})`:'';
    const label=mermaidLabel(n.label+(['start','end'].includes(n.type)?'':` · ${roles.get(n.roleId)||unknownRoleLabel}`)+extra);
    lines.push(n.type==='decision'?`  ${n.id}{"${label}"}`:['start','end'].includes(n.type)?`  ${n.id}(["${label}"])`:`  ${n.id}["${label}"]`);
    if(system)lines.push(`  class ${n.id} system_${system.id};`);
  }
  for(const e of p.edges)lines.push(`  ${e.from} -->${e.label?`|"${mermaidLabel(e.label)}"|`:''} ${e.to}`);
  if(systems.size){
    let prefix='system_legend';while(p.nodes.some(n=>n.id===prefix||n.id.startsWith(prefix+'_')))prefix+='x';
    lines.push(`  subgraph ${prefix}["${mermaidLabel(legendTitle)}"]`);
    [...systems.values()].forEach((system,i)=>lines.push(`    ${prefix}_${i}["${mermaidLabel(system.label)}"]:::system_${system.id}`));
    lines.push('  end');
    for(const system of systems.values())lines.push(`  classDef system_${system.id} stroke:${systemColor(system.id)},stroke-width:3px;`);
  }
  let areaPrefix='business_area_legend';while(p.nodes.some(n=>n.id===areaPrefix||n.id.startsWith(areaPrefix+'_')))areaPrefix+='x';
  const areas=BUSINESS_AREAS.filter(area=>p.nodes.some(n=>isTask(n)&&areaCard(n).businessArea===area.id));
  if(areas.length){
  lines.push(`  subgraph ${areaPrefix}["${mermaidLabel(areaLegendTitle)}"]`);
  for(const area of areas){
    lines.push(`    ${areaPrefix}_${area.id}["${mermaidLabel(areaLabels[area.id]||area.label)}"]:::${areaPrefix}_${area.id}`);
    lines.push(`    classDef ${areaPrefix}_${area.id} fill:#f7f9fb,stroke:${area.color},color:#273d50;`);
  }
  lines.push('  end');
  }
  return lines.join('\n');
}

export function bpmnLayout(p, unknownRoleLabel='Role unknown', {projection=false}={}) {
  if(!projection)requireValid(p);
  const ranked=projection?projectionLayout(p,'LR',{compact:true}):layoutGraph(p,'LR',true);
  return roleLaneLayout(p, ranked, unknownRoleLabel);
}

export function diagramLayout(p, direction='TD') {
  requireValid(p);
  return layoutGraph(p,direction);
}
// Rendering a selection is distinct from validating a complete process. This
// path cannot import/save data and validates all graph references before layout.
export function projectionLayout(p,direction='TD',{compact=false}={}) {
  const ids=new Set(p.nodes?.map(n=>n?.id));
  if(!Array.isArray(p.nodes)||!p.nodes.length||p.nodes.length>300||ids.size!==p.nodes.length||p.nodes.some(n=>!n||typeof n.id!=='string'||!/^[-A-Za-z0-9_]{1,100}$/.test(n.id)||!TYPES.has(n.type)||typeof n.label!=='string'||n.label.length>500)||!Array.isArray(p.edges)||p.edges.length>400||p.edges.some(e=>!ids.has(e.from)||!ids.has(e.to)||typeof e.label!=='string'||e.label.length>120))throw new Error('Invalid diagram projection.');
  return layoutGraph(p,direction,compact);
}
function layoutGraph(p,direction,compact=false) {
  const out = new Map(p.nodes.map(n => [n.id, []]));
  p.edges.forEach((e,i) => out.get(e.from).push({...e,index:i}));
  const back = new Set(), seen = new Set(), active = new Set();
  const walk = id => { seen.add(id); active.add(id); for (const e of out.get(id)) { if (active.has(e.to)) back.add(e.index); else if (!seen.has(e.to)) walk(e.to); } active.delete(id); };
  for(const n of [...p.nodes.filter(n=>n.type==='start'),...p.nodes])if(!seen.has(n.id))walk(n.id);
  const levels = new Map(p.nodes.map(n=>[n.id,0]));
  const indeg = new Map(p.nodes.map(n=>[n.id,0]));
  p.edges.forEach((e,i)=>{if(!back.has(i))indeg.set(e.to,indeg.get(e.to)+1);});
  const queue = p.nodes.filter(n=>indeg.get(n.id)===0).map(n=>n.id);
  for(let index=0;index<queue.length;index++)for(const e of out.get(queue[index]))if(!back.has(e.index)){levels.set(e.to,Math.max(levels.get(e.to),levels.get(e.from)+1));indeg.set(e.to,indeg.get(e.to)-1);if(indeg.get(e.to)===0)queue.push(e.to);}
  const rows = new Map(); p.nodes.forEach(n=>{const level=levels.get(n.id);if(!rows.has(level))rows.set(level,[]);rows.get(level).push(n);});
  if(normalizeDirection(direction)==='LR'){
    const shapeHeight=n=>n.type==='decision'?82:['start','end'].includes(n.type)?44:72;
    const fullHeight=n=>shapeHeight(n)+(!compact&&isTask(n)?56:0);
    const columnHeight=row=>row.reduce((sum,n)=>sum+fullHeight(n),0)+(row.length-1)*72;
    const height=Math.max(400,...[...rows.values()].map(row=>columnHeight(row)+180));
    const width=(Math.max(...levels.values())+1)*320+80,nodes=[];
    for(const [level,row] of rows){
      let cursor=0;const local=row.map(n=>{const y=cursor;cursor+=fullHeight(n)+72;return {node:n,y,shapeH:shapeHeight(n),h:fullHeight(n)};});
      const center=(local[0].shapeH/2+local.at(-1).y+local.at(-1).shapeH/2)/2;
      for(const item of local)nodes.push({...item.node,x:166+level*320,y:height/2+item.y-center,w:212,shapeH:item.shapeH,h:item.h});
    }
    return {nodes,width,height,back};
  }
  const columns = Math.max(...[...rows.values()].map(row=>row.length));
  const shapeHeight=n=>n.type==='decision'?82:['start','end'].includes(n.type)?44:72;
  const rowY=new Map();let rowTop=55;
  for(const [level,row] of [...rows].sort((a,b)=>a[0]-b[0])){rowY.set(level,rowTop);rowTop+=Math.max(...row.map(n=>shapeHeight(n)+(!compact&&isTask(n)?56:0)))+52;}
  const width = Math.max(620, columns*252+140), height=rowTop+34;
  const nodes = p.nodes.map(n=>{const row=rows.get(levels.get(n.id)),i=row.findIndex(v=>v.id===n.id);return {...n,x:width/2+(i-(row.length-1)/2)*252,y:rowY.get(levels.get(n.id)),w:212,shapeH:n.type==='decision'?82:['start','end'].includes(n.type)?44:72,h:(n.type==='decision'?82:['start','end'].includes(n.type)?44:72)+(!compact&&isTask(n)?56:0)};});
  return {nodes,width,height,back};
}

export function toSVG(p, highlighted = [], {direction='TD',unknownRoleLabel='Role unknown',unknownSystemLabel='System unknown',manualSystemLabel='No software',executionLabels=EXECUTION_LABELS,legendTitle='Systems legend',humanDecisionLabel='Human decision',includeSystemLegend=true,areaLabels={},areaLegendTitle='Business areas',areaStatusLabels={suggested:'Suggested',confirmed:'Confirmed',unknown:'Unclassified'},includeAreaLegend=includeSystemLegend,viewLabel='',projection=false,compact=false,notation='flowchart',startLabel='Start',endLabel='End',activityLabel='Activity',decisionLabel='Decision',loopLabel='Rework loop',clarificationLabel='Needs clarification'} = {}) {
  direction=normalizeDirection(direction);
  if(notation==='bpmn')return renderRoleLanes(p,bpmnLayout(p,unknownRoleLabel,{projection}),highlighted,{
    unknownSystemLabel,manualSystemLabel,executionLabels,startLabel,endLabel,activityLabel,decisionLabel,loopLabel,clarificationLabel,
  });
  const layout=projection?projectionLayout(p,direction,{compact}):diagramLayout(p,direction);
  const byId=new Map(layout.nodes.map(n=>[n.id,n])), roles=new Map(p.roles.map(r=>[r.id,r.label]));
  const systems=new Map((p.systems||[]).map(s=>[s.id,s]));
  const legendHeight=includeSystemLegend&&systems.size?62+(systems.size+1)*24:0;
  const usedAreas=BUSINESS_AREAS.filter(area=>p.nodes.some(n=>isTask(n)&&areaCard(n).businessArea===area.id));
  const areaLegendHeight=includeAreaLegend&&usedAreas.length?62+usedAreas.length*24:0;
  const palette=['#6079ad','#8c74a5','#508e7c','#b28558','#639ca7'];
  const parts=[`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${layout.width} ${layout.height+legendHeight+areaLegendHeight}" role="img" aria-label="${xml(p.title)}" data-process-svg="true"><title>${xml(p.title)}</title><defs><marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10Z" fill="#98a5b0"/></marker></defs>`];
  if(viewLabel)parts.push(`<text x="26" y="24" font-family="Arial,sans-serif" font-size="12" fill="#425568">${xml(viewLabel)}</text>`);
  p.edges.forEach((e,i)=>{
    const a=byId.get(e.from),b=byId.get(e.to),loop=layout.back.has(i);
    let path,labelX,labelY;
    if(direction==='LR'){
      if(loop){const y=30+(i%3)*16;path=`M${a.x},${a.y} V${y} H${b.x} V${b.y-4}`;labelX=(a.x+b.x)/2;labelY=y-7;}
      else{const sx=a.x+a.w/2,tx=b.x-b.w/2,sy=a.y+a.shapeH/2,ty=b.y+b.shapeH/2,mid=(sx+tx)/2;path=`M${sx},${sy} H${mid} V${ty} H${tx-4}`;labelX=mid;labelY=(sy+ty)/2-7;}
    }else if(loop){const x=Math.max(a.x+a.w/2,b.x+b.w/2)+44+(i%3)*16;path=`M${a.x+a.w/2},${a.y+a.shapeH/2} H${x} V${b.y+b.shapeH/2} H${b.x+b.w/2+3}`;labelX=x;labelY=(a.y+b.y)/2+30;}
    else {const sy=a.y+a.h,ty=b.y,mid=(sy+ty)/2;path=`M${a.x},${sy} V${mid} H${b.x} V${ty-4}`;labelX=(a.x+b.x)/2;labelY=mid-7;}
    parts.push(`<path d="${path}" fill="none" stroke="#a9b4bd" stroke-width="1.5" marker-end="url(#arrow)"/>`);
    if(e.label){const w=Math.max(28,e.label.length*6+14);parts.push(`<rect x="${labelX-w/2}" y="${labelY-10}" width="${w}" height="17" rx="5" fill="#f7f9fb"/><text x="${labelX}" y="${labelY+2}" text-anchor="middle" font-family="Arial,sans-serif" font-size="10" fill="#62717e">${xml(e.label)}</text>`);}
  });
  for(const n of layout.nodes){
    const hash=[...normal(roles.get(n.roleId)||'')].reduce((sum,c)=>(sum*31+c.charCodeAt(0))>>>0,0);
    const unknown=n.roleId===null&&['activity','decision'].includes(n.type),color=unknown?'#b98535':palette[hash%palette.length],stroke=highlighted.includes(n.id)?'#3d9d7e':unknown?'#cba15d':'#d2dbe3',fill=n.type==='decision'?'#fffcf5':unknown?'#fff9ed':'white';
    parts.push(`<g data-node="${n.id}" tabindex="0" role="button" aria-label="${xml(n.label)}" style="cursor:pointer">`);
    if(n.type==='decision')parts.push(`<path d="M${n.x-106},${n.y+41} L${n.x},${n.y} L${n.x+106},${n.y+41} L${n.x},${n.y+82}Z" fill="${fill}" stroke="${stroke}" stroke-width="${highlighted.includes(n.id)?2.5:1.3}"/>`);
    else parts.push(`<rect x="${n.x-n.w/2}" y="${n.y}" width="${n.w}" height="${n.shapeH}" rx="${['start','end'].includes(n.type)?22:10}" fill="${['start','end'].includes(n.type)?'#f0f4f7':fill}" stroke="${stroke}" stroke-width="${highlighted.includes(n.id)?2.5:1.3}"/>`);
    const words=n.label.split(/\s+/),lines=[];let line='';for(const word of words){if((line+' '+word).trim().length>25&&line){lines.push(line);line=word;}else line=(line+' '+word).trim();}if(line)lines.push(line);
    const short=lines.slice(0,3),isTerminal=['start','end'].includes(n.type),base=n.y+(isTerminal?25:n.type==='decision'?32:24)-(short.length-1)*6;
    short.forEach((l,i)=>parts.push(`<text x="${n.x}" y="${base+i*14}" text-anchor="middle" font-family="Arial,sans-serif" font-size="11.5" font-weight="500" fill="#273d50">${xml(i===2&&lines.length>3?l+'…':l)}</text>`));
    if(!isTerminal&&!compact)parts.push(`<text x="${n.x}" y="${n.y+n.shapeH-12}" text-anchor="middle" font-family="Arial,sans-serif" font-size="9.5" fill="${color}">${xml(roles.get(n.roleId)||unknownRoleLabel)}</text>`);
    if(!isTerminal&&!compact){
      const card=taskCard(n),system=systems.get(card.systemId),systemLabel=system?.label||(card.execution==='manual'?manualSystemLabel:unknownSystemLabel),execution=executionLabels[card.execution]+(card.humanDecision===true?' · '+humanDecisionLabel:'');
      const tagY=n.y+n.shapeH+5,tagColor=system?systemColor(system.id):'#8a98a4',shortText=(value,max)=>String(value).length>max?String(value).slice(0,max-1)+'…':value;
      const area=areaCard(n),definition=areaDefinition(area.businessArea),areaLabel=areaLabels[area.businessArea]||definition.label,areaText=areaLabel+' · '+areaStatusLabels[area.businessArea==='unknown'?'unknown':area.areaReviewed?'confirmed':'suggested'];
      parts.push(`<rect x="${n.x-106}" y="${tagY}" width="212" height="46" rx="5" fill="#f6f8fa" stroke="#e0e6eb"/><rect x="${n.x-98}" y="${tagY+6}" width="8" height="8" fill="${tagColor}"/><text x="${n.x-83}" y="${tagY+13}" font-family="Arial,sans-serif" font-size="9" fill="#425568">${xml(shortText(systemLabel,32))}</text><text x="${n.x-98}" y="${tagY+26}" font-family="Arial,sans-serif" font-size="8.5" fill="#667788">${xml(shortText(execution,40))}</text><circle cx="${n.x-94}" cy="${tagY+37}" r="3.5" fill="${definition.color}"/><text x="${n.x-83}" y="${tagY+40}" font-family="Arial,sans-serif" font-size="8.5" fill="#425568">${xml(shortText(areaText,38))}</text><title>${xml(systemLabel+' · '+execution+' · '+areaText)}</title>`);
    }
    parts.push('</g>');
  }
  if(legendHeight){
    const top=layout.height+10;
    parts.push(`<rect x="26" y="${top}" width="${layout.width-52}" height="${legendHeight-24}" rx="8" fill="white" stroke="#d9e1e8"/><text x="44" y="${top+24}" font-family="Arial,sans-serif" font-size="12" font-weight="600" fill="#273d50">${xml(legendTitle)}</text>`);
    [...systems.values(),{id:null,label:unknownSystemLabel}].forEach((system,i)=>parts.push(`<rect x="44" y="${top+38+i*24}" width="10" height="10" fill="${system.id?systemColor(system.id):'#8a98a4'}"/><text x="65" y="${top+47+i*24}" font-family="Arial,sans-serif" font-size="10" fill="#425568">${xml(system.label)}</text>`));
  }
  if(areaLegendHeight){
    const top=layout.height+legendHeight+10;
    parts.push(`<rect x="26" y="${top}" width="${layout.width-52}" height="${areaLegendHeight-24}" rx="8" fill="white" stroke="#d9e1e8"/><text x="44" y="${top+24}" font-family="Arial,sans-serif" font-size="12" font-weight="600" fill="#273d50">${xml(areaLegendTitle)}</text>`);
    usedAreas.forEach((area,i)=>parts.push(`<circle cx="48" cy="${top+43+i*24}" r="5" fill="${area.color}"/><text x="64" y="${top+47+i*24}" font-family="Arial,sans-serif" font-size="10" fill="#425568">${xml(areaLabels[area.id]||area.label)}</text>`));
  }
  parts.push('</svg>');return parts.join('');
}
