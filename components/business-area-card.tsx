"use client";
import {useState} from 'react';
import {ArrowRight,Check,ExternalLink} from 'lucide-react';
import {areaCard,areaDefinition,BUSINESS_AREAS,BUSINESS_REFERENCE} from '@/lib/business-areas.mjs';
import {saveBusinessArea} from '@/lib/process.mjs';
import {isTask} from '@/lib/systems.mjs';
import {clientErrorKey} from '@/lib/i18n.mjs';

export function AreaBadge({node,t}:any){
 const card=areaCard(node),area=areaDefinition(card.businessArea);
 return <span className="area-badge" title={card.areaReason||t('No area assignment yet.')}><i style={{background:area.color}}/>{t(area.label)}<small>{t(card.businessArea==='unknown'?'Unclassified':card.areaReviewed?'Confirmed':'Suggested')}</small></span>;
}

export function BusinessAreaCard({process,node,t,onSave,disabled}:any){
 const initial=areaCard(node),[area,setArea]=useState(initial.businessArea),[reason,setReason]=useState(initial.areaReason),[error,setError]=useState('');
 const changed=area!==initial.businessArea||reason.trim()!==initial.areaReason;
 function save(){try{onSave(saveBusinessArea(process,node.id,area,reason));}catch(error){setError(clientErrorKey(error));}}
 return <section className="business-area-editor" aria-label={t('Business area')}>
  <h4>{t('Business area')}</h4><AreaBadge node={node} t={t}/>
  <p>{t('Classify the action, separately from its role and software.')}</p>
  <label htmlFor="task-business-area">{t('Area assignment')}</label>
  <select id="task-business-area" value={area} disabled={disabled} onChange={event=>{setArea(event.target.value);setError('');}}>{BUSINESS_AREAS.map(item=><option value={item.id} key={item.id}>{t(item.label)}</option>)}</select>
  <label htmlFor="task-area-reason">{t('Reason for this area')}</label>
  <textarea id="task-area-reason" value={reason} disabled={disabled} maxLength={600} rows={3} placeholder={t('Explain the assignment using this activity and its source evidence.')} onChange={event=>{setReason(event.target.value);setError('');}}/>
  <p>{t('Saving confirms your assignment and creates an unreviewed version. The source and process connections stay unchanged.')}</p>
  {error&&<p className="ai-error" role="alert">{t(error)}</p>}
  <button className="button primary full" disabled={disabled||(!changed&&(initial.areaReviewed||area==='unknown'))||(area!=='unknown'&&!reason.trim())} onClick={save}><Check size={15}/>{t('Save area assignment')}</button>
 </section>;
}

export function BusinessAreaLegend({process,t,onComplete}:any){
 const tasks=process.nodes.filter(isTask),pending=tasks.filter((node:any)=>!areaCard(node).areaReviewed).length;
 return <section className="business-area-legend" aria-label={t('Business areas')}>
  <div className="system-legend-heading"><h3>{t('Business areas')}</h3><button onClick={onComplete}>{t('Review area assignments')}<ArrowRight size={12}/></button></div>
  <div className="business-area-keys">{BUSINESS_AREAS.map(area=>{const count=tasks.filter((node:any)=>areaCard(node).businessArea===area.id).length;return count?<span key={area.id}><i style={{background:area.color}}/>{t(area.label)}<small>{count}</small></span>:null;})}</div>
  <p>{t('A business area describes the work. A system describes the software.')}{pending>0?' '+t('{count} area assignments need review',{count:pending}):''}</p>
  <details className="business-reference"><summary>{t('Business Central reference')}</summary><p>{t('Our project uses a small set of areas aligned with Microsoft documentation. Reference steps are never inserted into your process.')}</p><a href={BUSINESS_REFERENCE.url} target="_blank" rel="noreferrer">{t('Official Business Central warehouse flow')}<ExternalLink size={12}/></a><a href={BUSINESS_REFERENCE.catalogUrl} target="_blank" rel="noreferrer">{t('Microsoft process levels')}<ExternalLink size={12}/></a><div className="area-reference-links">{BUSINESS_AREAS.filter(area=>area.url).map(area=><a key={area.id} href={area.url!} target="_blank" rel="noreferrer">{t(area.label)}<ExternalLink size={11}/></a>)}</div></details>
 </section>;
}
