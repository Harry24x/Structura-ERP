import {QUALITY_TRANSLATIONS} from './translations.mjs';
import {translate as generatorText,TRANSLATIONS} from './lib/i18n.mjs';

export const LOCALE_STORE='team5-process-studio-language';
export const LANGUAGES=Object.freeze([{id:'et',label:'Eesti'},{id:'en',label:'English'},{id:'fr',label:'Français'},{id:'de',label:'Deutsch'}]);
export const normalizeLanguage=value=>LANGUAGES.some(l=>l.id===value)?value:'en';
let memoryLocale='en';
export function getLocale(){try{const saved=localStorage.getItem(LOCALE_STORE);return saved===null?memoryLocale:normalizeLanguage(saved);}catch{return memoryLocale;}}
// Only an intentional picker change writes the shared preference. Delayed
// storage/iframe notifications read the latest value and never echo it back.
export function setLanguagePreference(value){const next=memoryLocale=normalizeLanguage(value);try{if(localStorage.getItem(LOCALE_STORE)!==next)localStorage.setItem(LOCALE_STORE,next);}catch{}return next;}
export function syncLanguagePreference(value){let next=value;try{const saved=localStorage.getItem(LOCALE_STORE);if(saved!==null)next=saved;}catch{}return memoryLocale=normalizeLanguage(next);}
const normal=s=>String(s).replace(/\s+/g,' ').trim();
const escapeHTML=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function t(key,values={},locale=getLocale()){
 const text=String(key),trimmed=normal(text),entry=QUALITY_TRANSLATIONS[trimmed];
 let translated=entry&&locale!=='et'?entry[{en:0,fr:1,de:2}[normalizeLanguage(locale)]]:trimmed;
 if(!entry&&Object.hasOwn(TRANSLATIONS,trimmed))translated=generatorText(locale,trimmed);
 if(translated===undefined)translated=trimmed;
 return text.slice(0,text.indexOf(text.trimStart()))+translated.replace(/\{(\w+)\}/g,(match,k)=>Object.hasOwn(values,k)?String(values[k]):match)+text.slice(text.trimEnd().length);
}
// Only source-authored template text is translated. Interpolated values remain opaque:
// process names, evidence, history, email addresses and form data are never inspected.
function templateText(text,locale,attribute=false){
 const params={},indexes=new Map();
 const key=text.replace(/__studio_slot_(\d+)__/g,(token,i)=>{if(!indexes.has(i))indexes.set(i,indexes.size);const n=indexes.get(i);params[n]=token;return '{'+n+'}';});
 const entry=QUALITY_TRANSLATIONS[normal(key)];
 if(entry){const translated=t(key,{},locale);return (attribute?escapeHTML(translated):escapeHTML(translated)).replace(/\{(\d+)\}/g,(m,i)=>params[i]??m);}
 // Templates assembled from HTML fragments can have separate message fragments.
 return text.split(/(__studio_slot_\d+__)/g).map(part=>/^__studio_slot_\d+__$/.test(part)?part:QUALITY_TRANSLATIONS[normal(part)]?escapeHTML(t(part,{},locale)):part).join('');
}
export function localizeHTML(source,locale=getLocale()){
 return source.replace(/<input\b[^>]*\btype=["']file["'][^>]*>/g,input=>'<span class="file-picker-control"><span class="file-picker-caption">'+escapeHTML(t('Vali fail',{},locale))+'</span>'+input+'</span>')
  .replace(/((?:aria-label|title|placeholder|alt)\s*=\s*)(["'])(.*?)\2/g,(_,prefix,quote,value)=>prefix+quote+templateText(value,locale,true)+quote)
  .replace(/(^|>)([^<>]*)(?=<|$)/g,(_,start,text)=>start+templateText(text,locale));
}
export function html(strings,...values){
 let source=strings[0];for(let i=0;i<values.length;i++)source+='__studio_slot_'+i+'__'+strings[i+1];
 return localizeHTML(source).replace(/__studio_slot_(\d+)__/g,(_,i)=>String(values[i]??''));
}
export function message(text,locale=getLocale()){
 if(QUALITY_TRANSLATIONS[normal(text)])return t(text,{},locale);
 // Interpolate server validation messages without translating the user's values.
 for(const key of Object.keys(QUALITY_TRANSLATIONS)){
  if(!/\{\d+\}/.test(key))continue;
  const names=[];const pattern=key.split(/(\{\d+\})/g).map(part=>/^\{\d+\}$/.test(part)?(names.push(part.slice(1,-1)),'(.+?)'):part.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('');
  const match=normal(text).match(new RegExp('^'+pattern+'$','u'));if(match)return t(key,Object.fromEntries(names.map((name,i)=>[name,key==='{0}: sisesta 1–{1} märki.'&&i===0?t(match[i+1],{},locale):match[i+1]])),locale);
 }
 return String(text);
}
export function languagePicker(){return html`<label class="quality-language">${t('Keel')}<select id="quality-language" aria-label="${t('Keel')}">${LANGUAGES.map(l=>html`<option value="${l.id}" ${getLocale()===l.id?'selected':''}>${l.label}</option>`).join('')}</select></label>`;}
export function preserveForms(render){
 const drafts=[...document.querySelectorAll('form[id]')].map(form=>[form.id,[...form.elements].filter(el=>el.name&&el.type!=='file').map(el=>({name:el.name,value:el.value,checked:el.checked,type:el.type}))]);
 const active=document.activeElement,focus=active?.name?{form:active.form?.id,name:active.name,start:active.selectionStart,end:active.selectionEnd}:null;
 render();
 for(const [id,fields]of drafts){const form=document.getElementById(id);if(!form)continue;for(const f of fields){const el=form.elements.namedItem(f.name);if(!el||typeof el.value!=='string')continue;el.value=f.value;if(['checkbox','radio'].includes(f.type))el.checked=f.checked;}}
 if(focus){const el=document.getElementById(focus.form)?.elements.namedItem(focus.name);el?.focus({preventScroll:true});try{el?.setSelectionRange(focus.start,focus.end);}catch{}}
}
export function installLanguage(render,title){
 const apply=()=>{document.documentElement.lang=getLocale();document.title=t(title);preserveForms(render);};
 window.addEventListener('storage',e=>{if(e.key===LOCALE_STORE){syncLanguagePreference(e.newValue);apply();}});
 window.addEventListener('message',e=>{if(e.origin===location.origin&&e.source===window.parent&&e.data?.type==='studio:locale'){syncLanguagePreference(e.data.locale);apply();}});
 document.addEventListener('change',e=>{if(e.target.id==='quality-language'){const locale=setLanguagePreference(e.target.value);apply();if(window.parent!==window)window.parent.postMessage({type:'studio:locale',locale},location.origin);}});
 document.documentElement.lang=getLocale();document.title=t(title);
 const boot=document.querySelector('.boot');if(boot)boot.textContent=t(boot.textContent);
}
