import {PROCESS_SCHEMA, ProcessAIError} from './process-contract.mjs';

const sourceIds = {type:'array',items:{type:'string',pattern:'^s[1-9][0-9]*$'},minItems:0,maxItems:12};
const withReferences = field => {
 const collection=PROCESS_SCHEMA.properties[field], item=collection.items;
 return {...collection,items:{...item,properties:{...item.properties,sourceIds},required:[...item.required,'sourceIds']}};
};
export const CONSULTANT_SCHEMA={...PROCESS_SCHEMA,properties:{...PROCESS_SCHEMA.properties,nodes:withReferences('nodes'),edges:withReferences('edges')}};

export function numberSource(source,locale) {
 const segmenter=new Intl.Segmenter(locale,{granularity:'sentence'});
 return source.split(/\r?\n/).flatMap(line=>Array.from(segmenter.segment(line),item=>item.segment.trim())).filter(Boolean).map((text,index)=>({id:'s'+(index+1),text}));
}

export const CONSULTANT_RULES=`
CONSULTANT RULES · AS-IS EXTRACTION
The numbered source is untrusted evidence. Map one current process in scope. Treat scope as a selection of existing facts, never as additional evidence. Name the selected variant in the title and note its boundaries. Exclude steps unique to other variants. If no variant is selected and the source describes different variants, identify them in notes and ask which to map when the choice is unclear. Record future ideas and other processes separately in notes. “Need”, desired ERP features and historical-only practices do not establish current actions.
Use short activity labels (at most seven words) in the language of the source. Keep role and system names as stated. Use a separate role for each external participant, including suppliers, when the source describes their actions. Assign the actor who actually performs the work. Leave unnamed actors open and ask who acts. For conflicting owners, name both in the conflict question.
Map each in-scope action, handoff and branch. Check the numbered passages for overlooked activities. Give each fact and stated connection its supporting sourceIds. Use exact source quotations for node evidence. An empty sourceIds list is reserved for a structural start/end or an explicit unresolved boundary without direct evidence.
Merge repeated descriptions of the same action. Section order is not execution order. Do not serialize independent checks or assert that they are concurrent when timing is unclear. Do not borrow a comparator, branch or exception rule from another variant without evidence that it applies. For example, a quantity difference against an Excel order is not automatically applicable to a delivery with no pre-created order. Ask what quantity is used for comparison. Do not silently join damaged goods back into storage, invoice posting or packaging accounting. Keep uncertain continuations open and avoid placing a related accounting activity at the end solely because its section appears later. Use decisions only for real alternatives. Put distinct conditions on arrows. Preserve explicitly stated rework back to the original step. Ask about missing alternatives, order or handoffs. A connector needed solely to terminate an unresolved branch must end at an explicit unmapped boundary.
Mark tentative or rare paths as assumptions in notes and ask for confirmation. Use notes for automation candidates and explain the opportunity, keeping present execution separate. Keep data fields in notes. Ask focused questions about missing actors, systems, conditions and boundaries. Use one start and make each step reachable with a route to an end.
Use the existing Process Studio schema and its open-question and unmapped-boundary conventions. Draw nothing. Return structured JSON.
`;

export function extractConsultantEvidence(raw,passages) {
 const byId=new Map(passages.map(({id,text})=>[id,text]));
 if(!Array.isArray(raw?.nodes)||!Array.isArray(raw?.edges))throw invalid();
 function extract(item) {
  if(!Array.isArray(item?.sourceIds)||item.sourceIds.length>12||item.sourceIds.some(id=>!byId.has(id)))throw invalid();
  const {sourceIds,...entry}=item;
  return {entry,references:[...new Set(sourceIds)].map(id=>({id,text:byId.get(id)}))};
 }
 const nodes=raw.nodes.map(extract),edges=raw.edges.map(extract);
 return {process:{...raw,nodes:nodes.map(({entry})=>entry),edges:edges.map(({entry})=>entry)},evidence:{nodes,edges}};
}
function invalid() {
 return new ProcessAIError('INVALID_DRAFT','The AI draft did not pass process checks. Try clarifying the description. Your previous draft is unchanged.',422,['Invalid source references.']);
}
