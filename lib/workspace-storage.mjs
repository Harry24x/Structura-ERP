import {MAX_SOURCE, validateProcess} from './process.mjs';
import {withSystemRegistry} from './systems.mjs';
import {withBusinessAreas} from './business-areas.mjs';

export const WORKSPACE_STORE = 'team5-process-studio-v1';
const validProcess = process => !validateProcess(process).errors.length;
const normalizeProcess = process => withBusinessAreas(withSystemRegistry(process));

export function parseQualityOrigin(value){
 if(value===undefined||value===null)return null;
 if(typeof value.documentId!=='string'||!value.documentId||value.documentId.length>200||!Number.isSafeInteger(value.documentVersion)||value.documentVersion<1||!Number.isSafeInteger(value.processVersion)||value.processVersion<1||(value.revisionId!==null&&(typeof value.revisionId!=='string'||value.revisionId.length>200)))throw new Error('Invalid process card link.');
 return {documentId:value.documentId,documentVersion:value.documentVersion,processVersion:value.processVersion,revisionId:value.revisionId};
}

// Accept older workspaces without pending fields, and isolate damaged history
// entries so one bad entry cannot discard the current process.
export function parseWorkspace(text) {
 const saved = JSON.parse(text);
 if (!validProcess(saved?.process)) throw new Error('Invalid saved workspace.');
 const process = normalizeProcess(saved.process);
 const source = typeof saved.source === 'string' && saved.source.length <= MAX_SOURCE ? saved.source : process.source;
 const command = typeof saved.command === 'string' && saved.command.length <= 6000 ? saved.command : '';
 /** @type {Record<string,string>} */
 const answers = {};
 if (saved.answers && typeof saved.answers === 'object' && !Array.isArray(saved.answers)) {
  for (const question of process.questions) {
   const answer = saved.answers[question.id];
   if (typeof answer === 'string' && answer.length <= 2000) answers[question.id] = answer;
  }
 }
 return {process, source, command, answers,qualityOrigin:parseQualityOrigin(saved.qualityOrigin),
  sample: typeof saved.sample === 'string' ? saved.sample : 'custom',
  versions: Array.isArray(saved.versions) ? saved.versions.filter(validProcess).slice(-19).map(normalizeProcess) : []};
}

export function saveWorkspace(storage, workspace) {
 // Let quota and access errors reach the caller: only a successful write may
 // display the saved status. Failed writes leave the last saved copy intact.
 storage.setItem(WORKSPACE_STORE, JSON.stringify(workspace));
}

// A pending import must never turn a failed backup write into a default sample.
export function loadWorkspaceWithTransfer(storage) {
 const previous=storage.getItem(WORKSPACE_STORE),pending=storage.getItem('quality-process-transfer');
 let current=null;try{if(previous)current=parseWorkspace(previous);}catch{}
 if(!pending)return {workspace:current,transferFailed:false};
 try{
  const workspace=parseWorkspace(pending);
  if(previous)storage.setItem('quality-generator-before-import',previous);
  storage.removeItem('quality-process-transfer');
  return {workspace,transferFailed:false};
 }catch{return {workspace:current,transferFailed:true};}
}
