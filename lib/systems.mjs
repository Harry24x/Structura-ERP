// System identity is independent of the interface language and diagram roles.
export const MAX_SYSTEMS = 30;
/** @type {Readonly<Record<string,string>>} */
export const EXECUTION_LABELS = Object.freeze({unknown:'Execution unknown',manual:'Manual',assisted:'Person using software',automated:'Automatic'});
/** @type {Readonly<Record<string,string>>} */
export const DECISION_LABELS = Object.freeze({unknown:'Unknown',yes:'Yes',no:'No'});
const IDENTIFIER = /^[A-Za-z][A-Za-z0-9_-]{0,63}$/;
const normal = value => String(value).normalize('NFKC').replace(/\s+/g,' ').trim().toLowerCase();
const hash = value => [...String(value)].reduce((sum,c)=>(Math.imul(sum,31)+c.codePointAt(0))>>>0,0);
const PALETTE = ['#385d9d','#926126','#6c5194','#317d75','#a0445a','#3f738a','#657230'];
export const systemColor = id => PALETTE[hash(id)%PALETTE.length];
export const taskCard = node => ({systemId:node?.systemId??null,execution:node?.execution??'unknown',humanDecision:node?.humanDecision??null,systemEvidence:node?.systemEvidence??''});
export const isTask = node => ['activity','decision'].includes(node?.type);
export function mentionsSystem(text,label) {
 const haystack=normal(text),name=typeof label==='string'?normal(label):'';if(!name)return false;let index=-1;
 while((index=haystack.indexOf(name,index+1))!==-1){
  const before=haystack[index-1]||'',after=haystack[index+name.length]||'';
  if(!(/[\p{L}\p{N}]/u.test(name[0])&&/[\p{L}\p{N}]/u.test(before))&&!(/[\p{L}\p{N}]/u.test(name.at(-1))&&/[\p{L}\p{N}]/u.test(after)))return true;
 }
 return false;
}


export function validateRegistry(systems) {
 if(!Array.isArray(systems)||systems.length>MAX_SYSTEMS)return ['Use at most 30 systems.'];
 const ids=new Set(),labels=new Set(),errors=[];
 for(const system of systems){
  if(!system||!IDENTIFIER.test(system.id)||ids.has(system.id))errors.push('Each system needs a unique safe identifier.');
  if(typeof system?.label!=='string'||!system.label.trim()||system.label.length>80||labels.has(normal(system.label)))errors.push('Use distinct system names of 1–80 characters.');
  ids.add(system?.id);labels.add(normal(system?.label));
 }
 return [...new Set(errors)];
}

export function registerSystem(label,registry=[]) {
 if(typeof label!=='string'||!label.trim()||label.trim().length>80)throw new Error('Use a system name of 1–80 characters.');
 const errors=validateRegistry(registry);if(errors.length)throw new Error(errors[0]);
 label=label.replace(/\s+/g,' ').trim();
 const existing=registry.find(s=>normal(s.label)===normal(label));if(existing)return {...existing};
 if(registry.length>=MAX_SYSTEMS)throw new Error('Use at most 30 systems.');
 const base='sys_'+hash(normal(label)).toString(36);let id=base,i=2;
 while(registry.some(s=>s.id===id))id=base+'_'+i++;
 return {id,label};
}

export function mergeSystemRegistry(known=[],incoming=[]) {
 const errors=[...validateRegistry(known),...validateRegistry(incoming)];if(errors.length)throw new Error(errors[0]);
 const systems=known.map(s=>({id:s.id,label:s.label})),idMap=new Map();
 for(const item of incoming){
  let match=systems.find(s=>normal(s.label)===normal(item.label));
  if(!match){
   if(systems.length>=MAX_SYSTEMS)throw new Error('Use at most 30 systems.');
   match=registerSystem(item.label,systems);
   systems.push(match);
  }
  idMap.set(item.id,match.id);
 }
 return {systems,idMap};
}

