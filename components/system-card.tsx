"use client";
import {useState} from 'react';
import {Check, CircleHelp} from 'lucide-react';
import {DECISION_LABELS, EXECUTION_LABELS, registerSystem, systemGaps, taskCard} from '@/lib/systems.mjs';
import {saveSystemCard} from '@/lib/process.mjs';
import {clientErrorKey} from '@/lib/i18n.mjs';

export function SystemCard({process,node,t,onSave,disabled}:any){
 const initial=taskCard(node),[systemId,setSystemId]=useState(initial.systemId||''),[newName,setNewName]=useState('');
 const [execution,setExecution]=useState(initial.execution),[decision,setDecision]=useState(initial.humanDecision===null?'unknown':initial.humanDecision?'yes':'no');
 const [error,setError]=useState('');
 const changed=systemId!==(initial.systemId||'')||execution!==initial.execution||decision!==(initial.humanDecision===null?'unknown':initial.humanDecision?'yes':'no');
 function save(){try{
  let systems=[...(process.systems||[])],id=systemId||null;
  if(systemId==='__new'){const system=registerSystem(newName,systems);if(!systems.some((s:any)=>s.id===system.id))systems.push(system);id=system.id;}
  const humanDecision=decision==='unknown'?null:decision==='yes';
  const system=systems.find((s:any)=>s.id===id);
  const confirmation=t('System: {system}. Execution: {execution}. Human decision: {decision}.',{system:system?.label||t(execution==='manual'?'No software':'System unknown'),execution:t(EXECUTION_LABELS[execution]),decision:t(DECISION_LABELS[decision])});
  const next=saveSystemCard(process,node.id,{systems,systemId:id,execution,humanDecision},confirmation);
  onSave(next);
 }catch(e){setError(clientErrorKey(e));}}
 return <section className="system-card-editor" aria-label={t('System card')}>
  <h4>{t('System card')}</h4>
  <label htmlFor="task-system">{t('System')}</label>
  <select id="task-system" value={systemId} disabled={disabled} onChange={e=>{setSystemId(e.target.value);setError('');}}>
   <option value="">{t(execution==='manual'?'No software':'System unknown')}</option>
   {(process.systems||[]).map((s:any)=><option key={s.id} value={s.id}>{s.label}</option>)}
   <option value="__new">{t('Add a system…')}</option>
  </select>
  {systemId==='__new'&&<><label htmlFor="new-system-name">{t('System name')}</label><input id="new-system-name" value={newName} onChange={e=>{setNewName(e.target.value);setError('');}} maxLength={80} placeholder={t('e.g. BC, Excel, email')} disabled={disabled}/></>}
  <label htmlFor="task-execution">{t('Execution')}</label>
  <select id="task-execution" value={execution} disabled={disabled} onChange={e=>{setExecution(e.target.value);setError('');}}>{Object.entries(EXECUTION_LABELS).map(([id,label])=><option value={id} key={id}>{t(label)}</option>)}</select>
  <label htmlFor="task-human-decision">{t('Human decision')}</label>
  <select id="task-human-decision" value={decision} disabled={disabled} onChange={e=>{setDecision(e.target.value);setError('');}}>{Object.entries(DECISION_LABELS).map(([id,label])=><option value={id} key={id}>{t(label)}</option>)}</select>
  <p className="system-card-hint">{t('Manual means no software for this task. A human decision may be manual or use software.')}</p>
  {!!systemGaps(node).length&&<ul className="system-gaps">{systemGaps(node).map((gap:string)=><li key={gap}><CircleHelp size={12}/>{t(gap)}</li>)}</ul>}
  {initial.systemEvidence&&<><label>{t('Evidence for system card')}</label><blockquote>{initial.systemEvidence}</blockquote></>}
  <p className="system-card-hint">{t('Saving records your answers as a clarification and creates an unreviewed version.')}</p>
  {error&&<p className="ai-error" role="alert">{t(error)}</p>}
  <button className="button primary full" disabled={disabled||!changed||(systemId==='__new'&&!newName.trim())} onClick={save}><Check size={15}/>{t('Save system card')}</button>
 </section>;
}
