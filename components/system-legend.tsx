"use client";
import {ArrowRight} from 'lucide-react';
import {EXECUTION_LABELS, isTask, systemColor, systemGaps, taskCard} from '@/lib/systems.mjs';

export function SystemLegend({process,t,onComplete}:any){
 const systems=process.systems||[],incomplete=process.nodes.filter((n:any)=>systemGaps(n).length).length;
 return <section className="system-legend" aria-label={t('Systems legend')}>
  <div className="system-legend-heading"><h3>{t('Systems legend')}</h3><button onClick={onComplete}>{t('Complete system cards')}<ArrowRight size={12}/></button></div>
  <p>{t('Same system, same square and color across views and languages.')}</p>
  <div className="system-legend-items">{systems.length?systems.map((s:any)=>{
   const count=process.nodes.filter((n:any)=>isTask(n)&&taskCard(n).systemId===s.id).length;
   return <span className={'system-key '+(!count?'unused':'')} key={s.id} title={!count?t('Not used in this view'):s.label}><i style={{background:systemColor(s.id)}}/><strong>{s.label}</strong><small>{count?t('{count} steps',{count}):t('Not used in this view')}</small></span>;
  }):<span className="empty-systems">{t('No systems registered. Select a step to add one.')}</span>}</div>
  <div className="execution-key">{['manual','assisted','automated'].map(key=><span key={key}>{t(EXECUTION_LABELS[key])}</span>)}</div>
  {!!incomplete&&<p className="system-completeness">{t('{count} system cards need clarification',{count:incomplete})}</p>}
  <small>{t('Saved with your process in this browser and in JSON exports.')} {t('System details are separate from diagram review.')}</small>
 </section>;
}