export function withSystemRegistry(process,known=[]) {
 const {systems,idMap}=mergeSystemRegistry(known,process.systems??[]);
 return {...process,systems,nodes:Array.isArray(process.nodes)?process.nodes.map(node=>{
  const card=taskCard(node);
  return {...node,...card,systemId:idMap.get(card.systemId)||card.systemId};
 }):process.nodes};
}

export function validateSystemCards(process) {
 const registry=process.systems??[],errors=validateRegistry(registry);
 if(errors.length)return errors;
 const ids=new Set(registry.map(s=>s.id)),source=normal(process.source);
 for(const node of process.nodes||[]){
  const card=taskCard(node);
  if(card.systemId!==null&&(!IDENTIFIER.test(card.systemId)||!ids.has(card.systemId)))errors.push('A task refers to an unknown system.');
  if(!Object.hasOwn(EXECUTION_LABELS,card.execution)||![true,false,null].includes(card.humanDecision))errors.push('Use a valid execution mode and human-decision value.');
  if(typeof card.systemEvidence!=='string'||card.systemEvidence.length>1800)errors.push('System evidence must be a short exact source quotation.');
  else if((card.systemId!==null||card.execution!=='unknown'||card.humanDecision!==null)&&(!normal(card.systemEvidence)||!source.includes(normal(card.systemEvidence))))errors.push('System details need an exact source quote or a saved clarification.');
  if(card.systemId!==null&&ids.has(card.systemId)&&typeof card.systemEvidence==='string'&&!mentionsSystem(card.systemEvidence,registry.find(s=>s.id===card.systemId).label))errors.push('System evidence must name the selected system.');
  if(card.execution==='manual'&&card.systemId!==null)errors.push('A manual task cannot use software. Choose person using software instead.');
  if(card.execution==='automated'&&card.humanDecision===true)errors.push('An automatic task cannot include a human decision in the same task.');
  if(!isTask(node)&&(card.systemId!==null||card.execution!=='unknown'||card.humanDecision!==null))errors.push('System cards belong to activities and decisions.');
 }
 return [...new Set(errors)];
}

export function systemGaps(node) {
 if(!isTask(node))return [];
 const card=taskCard(node),gaps=[];
 if(card.systemId===null&&card.execution!=='manual')gaps.push('Which program is used for this task?');
 if(card.execution==='unknown')gaps.push('Does a person or software perform this task?');
 if(card.humanDecision===null)gaps.push('Does a person make the decision here?');
 return gaps;
}

export const SYSTEM_INSTRUCTIONS = `Map a system card for every activity and decision: systemId (registered system ID or null), execution (unknown, manual, assisted, automated), humanDecision (true, false or null), and systemEvidence (a short exact source quotation). Start/end markers have null systemId, unknown execution, null humanDecision and empty systemEvidence.
Manual means a person performs this task without software. Assisted means a person uses software. Automated means software executes this task without a person; it cannot also be a human decision. A human decision can be manual or assisted. Do not infer automation from a system name or infer human decision from a diamond shape.
Use only explicit source facts, including saved clarifications. Leave missing system, execution and human-decision information unknown; never guess a program from a role. Missing system-card fields are shown as focused prompts in the system card, so do not fill the general question budget with one question per missing card field. If any card value is known, systemEvidence must quote exactly the source text supporting it. Exclude future-only system needs from as-is cards.
Systems is a registry of {id,label}; an entry alone is not evidence that a task uses that system. Reuse supplied registry IDs and exact product labels; do not translate system names or abbreviations, expand BC, rename a known system, or choose colors. Add a system only when the source names it. For every non-null systemId, the EXACT contiguous systemEvidence quotation MUST itself contain that registered system's product name and support its use in this task. A name elsewhere in the document or its title is insufficient. Never insert a product name into a quotation. If no such quotation exists, use systemId:null; leave execution and humanDecision unknown unless independently supported by an exact quotation. In a user guide, commands such as Open the file or Click Export do not by themselves name a system. Preserve unrelated system cards and their exact evidence on edits and clarifications.`;
