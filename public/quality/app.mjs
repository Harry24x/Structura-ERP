import './process-explorer.mjs';
import {EXECUTION_LABELS} from './lib/systems.mjs';
import {BUSINESS_AREAS} from './lib/business-areas.mjs';
import {translate} from './lib/i18n.mjs';
import {message as localizeMessage,t,html,localizeHTML,getLocale,languagePicker,installLanguage} from './i18n.mjs';
import {toSVG,validateProcess} from './lib/process.mjs';
import {DIRECTION_STORE,normalizeDirection} from './lib/diagram-direction.mjs';
import {svgSize,fitScale} from './diagram-view.mjs';
import {filterDocuments,activeDocumentId} from './library.mjs';
import {CloudWorkspace} from './cloud.mjs';
import {sourceHash,pendingImport,findSource,importedDraft,importScope} from './batch-import.mjs';
import {partsFromProcess,syncProcess} from './shared-model.mjs';
import {originForDocument,updateFromGenerator,mergeGeneratorCopy} from './roundtrip.mjs';
import {AREAS,ROLES,roleLabel,canManage,canPropose,proposalRole,STATUSES,LIMITS,uid,stamp,areaLabel,validateFile,createPart,updatePart,createProposal,reviewProposal,implementProposal,visibleParts,visibleProposals,textRegions,validateBackup} from './core.mjs';

const $=selector=>document.querySelector(selector),app=$('#app');
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
let batchActive=false,batchStopped=false,batchLog=[],batchStage='',batchPrefix='';
const date=value=>new Intl.DateTimeFormat(getLocale(),{dateStyle:'short',timeStyle:'short'}).format(new Date(value));
const ui={role:'manager',name:t('Kvaliteedijuht'),names:{manager:t('Kvaliteedijuht'),consultant:t('Digmatix ERP consultant'),employee:t('Töötaja'),client:t('Klient')},area:'purchasing',page:1,zoom:1,autoFit:true,direction:'LR',expanded:false,aiToolsOpen:false,view:'pdf',panel:'part',partId:null,proposalId:null,drawing:false,pendingBounds:null,suggestions:null,filter:'all',documentSearch:'',drafts:{},reviews:{}};
let shareGrants=[],shareLoadError='';
async function sharingRequest(input){const response=await fetch('/api/shares'+(input?'':'?view=owner'),{method:input?'POST':'GET',credentials:'same-origin',cache:'no-store',headers:input?{'Content-Type':'application/json'}:undefined,body:input?JSON.stringify(input):undefined});const data=await response.json();if(!response.ok)throw new Error(data.error||t('Jagamist ei saanud salvestada.'));return data;}
async function loadGrants(){try{shareGrants=(await sharingRequest()).grants;shareLoadError='';}catch(e){shareLoadError=e.message;}}
let db,documents=[],proposals=[],doc=null,asset=null,examples=[],busy=false,saving=false,importController=null,operation=0,renderJob=null,renderGeneration=0;
try{ui.direction=normalizeDirection(localStorage.getItem(DIRECTION_STORE));}catch{}
let viewportObserver,viewportFrame,cloudStatus='connecting',refreshing=false,accountConnected=false;
const embedded=new URLSearchParams(location.search).get('embedded')==='1';document.body.classList.toggle('embedded',embedded);
const cloud=new CloudWorkspace(status=>{cloudStatus=status;const label=$('#account-status');if(label)label.textContent=accountStatus();});
function accountStatus(){return cloudStatus==='saving'?t('Salvestan kontole…'):cloudStatus==='error'?t('Salvestamine ebaõnnestus'):cloudStatus==='connecting'?t('Ühendan kontoga…'):t('Salvestatud sinu kontole');}
const draftKey=()=>`${doc?.id}:${ui.partId}:${ui.name}${ui.role==='client'?':client':''}`;
const actor=()=>({role:ui.role,name:ui.name.trim()|| roleLabel(ui.role),area:ui.area,canProposeAnyArea:cloud.snapshot?.permissions.propose===true});
const areaOptions=(value,all=false)=>`${all?localizeHTML('<option value="all">Kõik valdkonnad</option>'):''}${AREAS.map(([id,name])=>html`<option value="${id}" ${id===value?'selected':''}>${t(name)}</option>`).join('')}`;
const button=(action,label,extra='')=>html`<button type="button" data-action="${action}" ${extra}>${label}</button>`;
const badge=status=>html`<span class="status ${esc(status)}">${esc(t(STATUSES[status]||status))}</span>`;
function notify(message,error=false){const toast=$('#toast');toast.textContent=localizeMessage(message);toast.className=error?'error':'show';clearTimeout(notify.timer);notify.timer=setTimeout(()=>{toast.textContent='';toast.className='';},7000);}
function openDB(){return new Promise((resolve,reject)=>{const request=indexedDB.open('process-studio-quality-pilot',1);request.onupgradeneeded=()=>{for(const name of ['documents','files','proposals'])request.result.createObjectStore(name,{keyPath:'id'});};request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(new Error(t('Brauseri andmebaasi ei saa avada. Kontrolli salvestusruumi õigusi.')));request.onblocked=()=>reject(new Error(t('Sulge selle katseversiooni teised aknad ja proovi uuesti.')));});}
function readLocal(name,key){return new Promise((resolve,reject)=>{const request=key?db.transaction(name).objectStore(name).get(key):db.transaction(name).objectStore(name).getAll();request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});}
function writeLocal(records,expected=[]){return new Promise((resolve,reject)=>{
 const names=[...new Set([...records.map(record=>record.store),...(expected.length?['documents']:[])])],transaction=db.transaction(names,'readwrite');let failure;
 const checks=expected.map(d=>({id:d.id,version:d.version,revisionId:d.revisionId||null,processVersion:d.process?.version}));
 const put=()=>{for(const record of records){transaction.objectStore(record.store).put(record.value);}};
 let remaining=checks.length;if(!remaining)put();
 for(const check of checks){const request=transaction.objectStore('documents').get(check.id);request.onsuccess=()=>{const current=request.result;if(!current||current.version!==check.version||(current.revisionId||null)!==check.revisionId||current.process?.version!==check.processVersion){failure=new Error(t('Kaart muutus teises aknas. Ava uusim kaart uuesti; senist tööd ei kirjutatud üle.'));transaction.abort();return;}if(!--remaining)put();};}
 transaction.oncomplete=resolve;transaction.onerror=()=>reject(failure||new Error(t('Salvestamine ebaõnnestus. Varasem salvestatud töö on alles. Kontrolli brauseri vaba ruumi.')));transaction.onabort=()=>reject(failure||new Error(t('Salvestamine katkestati. Varasem töö on alles.')));
});}
async function readStore(name,key){
 if(name!=='files'){const list=cloud.snapshot?.[name]||[];return key?list.find(r=>r.id===key):structuredClone(list);}
 const cached=await readLocal('files',key),meta=cloud.snapshot?.files.find(f=>f.id===key);
 if(cached&&meta&&cached.cloudVersion===meta.version)return cached;
 const result=await cloud.file(key);try{await writeLocal([{store:'files',value:result}]);}catch{}return result;
}
async function write(records,expected=[]){
 try{await cloud.commit(records,expected);}catch(error){if(error.status===409)await refreshCloud(true);throw error;}
 try{const cached=records.map(r=>r.store==='files'?{store:r.store,value:{...r.value,cloudVersion:cloud.snapshot.files.find(f=>f.id===r.value.id)?.version}}:r);await writeLocal(cached);}catch{notify(t('Kontole salvestatud. Selle brauseri vahemälu ei saanud uuendada.'));}
}
async function refreshCloud(force=false){
 if(!accountConnected||refreshing||(!force&&(busy||saving)))return;refreshing=true;
 try{const revision=cloud.snapshot?.revision;await cloud.refresh();if(force||ui.cloudNewer||revision!==cloud.snapshot.revision){
  const editing=document.activeElement?.closest('form')||$('#quality-explorer')?.shadowRoot?.activeElement?.closest('form');if(editing&&!force){ui.cloudNewer=true;cloudStatus='saved';if(!$('#cloud-update-notice'))app.insertAdjacentHTML('afterbegin',localizeHTML('<div class="demo-note" id="cloud-update-notice">Kontol on uuem töö. Pooleli tekst on alles. ')+button('refresh-cloud',t('Värskenda kontolt'))+localizeHTML('</div>'));return;}
  documents=structuredClone(cloud.snapshot.documents);proposals=structuredClone(cloud.snapshot.proposals);if(doc)doc=documents.find(d=>d.id===doc.id)||doc;ui.cloudNewer=false;cloudStatus='saved';render();
 }}catch{cloudStatus='error';const status=$('#account-status');if(status)status.textContent=t('Konto ühendus katkes · proovi värskendamist');}finally{refreshing=false;}
}
async function archiveLocal(records){
 if(!records.documents.length)return;
 await new Promise((resolve,reject)=>{const request=indexedDB.open('process-studio-migration-archive',1);request.onupgradeneeded=()=>request.result.createObjectStore('backups',{keyPath:'id'});request.onerror=()=>reject(request.error);request.onsuccess=()=>{const archive=request.result,tx=archive.transaction('backups','readwrite');tx.objectStore('backups').put({id:cloud.snapshot.user.id+':'+Date.now(),at:stamp(),...records});tx.oncomplete=()=>{archive.close();resolve();};tx.onerror=()=>{archive.close();reject(tx.error);};};});
}
async function connectAccount(){
 const local={documents:await readLocal('documents'),proposals:await readLocal('proposals'),files:await readLocal('files')};
 await cloud.refresh();
 const cacheOwner=localStorage.getItem('process-studio-cache-owner');ui.adoptLegacyDrafts=!cacheOwner||cacheOwner===cloud.snapshot.user.id;
 if(local.documents.length&&(!cacheOwner||cacheOwner===cloud.snapshot.user.id)){try{if(!cacheOwner||local.documents.some(d=>!cloud.snapshot.documents.some(c=>c.id===d.id)))await archiveLocal(local);}catch{notify(t('Kohalik varasem töö jääb senisesse brauseri mällu. Konto ühendus on valmis.'));}
  for(const d of local.documents){if(cloud.snapshot.documents.some(c=>c.id===d.id))continue;
   const file=local.files.find(f=>f.id===d.id);if(!file?.blob){notify(t('Ühe kohaliku kaardi algfail puudub; senist kaarti ei kustutatud.'),true);continue;}
   for(let attempt=0;attempt<3;attempt++){try{if(cloud.snapshot.documents.some(c=>c.id===d.id))break;await cloud.commit([{store:'documents',value:d},{store:'files',value:file},...local.proposals.filter(p=>p.docId===d.id).map(p=>({store:'proposals',value:p}))]);break;}catch(error){if(error.status!==409||attempt===2)throw error;await cloud.refresh();}}
  }
 }
 localStorage.setItem('process-studio-cache-owner',cloud.snapshot.user.id);
 documents=structuredClone(cloud.snapshot.documents);proposals=structuredClone(cloud.snapshot.proposals);cloudStatus='saved';
 await loadGrants();accountConnected=true;ui.role=cloud.snapshot.user.role||'manager';try{const savedRole=localStorage.getItem('quality-work-role:'+cloud.snapshot.user.id);if(Object.hasOwn(ROLES,savedRole))ui.role=savedRole;}catch{}ui.name=cloud.snapshot.user.name;ui.names=Object.fromEntries(Object.keys(ROLES).map(role=>[role,ui.name]));
}
setInterval(()=>{if(!document.hidden)void refreshCloud();},12000);window.addEventListener('focus',()=>void refreshCloud());
function rememberDocument(id){try{localStorage.setItem('quality-pilot-active-document',id);}catch{}}
function saveDrafts(){try{localStorage.setItem('quality-pilot-form-drafts:'+cloud.snapshot.user.id,JSON.stringify({drafts:ui.drafts,reviews:ui.reviews}));}catch{notify(t('Pooleli vormi ei saanud brauserisse salvestada. Kopeeri tekst enne lehe sulgemist.'),true);}}
async function saveDoc(next,proposal,afterSave){
 next=syncProcess(next);
 await write([{store:'documents',value:next},...(proposal?[{store:'proposals',value:proposal}]:[])],doc?[doc]:[]);
 doc=next;documents=documents.map(item=>item.id===next.id?next:item);
 if(proposal){const index=proposals.findIndex(item=>item.id===proposal.id);if(index<0)proposals.push(proposal);else proposals[index]=proposal;}
 afterSave?.();render();
}
function parts(){return doc?visibleParts(doc,cloud.snapshot?.permissions.manage?{role:'manager'}:actor()).filter(part=>canPropose(ui.role)||ui.filter==='all'||part.area===ui.filter):[];}
function queue(){return doc?visibleProposals(proposals,doc,cloud.snapshot?.permissions.manage?{role:'manager'}:actor()).sort((a,b)=>b.createdAt.localeCompare(a.createdAt)):[];}
function ensureSelection(){if(doc&&!parts().some(part=>part.id===ui.partId))ui.partId=parts()[0]?.id||null;if(ui.proposalId&&!queue().some(proposal=>proposal.id===ui.proposalId))ui.proposalId=null;}
function header(){return html`<header class="top"><a class="brand" href="/"><img class="brand-icon" src="/favicon.svg" alt=""><span>Process Studio</span></a><span class="local-pill">PROTOTÜÜP 50</span><a class="generator-link" href="/?view=generator" data-action="generator-view">Tekstigeneraator</a></header>
 <section class="workspace-bar"><h1>Protsessid ja parendused</h1><span class="save account-save" id="account-status" role="status">${esc(accountStatus())}</span><div class="role-switch">${embedded?'':languagePicker()}<label for="role">Töövaade</label><select id="role">${Object.entries(ROLES).map(([id,label])=>html`<option value="${id}" ${ui.role===id?'selected':''}>${t(label)}</option>`).join('')}</select><label class="sr" for="person">Sisse logitud konto</label><input id="person" aria-label="Sisse logitud konto" value="${esc(ui.name)}" readonly maxlength="100"><label class="sr" for="my-area">Minu valdkond</label><select id="my-area" aria-label="Minu valdkond">${areaOptions(ui.area)}</select></div><details class="workspace-help"><summary>Konto ja abi</summary><p>${esc(cloud.snapshot?.user.email||'')} · konto omanik. Protsessid, algfailid ja ettepanekute ajalugu salvestuvad sinu kontole ning avanevad sama kontoga ka teises brauseris.</p><p>Kvaliteedijuht ja Digmatix ERP consultant saavad hallata oma konto protsesse, vaadata ettepanekuid üle ning jagada sammu või kogu protsessi töötaja või kliendiga. Töövaate valimine ei anna ligipääsu teise inimese kontole. AI kasutab olemasolevat serveriseadistust.</p>${button('refresh-cloud',t('Värskenda kontolt'))}${button('shared-view',t('Mulle jagatud osad'))}</details></section>`;}
function sidebar(){return html`<aside class="sidebar"><div class="side-top"><h2>Minu protsessid <small>${documents.filter(d=>!d.supersededBy).length}</small></h2><label class="upload ${busy?'disabled':''}"><strong>＋ Impordi PDF või pilt</strong><span>PDF, PNG, JPG · kuni 20 MB</span><input id="upload" type="file" accept=".pdf,.png,.jpg,.jpeg" ${busy?'disabled':''}></label>${busy&&!batchActive?html`<div class="progress" role="status"><span id="progress-text">${aiBusy?t('AI koostab mustandit…'):t('Loen dokumenti…')}</span>${button(aiBusy?'ai-cancel':'cancel-import',aiBusy?t('Katkesta AI päring'):t('Katkesta'))}</div>`:''}
 ${batchPanel()}
 ${examples.length?html`<details class="source-library"><summary>DigiMK kohalikud allikad <small>${examples.length}</small></summary><p>Algfailide kohalikud lugemiskoopiad. Ajalooline allikas ei kinnita tänast töökorraldust.</p><label class="sr" for="example">DigiMK fail</label><select id="example">${examples.map(example=>html`<option value="${esc(example.id)}">${esc(example.name)}</option>`).join('')}</select>${button('load-example',t('Ava valitud allikas'),busy?'disabled':'')}</details>`:''}
 <label class="process-search">Otsi protsessi<input id="document-search" type="search" maxlength="160" value="${esc(ui.documentSearch)}" placeholder="Nimi või skeemi pealkiri"></label><div class="document-list">${filterDocuments(documents,ui.documentSearch).map(item=>html`<button class="document ${doc?.id===item.id?'selected':''}" data-action="select-document" data-id="${esc(item.id)}"><span class="file-icon">${item.format==='pdf'?'PDF':t('PILT')}</span><span>${esc(item.name)}<small>${item.pages.length} ${item.pages.length===1?t('lehekülg'):t('lehekülge')} · kaart v${item.version}</small></span></button>`).join('')||localizeHTML('<p class="muted">Alusta ühe vooskeemi importimisest.</p>')}</div></div>
 ${documents.some(d=>d.supersededBy)?html`<details><summary>Varasemad generaatorikoopiad</summary>${documents.filter(d=>d.supersededBy).map(d=>button('select-document',esc(d.name),`data-id="${esc(d.id)}"`)).join('')}</details>`:''}
 <div class="library-tools"><label>Taasta varukoopia<input id="restore-library" type="file" accept=".json"></label></div>${doc&&canManage(ui.role)?html`<details class="rename-process"><summary>Nimeta protsess</summary><form id="rename-process"><label>Protsessi nimi<input name="name" maxlength="300" required value="${esc(doc.name)}"></label><button type="submit">Salvesta nimi</button></form></details>`:''}${doc?html`<div class="parts-head"><h2>Protsessiosad <small>${parts().length}</small></h2>${canManage(ui.role)?html`<select id="filter" aria-label="Protsessiosade valdkonnafilter">${areaOptions(ui.filter,true)}</select>`:html`<p>${esc(t(areaLabel(ui.area)))} · sinu töövaade</p>`}</div><div class="part-list">${parts().map((part,index)=>html`<button class="part ${part.id===ui.partId?'selected':''}" data-action="select-part" data-id="${esc(part.id)}"><span>${index+1}</span><span>${esc(part.label)}<small>${esc(t(areaLabel(part.area)))} · lk ${part.page}${part.diagramOnly?t(' · ainult digitaalsel skeemil'):part.suggested?t(' · vajab ülevaatust'):''}</small></span><em>${proposals.filter(p=>p.partId===part.id&&['submitted','reviewing'].includes(p.status)).length||''}</em></button>`).join('')||html`<p class="empty-small">${t('Vali protsess või impordi skeem.')}</p>`}</div>`:''}</aside>`;}
function documentView(){
 if(!doc)return html`<section class="canvas-panel welcome"><div class="welcome-icon">↗</div><p class="eyebrow">ESIMENE SAMM</p><h2>Too olemasolev skeem kaasa.</h2><p>AI loeb PDF-i või pildi valitud ala muudetavaks skeemiks. Töötaja või klient seob ettepaneku sammuga ja kvaliteedijuht vaatab selle läbi.</p><ol><li><b>1</b> Impordi fail või ava DigiMK allikas.</li><li><b>2</b> Märgi alad ja määra valdkonnad.</li><li><b>3</b> Vali Töötaja või Klient ning esita ettepanek.</li></ol><span class="quiet">AI-analüüs kasutab olemasolevat OpenAI seadistust.</span></section>`;
 return html`<section class="canvas-panel"><div class="document-heading"><div><p class="eyebrow">${doc.format==='pdf'?t('PDF-VOOSKEEM'):t('PILDINA SALVESTATUD VOOSKEEM')}</p><h2>${esc(doc.name)}</h2><p>Digitaalne kaart v${doc.version}${doc.process?t(' · skeem v')+doc.process.version:''} · algfail säilib muutmata</p></div><div class="view-tabs">${button('pdf-view',t('Algne skeem'),`class="${ui.view==='pdf'?'active':''}"`)}${button('map-view',t('Digitaalne kaart'),`class="${ui.view==='map'?'active':''}"`)}</div></div>
 <div class="toolbar ${ui.view==='map'&&doc.process?'linked-toolbar':''}"><div>${button('previous','←',html`aria-label="Eelmine lehekülg" ${ui.page<=1?'disabled':''}`)}<span>Lk ${ui.page} / ${doc.pages.length}</span>${button('next','→',html`aria-label="Järgmine lehekülg" ${ui.page>=doc.pages.length?'disabled':''}`)}</div><div>${button('zoom-out','−',localizeHTML('aria-label="Vähenda skeemi"'))}<span id="zoom-value" aria-live="polite">${Math.round(ui.zoom*100)}%</span>${button('zoom-in','＋',localizeHTML('aria-label="Suurenda skeemi"'))}${button('fit-diagram',t('Mahuta diagramm'),`aria-pressed="${ui.autoFit}"`)}</div><div class="diagram-controls"><label for="diagram-direction">Suund</label><select id="diagram-direction" ${ui.view==='map'?'':'disabled'} title="Suund muudab digitaalset kaarti. Algfaili paigutus säilib."><option value="LR" ${ui.direction==='LR'?'selected':''}>Vasakult paremale</option><option value="TD" ${ui.direction==='TD'?'selected':''}>Ülalt alla</option></select>${button('expand-diagram',ui.expanded?t('Taasta töövaade'):t('Laienda diagrammi'),`aria-expanded="${ui.expanded}"`)}${button('show-proposals',ui.expanded?t('Näita ettepanekuid'):t('Ava ettepanekud (')+queue().length+')')}</div>${canManage(ui.role)?html`<div>${button('draw',ui.drawing?t('Lõpeta märkimine'):doc.process?t('Märgi AI-ala'):t('＋ Märgi protsessiosa'),`class="${ui.drawing?'active':''}"`)}${doc.format==='pdf'?button('suggest',t('Leia tekstiplokid')):''}</div>`:''}</div>
 ${canManage(ui.role)?html`<details class="ai-tools" ${ui.aiToolsOpen||ui.pendingBounds||doc.aiCandidate||aiBusy?'open':''}><summary>AI ja tekstigeneraator</summary>${aiPanel()}</details>`:''}<div class="canvas-help">${ui.drawing?t('Lohista ristkülik ümber ühe protsessiosa. Seejärel kirjuta nimi ja määra valdkond.'):ui.view==='map'?t('AI-skeem vajab algfailiga võrdlemist. Valdkonnad ja vastutajad kinnitab inimene.'):t('Klõpsa märgitud protsessiosal. Vajadusel suurenda skeemi; valdkonnafilter ei varja algset PDF-i ega pilti.')}</div>
 ${importReview()}
 ${doc.format==='pdf'&&!doc.pages[ui.page-1].texts.length?localizeHTML('<div class="scan-note">Sellel lehel pole loetavat tekstikihti. Näed algset skeemi ja saad alasid käsitsi märkida. AI saab lugeda ka pildina salvestatud skeemi.</div>'):''}
 ${ui.view==='map'&&doc.process?'<process-explorer id="quality-explorer"></process-explorer>':''}<div id="paper-scroll" style="${ui.view==='map'&&doc.process?'display:none':''}" class="paper-scroll"><div id="paper" class="paper ${ui.drawing?'drawing':''}"><canvas id="pdf-canvas"></canvas><div id="overlays"></div><div id="rubber" hidden></div></div></div>
 <footer class="document-footer"><span>● Algfail säilib kontol muutmata</span>${button('export-backup',t('Laadi varukoopia'))}${ui.backupURL&&ui.backupDocId===doc.id?html`<a class="backup-download" href="${esc(ui.backupURL)}" download="protsess-varukoopia.json">Salvesta varukoopiafail</a>`:''}${button('export-map',t('Ekspordi kaart (SVG)'))}</footer></section>`;
}
function selectedPart(){return doc?.parts.find(part=>part.id===ui.partId);}
function importReview(){
 if(!doc?.intake||!doc.process)return '';
 const questions=doc.process.questions||[],warnings=doc.analysis?.warnings||[];
 return html`<details class="import-review"><summary>AI-mustand · ${questions.length} lahtist küsimust · vajab ülevaatust</summary><p>See on DigiMK algfailist loetud muudetav mustand. Võrdle samme ja nooli algskeemiga; kinnita vastutajad ning täpsusta küsimused tekstigeneraatoris.</p>${warnings.length?localizeHTML('<h3>Tuvastuse tähelepanekud</h3><ul>')+warnings.map(w=>localizeHTML('<li>')+esc(w)+localizeHTML('</li>')).join('')+localizeHTML('</ul>'):''}${questions.length?localizeHTML('<h3>Täpsustamist vajab</h3><ol>')+questions.map(q=>localizeHTML('<li>')+esc(q.text)+localizeHTML('</li>')).join('')+localizeHTML('</ol>'):''}${button('open-generator',t('Ava küsimused ja skeem tekstigeneraatoris'))}</details>`;
}
function partPanel(){
 if(ui.suggestions)return html`<h3>PDF-i tekstiplokid</h3><p class="muted">Need on teksti asukohtadest leitud kandidaadid, mitte kinnitatud protsessisammud. Rolli, valdkonda ega nooli ei oletata.</p><div class="suggestions">${ui.suggestions.map((suggestion,index)=>html`<button data-action="add-suggestion" data-index="${index}"><span>＋</span>${esc(suggestion.label)}</button>`).join('')||localizeHTML('<p>Tekstiplokke ei leitud. Märgi ala käsitsi.</p>')}</div>${button('close-suggestions',t('Tagasi'))}`;
 const part=selectedPart();
 if(ui.pendingBounds&&doc.process)return localizeHTML('<h3>AI-analüüsi ala märgitud</h3><p>Vajuta skeemi kohal AI: digitaliseeri märgitud ala. Uus tõlgendus avaneb eraldi protsessina.</p>')+button('cancel-part',t('Tühista märgitud ala'));
 if(ui.pendingBounds)return html`<h3>Uus protsessiosa</h3><p class="muted">Märgitud ala · lehekülg ${ui.page}</p><form id="new-part"><label>Nimi<input name="label" required maxlength="400" value="${esc(ui.pendingLabel||'')}" placeholder="Nt ostutellimuse kinnitamine"></label><label>Valdkond<select name="area">${areaOptions('unassigned')}</select></label><label>Tüüp<select name="kind"><option value="activity">Tegevus</option><option value="decision">Otsus</option></select></label><button class="primary" type="submit">Salvesta protsessiosa</button>${button('cancel-part',t('Tühista'))}</form>`;
 if(!part)return html`<div class="panel-empty"><span>◎</span><h3>Vali protsessiosa</h3><p>${canManage(ui.role)?t('Märgi skeemil ala või lisa PDF-i tekstiplokk.'):t('Vali vasakult oma valdkonna protsessiosa, mille kohta mõte esitada.')}</p></div>`;
 return html`<p class="eyebrow">LK ${part.page} · OSA v${part.version}</p><h3>${esc(part.label)}</h3><span class="area-chip">${esc(t(areaLabel(part.area)))}</span>${part.suggested?localizeHTML('<p class="scan-note">Samm ja valdkond vajavad ülevaatust.</p>'):''}
 ${canManage(ui.role)?html`${button('compose-proposal',t('Tee parandusettepanek'), 'class="primary"')}<form id="edit-part"><label>Protsessiosa nimi<input name="label" maxlength="400" required value="${esc(part.label)}"></label><label>Valdkond<select name="area">${areaOptions(part.area)}</select></label><label ${doc.process?'hidden':''}>Tüüp<select name="kind"><option value="activity" ${part.kind==='activity'?'selected':''}>Tegevus</option><option value="decision" ${part.kind==='decision'?'selected':''}>Otsus</option></select></label><button class="primary" type="submit">Salvesta kirjeldus</button></form>${doc.process?localizeHTML('<p class="quiet">Nooli, rolle ja uusi samme saad muuta tekstigeneraatoris. See vaade haldab sammukirjeldusi, valdkondi ja ettepanekuid.</p>'):''}<details class="connections" ${doc.process?'hidden':''}><summary>Protsessiosade seosed</summary><form id="connection"><label>Järgmine protsessiosa<select name="to">${doc.parts.filter(p=>p.id!==part.id).map(p=>html`<option value="${esc(p.id)}">${esc(p.label)}</option>`).join('')}</select></label><label>Haru nimi (vajadusel)<input name="label" maxlength="120" placeholder="Nt jah / ei"></label><button type="submit">Lisa seos</button></form>${(doc.connections||[]).filter(link=>link.from===part.id).map(link=>html`<p>${esc(link.label||'→')} ${esc(doc.parts.find(p=>p.id===link.to)?.label)}</p>`).join('')}</details>`:proposalForm(part)}
 ${canManage(ui.role)?sharingPanel(part):''}
 ${part.notes.length?html`<section class="part-notes"><h4>Kinnitatud parendused</h4>${part.notes.map(note=>html`<p>${esc(note.text)}<small>${esc(date(note.at))}</small></p>`).join('')}</section>`:''}`;
}
function sharingPanel(part){const grants=shareGrants.filter(g=>g.docId===doc.id&&(g.scope==='process'||g.partId===part.id));return html`<details class="sharing-panel" ${ui.sharingOpen?'open':''}><summary>Jagamine · konto ligipääs (${grants.filter(g=>!g.revokedAt).length})</summary><p>Jaga valitud sammu või kogu protsessi Digmatixi töötaja või kliendi kontole. Saaja saab esitada ettepanekuid ja lugeda enda ettepanekute tagasisidet. Protsessi muutmine ja ettepanekute kinnitamine jääb omanikule.</p>${shareLoadError?html`<p role="alert">${esc(localizeMessage(shareLoadError))}</p>`:''}<form id="share-part"><label>Saaja<select name="recipientRole"><option value="employee">Digmatixi töötaja</option><option value="client">Klient</option></select></label><label>Saaja ChatGPT konto e-post<input name="email" type="email" required maxlength="254" autocomplete="off" placeholder="nimi@ettevote.ee"></label><label>Jagamise ulatus<select name="scope"><option value="part">Valitud samm</option><option value="process">Kogu protsess</option></select></label><p class="quiet">Valitud samm: ${esc(part.label)}. Kogu protsessi jagamine hõlmab skeemi ning kõiki praeguseid ja tulevikus lisatavaid aktiivseid samme. Algfaili ja teiste inimeste ettepanekuid ei jagata.</p><button class="primary" type="submit">Anna ligipääs</button></form><p class="quiet">Leht on privaatne. Uus saaja peab olema sama e-postiga lisatud ka ChatGPT Sitesi lehe külastajaks. Jagamine ei saada automaatselt kirja.</p><label>Saaja vaate link<input readonly value="${esc(location.origin+'/?view=shared')}"></label>${grants.map(g=>html`<div class="share-grant"><span>${esc(g.email)}<small>${esc(t(g.recipientRole==='client'?'Klient':'Digmatixi töötaja'))} · ${esc(t(g.scope==='process'?'Kogu protsess':'Valitud samm'))} · ${g.revokedAt?t('Ligipääs lõpetatud'):g.claimed?t('Kontoga ühendatud'):t('Ootab saaja sisselogimist')}</small></span>${!g.revokedAt?button('revoke-share',t('Lõpeta ligipääs'),`data-id="${esc(g.id)}"`):''}</div>`).join('')}</details>`;}
function proposalForm(part){const draft=ui.drafts[draftKey()]||ui.drafts[`${doc?.id}:${ui.partId}:${roleLabel(ui.role)}${ui.role==='client'?':client':''}`]||{};return html`<h4>Minu parandusettepanek</h4><form id="proposal-form"><label>Pealkiri<input name="title" maxlength="160" required value="${esc(draft.title||'')}" placeholder="Mida võiks parandada?"></label><label>Mis praegu takistab?<textarea name="problem" required maxlength="4000">${esc(draft.problem||'')}</textarea></label><label>Minu ettepanek<textarea name="suggestion" required maxlength="4000">${esc(draft.suggestion||'')}</textarea></label><label>Oodatav kasu<textarea name="benefit" required maxlength="1500">${esc(draft.benefit||'')}</textarea></label><label>Ettepaneku liik<select name="type"><option value="general" ${draft.type!=='label'?'selected':''}>Üldine parendus / töökorraldus</option><option value="label" ${draft.type==='label'?'selected':''}>Protsessiosa kirjelduse muudatus</option></select></label><label>Uus sammukirjeldus <small>(kirjelduse muutmise korral)</small><textarea name="proposedLabel" maxlength="400">${esc(draft.proposedLabel||'')}</textarea></label><p class="quiet">Esitad nimega <strong>${esc(actor().name)}</strong>. Kinnitatud protsess jääb praegu samaks.</p>${button('ai-proposal',t('AI: aita mõtet täpsustada'))}<button class="primary" type="submit">Esita ettepanek</button></form>`;}
function proposalPanel(){
 const list=queue(),proposal=list.find(item=>item.id===ui.proposalId);
 return html`<h3>${canManage(ui.role)?t('Ettepanekute ülevaatus'):t('Minu ettepanekud')}</h3><div class="queue">${list.map(item=>html`<button class="queue-item ${item.id===proposal?.id?'selected':''}" data-action="select-proposal" data-id="${esc(item.id)}">${badge(item.status)}<strong>${esc(item.title)}</strong><small>${esc(item.author)} · ${esc(t(roleLabel(proposalRole(item))))} · ${esc(t(areaLabel(item.area)))}</small></button>`).join('')||localizeHTML('<p class="muted">Selle dokumendi kohta pole selles katsevaates veel ettepanekuid.</p>')}</div>${proposal?proposalDetail(proposal):''}`;
}
function proposalDetail(proposal){
 const review=ui.reviews[proposal.id]||{},last=proposal.events.at(-1);
 return html`<article class="proposal-detail"><p class="eyebrow">ETTEPANEK · ${esc(date(proposal.createdAt))}</p><h3>${esc(proposal.title)}</h3><p class="proposal-target">${esc(proposal.partLabel)} · ${esc(proposal.author)} · ${esc(t(roleLabel(proposalRole(proposal))))}</p><dl><dt>Probleem</dt><dd>${esc(proposal.problem)}</dd><dt>Ettepanek</dt><dd>${esc(proposal.suggestion)}</dd><dt>Oodatav kasu</dt><dd>${esc(proposal.benefit)}</dd>${proposal.type==='label'?html`<dt>Soovitud sammukirjeldus</dt><dd>${esc(proposal.proposedLabel)}</dd>`:''}</dl>
 ${last&&['accepted','rejected','implemented'].includes(proposal.status)?html`<div class="feedback ${proposal.status}"><strong>${esc(t(STATUSES[proposal.status]))}</strong><p>${esc(last.thanks)}</p><p>${esc(last.reason)}</p><small>${esc(last.actor)} · ${esc(date(last.at))}</small></div>`:''}
 ${canManage(ui.role)&&['submitted','reviewing'].includes(proposal.status)?html`<form id="review-form"><label>Otsustaja / kellega arutatud<input name="decisionMaker" value="${esc(review.decisionMaker||'')}" maxlength="150" placeholder="Vajadusel nimi või roll"></label><label>Otsuse põhjendus<textarea name="reason" maxlength="4000">${esc(review.reason||'')}</textarea></label><label>Tagasiside ja tänu ettepaneku esitajale<textarea name="thanks" maxlength="1500">${esc(review.thanks??t('Aitäh, et märkasid ja pakkusid lahenduse. Sinu panus aitab protsessi paremaks teha.'))}</textarea></label>${button('ai-review',t('AI: koosta hinnangu mustand'))}<div class="review-actions">${proposal.status==='submitted'?localizeHTML('<button type="submit" name="status" value="reviewing">Võta läbivaatusele</button>'):''}<button class="primary" type="submit" name="status" value="accepted">Kiida heaks</button><button class="danger" type="submit" name="status" value="rejected">Lükka tagasi</button></div></form>`:''}
 ${canManage(ui.role)&&proposal.status==='accepted'?html`<form id="implement-form"><p class="quiet">Heakskiit ei muutnud kaarti veel. ${proposal.type==='label'?t('Rakendamine muudab selle protsessiosa kirjeldust.'):t('Rakendamine lisab kinnitatud parenduse protsessiosa märkustesse.')} Algse PDF-i või pildi pikslid jäävad samaks.</p><label>Rakendamise märkus<textarea name="note" required maxlength="2000" placeholder="Mida ja kuidas protsessikaardil muudeti?"></textarea></label><button class="primary" type="submit">Rakenda digitaalsele kaardile</button></form>`:''}
 ${proposal.events.length?html`<details class="events"><summary>Otsuste ajalugu (${proposal.events.length})</summary>${proposal.events.map(event=>html`<p><strong>${esc(t(STATUSES[event.status]))}</strong> · ${esc(event.actor)}<small>${esc(date(event.at))}${event.decisionMaker?t(' · Arutatud: ')+esc(event.decisionMaker):''}</small><span>${esc(event.reason)}</span></p>`).join('')}</details>`:''}</article>`;
}
function render(){
 const libraryScroll=$('.document-list')?.scrollTop||0;
 viewportObserver?.disconnect();
 ensureSelection();
 document.body.classList.toggle('diagram-expanded',!!(ui.expanded&&doc));
 app.innerHTML=header()+(ui.transferError?localizeHTML('<div class="demo-note transfer-error" role="alert"><p>')+esc(localizeMessage(ui.transferError))+localizeHTML('</p>')+button('dismiss-transfer',t('Jätka salvestatud protsessiga'))+localizeHTML('</div>'):'')+(canManage(ui.role)?linkPanel():'')+html`<main class="layout ${ui.expanded&&doc?'is-expanded':''}">${sidebar()}${documentView()}<section class="review-panel" id="process-review" aria-label="Protsessiosa ja ettepanekud"><div class="review-tabs">${button('part-tab',t('Protsessiosa'),`class="${ui.panel==='part'?'active':''}"`)}${button('proposal-tab',html`Ettepanekud <b>${queue().length}</b>`,`class="${ui.panel==='proposals'?'active':''}"`)}</div><div class="review-content">${doc?(ui.panel==='part'?partPanel():proposalPanel()):localizeHTML('<div class="panel-empty"><span>✦</span><h3>Iga mõte saab vastuse.</h3><p>Heakskiit, põhjendus ja tänu jäävad ettepaneku juurde alles.</p></div>')}</div><div class="backup-tools"><label>Taasta varukoopia<input id="restore-backup" type="file" accept=".json"></label><small>Kontole salvestatud kaardid säilivad ka brauseri vahetamisel. Varukoopia annab lisaks eraldi taastamiskoopia.</small></div></section></main>`;
 const libraryList=$('.document-list');if(libraryList)libraryList.scrollTop=libraryScroll;
 if(busy)for(const control of app.querySelectorAll('button,input,textarea,select'))if(!['ai-cancel','cancel-import','batch-stop'].includes(control.dataset.action))control.disabled=true;
 if(ui.aiNotes){const content=$('.review-content');content.insertAdjacentHTML('beforeend',localizeHTML('<section class="scan-note"><strong>AI tähelepanekud · vajavad kontrolli</strong><p>')+esc(ui.aiNotes).replaceAll('\n',localizeHTML('<br>'))+localizeHTML('</p></section>'));}
 if(ui.cloudNewer)app.insertAdjacentHTML('afterbegin',localizeHTML('<div class="demo-note">Kontol on uuem töö. Pooleli tekst on alles. ')+button('refresh-cloud',t('Värskenda kontolt'))+localizeHTML('</div>'));
 const explorer=$('#quality-explorer');if(explorer)explorer.configure({process:doc.process,locale:getLocale(),editable:canManage(ui.role)&&cloud.snapshot?.permissions.manage===true&&!busy,selectedNodeId:selectedPart()?.nodeId,state:ui.explorerStates?.[doc.id],onState:state=>{ui.explorerStates??={};ui.explorerStates[doc.id]=state;},onNodeSelect:id=>{const part=parts().find(p=>p.nodeId===id);if(part){ui.partId=part.id;ui.page=part.page;ui.panel='part';render();requestAnimationFrame(()=>$('#process-review')?.scrollIntoView({behavior:'smooth',block:'start'}));}},onSave:async(next,expected)=>{if(!canManage(ui.role)||!cloud.snapshot?.permissions.manage||doc.process.version!==expected)throw new Error('Stale or read-only process');const updated=updateFromGenerator(doc,next,originForDocument(doc),{actor:ui.name}).document;await saveDoc(updated);}});
 if(doc&&asset&&!explorer){resizeViewport();viewportObserver=new ResizeObserver(()=>scheduleViewport());viewportObserver.observe($('#paper-scroll'));}
}
function scheduleViewport(){cancelAnimationFrame(viewportFrame);viewportFrame=requestAnimationFrame(()=>{if(doc&&asset)resizeViewport();});}
function resizeViewport(){
 const viewport=$('#paper-scroll');if(!viewport||$('#quality-explorer'))return;
 if(!ui.expanded){const footer=$('.document-footer');viewport.style.height=Math.max(280,window.innerHeight-(viewport.getBoundingClientRect().top+window.scrollY)-(footer?.offsetHeight||50)-24)+'px';}
 else viewport.style.removeProperty('height');
 void paint();
}
window.addEventListener('resize',scheduleViewport);
app.addEventListener('toggle',event=>{if(event.target.matches('.sharing-panel'))ui.sharingOpen=event.target.open;if(event.target.matches('.import-review'))scheduleViewport();if(event.target.matches('.ai-tools')){ui.aiToolsOpen=event.target.open;scheduleViewport();}},true);
function mapSVG(){
 const explorer=$('#quality-explorer');
 if(doc.process&&explorer?.isBpmn)return toSVG(doc.process,[],explorer.labels('LR','bpmn'));
 if(doc.process)return toSVG(doc.process,ui.partId?[doc.parts.find(p=>p.id===ui.partId)?.nodeId].filter(Boolean):[],{direction:ui.direction,unknownRoleLabel:t('Vastutaja teadmata'),unknownSystemLabel:t('Süsteem teadmata'),legendTitle:t('Systems legend'),manualSystemLabel:t('No software'),humanDecisionLabel:t('Human decision'),executionLabels:Object.fromEntries(Object.entries(EXECUTION_LABELS).map(([k,v])=>[k,translate(getLocale(),v)])),areaLabels:Object.fromEntries(BUSINESS_AREAS.map(a=>[a.id,translate(getLocale(),a.label)])),areaLegendTitle:t('Business areas'),areaStatusLabels:{unknown:t('Unclassified'),suggested:t('Suggested'),confirmed:t('Confirmed')}});
 const current=parts().filter(part=>part.page===ui.page),horizontal=ui.direction==='LR',W=horizontal?Math.max(620,current.length*500+40):1000,H=horizontal?240:Math.max(250,current.length*200+40),ids=new Set(current.map(part=>part.id)),position=new Map(current.map((part,index)=>[part.id,{x:horizontal?30+index*500:30,y:horizontal?25:25+index*200,w:horizontal?450:940,h:160}]));
 const links=(doc.connections||[]).filter(link=>ids.has(link.from)&&ids.has(link.to));
 return html`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Inimese märgitud protsessiosade kaart"><defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#658373"/></marker></defs><rect width="${W}" height="${H}" fill="#fbfcfb"/>${links.map(link=>{const a=position.get(link.from),b=position.get(link.to),x1=horizontal?a.x+a.w:a.x+a.w/2,y1=horizontal?a.y+a.h/2:a.y+a.h,x2=horizontal?b.x:b.x+b.w/2,y2=horizontal?b.y+b.h/2:b.y;return html`<path d="M${x1},${y1} L${x2},${y2}" stroke="#658373" stroke-width="2" marker-end="url(#arrow)"/><text x="${(x1+x2)/2}" y="${(y1+y2)/2-5}" font-size="12" fill="#52695e">${esc(link.label)}</text>`;}).join('')}${current.map(part=>{const {x,y,w,h}=position.get(part.id),words=part.label.match(/.{1,32}(?:\s|$)|\S{1,32}/g)||[part.label];return html`<g data-id="${esc(part.id)}"><title>${esc(part.label)}</title><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${part.kind==='decision'?0:7}" fill="${part.id===ui.partId?'#e7f2ec':'white'}" stroke="#739982"/><text font-family="Arial,sans-serif" font-size="22" fill="#253e32">${words.slice(0,4).map((word,index)=>html`<tspan x="${x+12}" y="${y+32+index*26}">${esc(word.trim())}</tspan>`).join('')}</text><text x="${x+12}" y="${y+h-17}" font-family="Arial,sans-serif" font-size="17" fill="#708574">${esc(t(areaLabel(part.area)))} · lk ${part.page} · osa v${part.version}</text></g>`;}).join('')}</svg>`;
}
async function paint(){
 const generation=++renderGeneration;renderJob?.cancel?.();
 const paper=$('#paper'),canvas=$('#pdf-canvas');if(!paper||!canvas)return;
 const meta=doc.pages[ui.page-1],viewport=$('#paper-scroll'),svg=ui.view==='map'?mapSVG():null,size=svg?svgSize(svg):meta;
 const scale=ui.autoFit?fitScale(size,{width:viewport.clientWidth,height:viewport.clientHeight}):ui.zoom;
 ui.zoom=scale;const zoomLabel=$('#zoom-value');if(zoomLabel)zoomLabel.textContent=Math.round(scale*100)+'%';
 const width=size.width*scale,height=size.height*scale;
 paper.style.width=width+'px';paper.style.height=height+'px';paper.style.minHeight='0';paper.onpointerdown=null;
 if(svg){canvas.hidden=true;$('#overlays').className='map-overlay';$('#overlays').innerHTML=svg;return;}
 canvas.hidden=false;$('#overlays').className='';const pixelRatio=Math.min(devicePixelRatio||1,2),factor=Math.min(pixelRatio,Math.sqrt(12_000_000/(width*height)));
 canvas.width=Math.max(1,Math.floor(width*factor));canvas.height=Math.max(1,Math.floor(height*factor));canvas.style.width=width+'px';canvas.style.height=height+'px';
 try{
  if(asset.pdf){const page=await asset.pdf.getPage(ui.page);if(generation!==renderGeneration)return;const viewport=page.getViewport({scale:width/meta.width});renderJob=page.render({canvasContext:canvas.getContext('2d'),viewport,transform:[factor,0,0,factor,0,0]});await renderJob.promise;}
  else canvas.getContext('2d').drawImage(asset.image,0,0,canvas.width,canvas.height);
  if(generation!==renderGeneration)return;
  $('#overlays').innerHTML=parts().filter(part=>part.page===ui.page&&!part.diagramOnly).map(part=>html`<button class="region ${part.id===ui.partId?'selected':''}" data-action="select-part" data-id="${esc(part.id)}" title="${esc(part.label)}" aria-label="Protsessiosa: ${esc(part.label)}" style="left:${part.bounds.x*100}%;top:${part.bounds.y*100}%;width:${part.bounds.w*100}%;height:${part.bounds.h*100}%"><span>${esc(part.label)}</span></button>`).join('');
  if(ui.pendingBounds){const b=ui.pendingBounds;$('#overlays').insertAdjacentHTML('beforeend',html`<div class="pending-region" style="left:${b.x*100}%;top:${b.y*100}%;width:${b.w*100}%;height:${b.h*100}%"></div>`);}
  bindDrawing(paper);
 }catch(error){if(error?.name!=='RenderingCancelledException')notify(t('Lehekülge ei saanud kuvada. ')+localizeMessage(error.message),true);}
}
function bindDrawing(paper){
 paper.onpointerdown=event=>{
  if(!ui.drawing||!canManage(ui.role)||event.button!==0)return;event.preventDefault();paper.setPointerCapture(event.pointerId);
  const rect=paper.getBoundingClientRect(),point=e=>({x:Math.max(0,Math.min(1,(e.clientX-rect.left)/rect.width)),y:Math.max(0,Math.min(1,(e.clientY-rect.top)/rect.height))}),start=point(event),rubber=$('#rubber');rubber.hidden=false;
  const bounds=e=>{const p=point(e);return {x:Math.min(start.x,p.x),y:Math.min(start.y,p.y),w:Math.abs(p.x-start.x),h:Math.abs(p.y-start.y)};};
  paper.onpointermove=e=>{const b=bounds(e);Object.assign(rubber.style,{left:b.x*100+'%',top:b.y*100+'%',width:b.w*100+'%',height:b.h*100+'%'});};
  paper.onpointerup=e=>{paper.onpointermove=null;paper.onpointerup=null;rubber.hidden=true;const b=bounds(e);if(b.w<.006||b.h<.006){notify(t('Lohista suurem ala ümber protsessiosa.'),true);return;}
   ui.pendingBounds=b;ui.pendingLabel=doc.pages[ui.page-1].texts.filter(t=>(t.x+t.w/2)/doc.pages[ui.page-1].width>=b.x&&(t.x+t.w/2)/doc.pages[ui.page-1].width<=b.x+b.w&&(t.y+t.h/2)/doc.pages[ui.page-1].height>=b.y&&(t.y+t.h/2)/doc.pages[ui.page-1].height<=b.y+b.h).map(t=>t.text).join(' ').slice(0,400);ui.partId=null;ui.panel='part';ui.drawing=false;render();$('#new-part input')?.focus();
  };
 };
}
async function openAsset(blob,format,signal){
 if(format==='pdf'){const engine=await import('./pdf-engine.mjs');return engine.openPDF(blob,signal);}
 const image=await createImageBitmap(blob);if(image.width*image.height>40_000_000){image.close();throw new Error(t('Pilt on liiga suur. Salvesta kuni 40 megapiksli suurune koopia.'));}return {image,close:()=>image.close()};
}
async function importFile(file){
 if(busy)return;const token=++operation;let candidate;busy=true;importController=new AbortController();const signal=importController.signal;render();
 try{
  const format=validateFile(file.name,file.size);candidate=await openAsset(file,format,signal);if(signal.aborted)throw new DOMException('Katkestatud','AbortError');
  let pages;
  if(candidate.pdf){const engine=await import('./pdf-engine.mjs');pages=await engine.inspectPDF(candidate.pdf,(page,total)=>{if($('#progress-text'))$('#progress-text').textContent=localizeMessage(localizeMessage(localizeMessage(`Loen lehekülge ${page} / ${total}…`)));},signal);}
  else pages=[{width:candidate.image.width,height:candidate.image.height,texts:[]}];
  if(token!==operation||signal.aborted)throw new DOMException('Katkestatud','AbortError');
  const next={id:uid(),name:file.name,format,mime:file.type||(format==='pdf'?'application/pdf':'image/png'),createdAt:stamp(),pages,parts:[],connections:[],history:[],version:1};
  await write([{store:'documents',value:next},{store:'files',value:{id:next.id,blob:file}}]);
  await asset?.close?.();asset=candidate;candidate=null;doc=next;documents.push(next);rememberDocument(next.id);ui.page=1;ui.partId=null;ui.proposalId=null;ui.panel='part';ui.pendingBounds=null;ui.suggestions=null;ui.view='pdf';notify(t('Dokument imporditud. Märgi kvaliteedijuhina protsessiosad.'));
 }catch(error){if(error.name!=='AbortError')notify(error.name==='PasswordException'?t('PDF on parooliga kaitstud. Impordi avatud koopia.'):t('Import ebaõnnestus: ')+localizeMessage(error.message),true);}
 finally{await candidate?.close?.();busy=false;importController=null;render();}
}
async function selectDocument(id){
 if(busy)return;const token=++operation;busy=true;render();let candidate;
  try{id=activeDocumentId(documents,id);const next=documents.find(item=>item.id===id),stored=await readStore('files',id);if(!next||!stored?.blob)throw new Error(t('Algfaili ei leitud. Taasta varukoopia.'));candidate=await openAsset(stored.blob,next.format);if(token!==operation)return;await asset?.close?.();asset=candidate;candidate=null;doc=next;rememberDocument(next.id);ui.page=1;ui.partId=null;ui.proposalId=null;ui.pendingBounds=null;ui.suggestions=null;ui.view=next.process?'map':'pdf';ui.autoFit=true;}
 catch(error){notify(error.message,true);}finally{await candidate?.close?.();busy=false;render();}
}
function download(name,data,type){const url=URL.createObjectURL(new Blob([data],{type})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);}
function batchPanel(){
 const pending=documents.filter(pendingImport);
 return html`<details class="batch-import" ${batchActive||batchLog.length?'open':''}><summary>Mitu skeemi korraga · AI-import</summary><p>Vali PNG- või JPG-vooskeemid. Algfailid ja muudetavad kontrollimata mustandid salvestuvad sinu kontole. Sama faili ei lisata uuesti. Olemasolevaid skeeme, ettepanekuid ja jagamisi ei muudeta.</p><label>Nime algus<input id="batch-prefix" maxlength="60" value="${esc(batchPrefix)}" placeholder="Nt Mainsten"></label><label class="upload"><strong>Vali skeemid ja digitaliseeri</strong><input id="batch-files" type="file" multiple accept=".png,.jpg,.jpeg" ${busy?'disabled':''}></label><small>AI kasutab olemasolevat OpenAI seadistust ja API mahtu. WISH TO-BE fail jääb tulevikuvisiooniks. PDF impordi ühe failina ülal.</small>${pending.length?button('batch-resume',localizeMessage(localizeMessage(localizeMessage(`Jätka pooleli skeeme (${pending.length})`))),busy?'disabled':''):''}${batchActive?html`<p role="status">${esc(batchStage)}</p>${button('batch-stop',t('Peata pärast käimasolevat salvestust'))}`:''}${batchLog.length?html`<ol class="batch-results" aria-label="Hulgiimpordi tulemused">${batchLog.map(row=>html`<li>${esc(row)}</li>`).join('')}</ol>`:''}</details>`;
}
const blobDataURL=blob=>new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(new Error(t('Algpilti ei saanud lugeda.')));reader.readAsDataURL(blob);});
async function batchAnalysisImage(blob){
 const original=await blobDataURL(blob);if(original.length<=4_000_000)return original;
 const image=await createImageBitmap(blob);
 try{const scale=Math.min(1,2800/Math.max(image.width,image.height)),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.width*scale));canvas.height=Math.max(1,Math.round(image.height*scale));const ctx=canvas.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,0,0,canvas.width,canvas.height);for(const quality of [.9,.75,.55]){const data=canvas.toDataURL('image/jpeg',quality);if(data.length<=4_000_000)return data;}throw new Error(t('AI pildikoopia on liiga suur. Ava algfail ja märgi väiksem ala.'));}finally{image.close();}
}
function updateBatch(message){batchStage=message;render();}
function batchSnapshot(){documents=structuredClone(cloud.snapshot.documents);proposals=structuredClone(cloud.snapshot.proposals);if(doc)doc=documents.find(d=>d.id===doc.id)||doc;}
async function importImages(files){
 if(busy||saving||!canManage(ui.role))return;
 busy=true;batchActive=true;batchStopped=false;batchLog=[];aiController=new AbortController();render();
 let lastReady;
 try{
  await cloud.refresh();batchSnapshot();
  // Hash old originals without changing any old record (including purchasing).
  const existing=new Map();
  if(files.length)for(const d of documents){
   if(batchStopped)break;
   updateBatch(t('Kontrollin korduvaid algfaile…'));
   const hash=d.intake?.sha256||await sourceHash((await readStore('files',d.id)).blob);existing.set(hash,d.id);
  }
  for(const [index,file] of files.entries()){
   if(batchStopped)break;
   updateBatch(localizeMessage(localizeMessage(localizeMessage(`Salvestan algfaili ${index+1}/${files.length}: ${file.name}`))));
   let candidate;
   try{
    const format=validateFile(file.name,file.size);if(format!=='image')throw new Error(t('Hulgiimport toetab PNG- ja JPG-pilte.'));
    const hash=await sourceHash(file),duplicate=existing.get(hash)||findSource(documents,hash)?.id;
    if(duplicate){batchLog.push(file.name+t(' · juba kontol, säilitatud'));continue;}
    candidate=await openAsset(file,format);
    if(batchStopped)break;
    const mode=/WISH[ _-]*TO[ _-]*BE/i.test(file.name)?'to-be':'as-is';
    const next={id:uid(),name:((batchPrefix?batchPrefix+' · ':'')+file.name.replace(/\.(png|jpe?g)$/i,'')).slice(0,300),format,mime:file.type||'image/png',createdAt:stamp(),pages:[{width:candidate.image.width,height:candidate.image.height,texts:[]}],parts:[],connections:[],history:[],version:1,intake:{kind:'image-batch',sha256:hash,sourceName:file.name,mode,state:'pending',error:''}};
    await write([{store:'documents',value:next},{store:'files',value:{id:next.id,blob:file}}]);
    documents.push(next);existing.set(hash,next.id);batchLog.push(file.name+t(' · algfail kontol'));
   }catch(error){batchLog.push(file.name+t(' · VIGA: ')+error.message);}
   finally{await candidate?.close?.();}
  }
  const queued=documents.filter(pendingImport).map(d=>d.id);
  for(const [index,id] of queued.entries()){
   if(batchStopped)break;
   await cloud.refresh();batchSnapshot();
   const current=documents.find(d=>d.id===id);
   if(!current||!pendingImport(current)||proposals.some(p=>p.docId===id)){batchLog.push((current?.name||id)+t(' · vahepeal muudetud, säilitatud'));continue;}
   updateBatch(localizeMessage(localizeMessage(localizeMessage(`AI digitaliseerib ${index+1}/${queued.length}: ${current.name}`))));
   try{
    const file=await readStore('files',id),image=await batchAnalysisImage(file.blob);
    const result=await qualityPost({action:'vision',image,mode:current.intake.mode,scope:importScope(current)});
    if(batchStopped)break;
    // Refresh the workspace revision, but require the target card to be unchanged.
    await cloud.refresh();batchSnapshot();const latest=documents.find(d=>d.id===id);
    if(!latest||latest.revisionId!==current.revisionId||proposals.some(p=>p.docId===id))throw new Error(t('Kaart muutus teises aknas. Tulemust ei kirjutatud üle.'));
    const next=importedDraft(current,result,actor().name);
    await write([{store:'documents',value:next}],[current]);batchSnapshot();lastReady=id;
    batchLog.push(current.name+localizeMessage(localizeMessage(localizeMessage(` · VALMIS: ${next.parts.length} sammu, ${next.process.questions.length} lahtist küsimust`))));
   }catch(error){
    if(batchStopped||error.name==='AbortError')break;
    batchLog.push(current.name+t(' · AI VIGA: ')+error.message);
    await cloud.refresh();batchSnapshot();const latest=documents.find(d=>d.id===id);
    if(latest?.revisionId===current.revisionId&&pendingImport(latest)){
     await write([{store:'documents',value:{...latest,intake:{...latest.intake,state:'failed',error:error.message.slice(0,2000)}}}],[latest]);batchSnapshot();
    }
    if(error.status===429){batchLog.push(t('Kasutuspiir täis; jätka hiljem.'));break;}
   }
  }
 }catch(error){batchLog.push(t('Import peatus: ')+error.message);}
 finally{
  busy=false;batchActive=false;aiController=null;batchSnapshot();
  if(lastReady)await selectDocument(lastReady);else render();
  notify(batchStopped?t('Hulgiimport peatatud. Salvestatud algfailid ja valmis skeemid on kontol alles.'):t('Hulgiimport lõpetatud. Kontrolli tulemuste loendit ja AI-skeeme.'));
 }
}
async function exportBackup(){
 const file=await readStore('files',doc.id),bytes=new Uint8Array(await file.blob.arrayBuffer());let binary='';for(let offset=0;offset<bytes.length;offset+=8192)binary+=String.fromCharCode(...bytes.subarray(offset,offset+8192));
 const text=JSON.stringify({format:'process-studio-local-pilot',version:1,document:doc,proposals:proposals.filter(p=>p.docId===doc.id),fileBase64:btoa(binary)},null,2);if(ui.backupURL)URL.revokeObjectURL(ui.backupURL);ui.backupURL=URL.createObjectURL(new Blob([text],{type:'application/json'}));ui.backupDocId=doc.id;render();notify(t('Varukoopia on valmis. Vajuta Salvesta varukoopiafail. See sisaldab algfaili ja kogu ettepanekute ajalugu.'));
}
async function restoreBackup(file){
 if(file.size>32_000_000)throw new Error(t('Varukoopia on liiga suur.'));
 const backup=validateBackup(JSON.parse(await file.text())),oldId=backup.document.id;
 // Restore as a separate copy, never overwrite current work or its decisions.
 const docId=uid(),proposalMap=new Map(backup.proposals.map(p=>[p.id,uid()]));
 const next={...backup.document,supersededBy:undefined,revisionId:undefined,lastGeneratorTransfer:undefined,id:docId,name:backup.document.name+t(' (taastatud)'),parts:backup.document.parts.map(part=>({...part,notes:part.notes.map(note=>({...note,proposalId:proposalMap.get(note.proposalId)||note.proposalId}))}))};
 const bytes=Uint8Array.from(atob(backup.fileBase64),char=>char.charCodeAt(0));validateFile(next.format==='pdf'?'backup.pdf':'backup.png',bytes.length);
 const blob=new Blob([bytes],{type:next.mime}),candidate=await openAsset(blob,next.format);
 try{if(candidate.pdf&&candidate.pdf.numPages!==next.pages.length)throw new Error(t('Varukoopia lehekülgede arv ei vasta PDF-ile.'));await write([{store:'documents',value:next},{store:'files',value:{id:next.id,blob}},...backup.proposals.map(p=>({store:'proposals',value:{...p,id:proposalMap.get(p.id),docId}}))]);}
 finally{await candidate.close();}
 documents.push(next);proposals.push(...backup.proposals.map(p=>({...p,id:proposalMap.get(p.id),docId})));await selectDocument(next.id);notify(t('Varukoopia taastati eraldi koopiana. Varasem töö jäi alles.'));
}
app.addEventListener('change',async event=>{
 const target=event.target;
 if(busy&&!['upload','restore-backup','restore-library'].includes(target.id)){render();return;}
 try{
  if(target.id==='batch-files'&&target.files.length){batchPrefix=$('#batch-prefix').value.trim();await importImages([...target.files]);return;}
  if(target.id==='upload'&&target.files[0])await importFile(target.files[0]);
  if(['restore-backup','restore-library'].includes(target.id)&&target.files[0]&&!busy&&!saving)await restoreBackup(target.files[0]);
  if(target.id==='role'){if(!Object.hasOwn(ROLES,target.value))return;try{localStorage.setItem('quality-work-role:'+cloud.snapshot.user.id,target.value);}catch{}ui.aiNotes='';ui.names[ui.role]=ui.name;ui.role=target.value;ui.name=ui.names[ui.role];ui.pendingBounds=null;ui.suggestions=null;ui.drawing=false;render();}
  if(target.id==='person'){ui.name=target.value.trim()|| roleLabel(ui.role);ui.names[ui.role]=ui.name;render();}
  if(target.id==='my-area'){ui.area=target.value;render();}
  if(target.id==='diagram-direction'){ui.direction=normalizeDirection(target.value);ui.autoFit=true;try{localStorage.setItem(DIRECTION_STORE,ui.direction);}catch{}render();}
  if(target.id==='filter'){ui.filter=target.value;render();}if(target.id==='ai-mode'&&doc)doc.aiMode=target.value;
 }catch(error){notify(error.message,true);}
});
app.addEventListener('input',event=>{if(event.target.id==='document-search'){const caret=event.target.selectionStart;ui.documentSearch=event.target.value;render();const field=$('#document-search');field.focus();field.setSelectionRange(caret,caret);$('.document-list').scrollTop=0;return;}if(event.target.id==='ai-scope'&&doc)doc.aiScope=event.target.value;if(event.target.id==='person'){ui.name=event.target.value;ui.names[ui.role]=ui.name;}const form=event.target.closest('form');if(form?.id==='proposal-form'){ui.drafts[draftKey()]=Object.fromEntries(new FormData(form));saveDrafts();}if(form?.id==='review-form'){ui.reviews[ui.proposalId]=Object.fromEntries(new FormData(form));saveDrafts();}});
app.addEventListener('click',async event=>{
 const target=event.target.closest('[data-action]');if(!target||target.disabled)return;const action=target.dataset.action;
 try{
  if(action==='batch-stop'){batchStopped=true;aiController?.abort();return;}
  if(action==='batch-resume'){await importImages([]);return;}
  if(action==='cancel-import'){importController?.abort();return;}
  if(action==='ai-cancel'){aiController?.abort();return;}
  if(busy||saving)return;
  if(await qualityAction(action))return;
  if(action==='load-example'){const example=examples.find(item=>item.id===$('#example').value);if(!example)return;const response=await fetch('/examples/'+encodeURIComponent(example.id));if(!response.ok)throw new Error(t('Kohalikku allikat ei saa avada.'));const blob=await response.blob();await importFile(new File([blob],example.name,{type:blob.type}));return;}
  if(action==='generator-view'&&embedded){event.preventDefault();window.parent.postMessage({type:'studio:generator-view'},location.origin);return;}
  if(action==='refresh-cloud'){await loadGrants();await refreshCloud(true);return;}
  if(action==='shared-view'){if(embedded)window.parent.postMessage({type:'studio:shared-view'},location.origin);else location.assign('/?view=shared');return;}
  if(action==='revoke-share'){ui.sharingOpen=true;saving=true;try{await sharingRequest({action:'revoke',grantId:target.dataset.id});await loadGrants();render();notify(t('Ligipääs lõpetatud. Ettepanekud ja otsuste ajalugu säilisid.'));}finally{saving=false;}return;}
  if(action==='compose-proposal'){const p=selectedPart();ui.role='employee';ui.area=p?.area||ui.area;ui.panel='part';ui.aiNotes='';}
  if(action==='select-document'){await selectDocument(target.dataset.id);return;}
  if(action==='select-part'){ui.aiNotes='';ui.partId=target.dataset.id;const part=selectedPart();if(canPropose(ui.role))ui.area=part.area;ui.page=part.page;if(part.diagramOnly)ui.view='map';ui.panel='part';ui.pendingBounds=null;ui.suggestions=null;}
  if(action==='select-proposal'){ui.proposalId=target.dataset.id;const proposal=proposals.find(p=>p.id===ui.proposalId);ui.partId=proposal.partId;ui.page=doc.parts.find(p=>p.id===proposal.partId)?.page||1;}
  if(action==='part-tab')ui.panel='part';if(action==='proposal-tab')ui.panel='proposals';
  if(action==='previous'&&ui.page>1){ui.page--;ui.pendingBounds=null;}if(action==='next'&&ui.page<doc.pages.length){ui.page++;ui.pendingBounds=null;}
  if(action==='zoom-in'){ui.autoFit=false;ui.zoom=Math.min(4,ui.zoom*1.25);}if(action==='zoom-out'){ui.autoFit=false;ui.zoom=Math.max(.001,ui.zoom/1.25);}
  if(action==='fit-diagram')ui.autoFit=true;
  if(action==='expand-diagram'){ui.expanded=!ui.expanded;ui.drawing=false;}
  if(action==='show-proposals'){ui.expanded=false;ui.panel='proposals';}
  if(action==='pdf-view'){ui.view='pdf';ui.autoFit=true;}if(action==='map-view'){ui.view='map';ui.autoFit=true;ui.drawing=false;}
  if(action==='draw'){if(!canManage(ui.role))return;ui.expanded=false;ui.aiToolsOpen=true;ui.drawing=!ui.drawing;ui.view='pdf';ui.pendingBounds=null;ui.suggestions=null;}
  if(action==='cancel-part'){ui.pendingBounds=null;ui.drawing=false;}
  if(action==='suggest'){if(!canManage(ui.role))return;const page=doc.pages[ui.page-1];ui.suggestions=textRegions(page.texts,page.width,page.height);ui.panel='part';ui.pendingBounds=null;}
  if(action==='close-suggestions')ui.suggestions=null;
  if(action==='add-suggestion'){
   const suggestion=ui.suggestions[Number(target.dataset.index)];if(!suggestion)return;
   const part={...createPart(doc,{...suggestion,page:ui.page,area:'unassigned'},actor()),suggested:true};
   const rest=ui.suggestions.filter(item=>item!==suggestion);saving=true;try{await saveDoc({...doc,version:doc.version+1,parts:[...doc.parts,part]},null,()=>{ui.partId=part.id;ui.suggestions=rest;});}finally{saving=false;}notify(t('Tekstiplokk lisatud. Kontrolli nime ja määra valdkond.'));
  }
  if(action==='export-backup'){await exportBackup();return;}
  if(action==='export-map'){download('protsessikaart.svg',mapSVG(),'image/svg+xml');return;}
  if(action==='dismiss-transfer'){const pending=localStorage.getItem('quality-generator-transfer');if(pending)localStorage.setItem('quality-generator-unapplied',pending);localStorage.removeItem('quality-generator-transfer');ui.transferError=null;ui.generatorTransfer=null;history.replaceState(null,'',embedded?'/quality/?embedded=1':'/quality/');}
  render();if(['show-proposals','select-part','select-proposal','compose-proposal'].includes(action))requestAnimationFrame(()=>$('#process-review')?.scrollIntoView({behavior:'smooth',block:'start'}));
 }catch(error){notify(error.message,true);}
});
app.addEventListener('submit',async event=>{
 event.preventDefault();if(busy||saving)return;const form=event.target,data=Object.fromEntries(new FormData(form));saving=true;
 try{
  if(form.id==='share-part'){if(!canManage(ui.role)||!cloud.snapshot?.permissions.manage)throw new Error(t('Jagada saab ainult oma konto protsesse.'));ui.sharingOpen=true;await sharingRequest({action:'grant',docId:doc.id,partId:ui.partId,email:data.email,recipientRole:data.recipientRole,scope:data.scope});await loadGrants();render();notify(t('Ligipääs salvestatud. Saaja avab lingi oma ChatGPT kontoga.'));}
  if(form.id==='rename-process'){if(!canManage(ui.role))throw new Error(t('Protsessi nime muudab kvaliteedijuht.'));const name=String(data.name||'').trim();if(!name||name.length>300)throw new Error(t('Sisesta kuni 300 märgiga nimi.'));await saveDoc({...doc,name,version:doc.version+1,history:[...(doc.history||[]),{at:stamp(),actor:actor().name,action:'process_renamed',before:doc.name,after:name}]});notify(t('Protsessi nimi salvestatud. Ettepanekute ajalugu säilis.'));}
  if(form.id==='new-part'){
   const part=createPart(doc,{...data,page:ui.page,bounds:ui.pendingBounds},actor());
   await saveDoc({...doc,version:doc.version+1,parts:[...doc.parts,part]},null,()=>{ui.partId=part.id;ui.pendingBounds=null;});notify(t('Protsessiosa salvestatud.'));
  }
  if(form.id==='edit-part'){
   const updated=updatePart(doc,{...data,id:ui.partId},actor()),next={...updated,parts:updated.parts.map(part=>part.id===ui.partId?{...part,suggested:false}:part)};await saveDoc(next);notify(t('Protsessiosa kirjeldus salvestatud.'));
  }
  if(form.id==='connection'){
   if(!canManage(ui.role)||!doc.parts.some(part=>part.id===data.to)||data.to===ui.partId)throw new Error(t('Vali teine protsessiosa.'));
   const link={id:uid(),from:ui.partId,to:data.to,label:String(data.label||'').slice(0,120)};
   if(doc.connections.some(old=>old.from===link.from&&old.to===link.to&&old.label===link.label))throw new Error(t('See seos on juba olemas.'));
   await saveDoc({...doc,version:doc.version+1,connections:[...doc.connections,link]});notify(t('Seos lisatud digitaalsele kaardile.'));
  }
  if(form.id==='proposal-form'){
   if(proposals.filter(p=>p.docId===doc.id).length>=LIMITS.proposals)throw new Error(t('Dokumendi ettepanekute piir on täis.'));
   const proposal=createProposal(doc,{...data,partId:ui.partId},actor());await write([{store:'proposals',value:proposal}],[doc]);proposals.push(proposal);delete ui.drafts[draftKey()];saveDrafts();ui.proposalId=proposal.id;ui.panel='proposals';render();notify(t('Ettepanek esitatud. Protsessi kinnitatud kaart jäi samaks.'));
  }
  if(form.id==='review-form'){
   const proposal=proposals.find(item=>item.id===ui.proposalId),next=reviewProposal(proposal,{...data,status:event.submitter.value},actor());await write([{store:'proposals',value:next}]);proposals=proposals.map(item=>item.id===next.id?next:item);render();notify(t('Otsus ja tagasiside on ettepaneku juures salvestatud.'));
  }
  if(form.id==='implement-form'){
   const proposal=proposals.find(item=>item.id===ui.proposalId),next=implementProposal(doc,proposal,data.note,actor());await saveDoc(next.document,next.proposal);notify(t('Heakskiidetud parendus rakendatud. Varasem kirjeldus on ajaloos alles.'));
  }
 }catch(error){notify(error.message,true);}finally{saving=false;}
});
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&ui.expanded){event.preventDefault();ui.expanded=false;render();$('#app [data-action="expand-diagram"]')?.focus();return;}if(event.key==='Escape'&&(ui.drawing||ui.pendingBounds)){ui.drawing=false;ui.pendingBounds=null;render();}});
async function boot(){
 try{db=await openDB();await connectAccount();documents.sort((a,b)=>a.createdAt.localeCompare(b.createdAt));try{const saved=JSON.parse(localStorage.getItem('quality-pilot-form-drafts:'+cloud.snapshot.user.id)||(ui.adoptLegacyDrafts?localStorage.getItem('quality-pilot-form-drafts'):null)||'{}');for(const key of ['drafts','reviews'])if(saved[key]&&typeof saved[key]==='object'&&!Array.isArray(saved[key]))ui[key]=saved[key];}catch{}render();let last;try{last=localStorage.getItem('quality-pilot-active-document');}catch{}if(new URLSearchParams(location.search).get('from')==='generator'){try{await importGenerator();}catch(error){ui.transferError=error.message;let id;try{id=readGeneratorTransfer().qualityOrigin?.documentId;}catch{}if(documents.length)await selectDocument(activeDocumentId(documents,id));render();}}else if(documents.length)await selectDocument(activeDocumentId(documents,last));}
 catch(error){app.innerHTML=html`<div class="fatal"><h1>Konto tööruumi ei saa avada</h1><p>${esc(localizeMessage(error.message))}</p><p>Varasem kohalik töö on alles. Kontrolli ühendust või logi sisse sama kontoga.</p><a href="/signin-with-chatgpt?return_to=%2F" target="_top">Logi sisse</a></div>`;}
}
void boot();

let aiController=null,aiBusy=false;
function aiPanel(){const candidate=doc.aiCandidate;return localizeHTML('<section class="ai-panel"><label>Protsessi piir / täpsustus<input id="ai-scope" maxlength="4000" value="')+esc(doc.aiScope||'')+localizeHTML('" placeholder="Nt ainult praegune ostuprotsess; välista tulevikuideed"></label><label>Vaade<select id="ai-mode"><option value="as-is" ')+(doc.aiMode!=='to-be'?'selected':'')+localizeHTML('>Praegune protsess</option><option value="to-be" ')+(doc.aiMode==='to-be'?'selected':'')+localizeHTML('>Soovitud protsess</option></select></label>')+button('ai-vision',busy?t('AI töötab…'):t('AI: digitaliseeri ')+(ui.pendingBounds?t('märgitud ala'):t('see lehekülg')),busy?'disabled':'')+(busy?button('ai-cancel',t('Katkesta AI päring')):'')+button('open-generator',t('Ava tekstigeneraatoris'),doc.process?'':'disabled')+localizeHTML('<small>Analüüsitakse ainult lehekülge ')+ui.page+(ui.pendingBounds?t(' ja sellel märgitud ala.'):t(' tervikuna. Väikese teksti või mitme skeemi puhul märgi enne sobiv ala.'))+localizeHTML(' AI kasutab sama serverivõtit. Päring saadab pildi OpenAI-le ja kasutab API mahtu. Tulemus on kontrollimata mustand.</small>')+(candidate?localizeHTML('<div class="ai-result"><b>AI mustand: ')+esc(candidate.draft.title)+localizeHTML('</b><p>')+candidate.draft.nodes.length+t(' sammu · ')+candidate.draft.questions.length+t(' täpsustavat küsimust. ')+esc(candidate.warnings.join(' '))+localizeHTML('</p><details><summary>AI loetud tekst ja lahtised küsimused</summary><pre>')+esc(candidate.draft.source)+'\n\n'+esc(candidate.draft.questions.map(q=>q.text).join('\n'))+localizeHTML('</pre></details>')+button('ai-apply',t('Võta mustand kasutusele eraldi protsessina'))+button('ai-discard',t('Eemalda mustand'))+localizeHTML('</div>'):'')+localizeHTML('<details><summary>Taasta eelmine generaatoritöö</summary><p>Enne parendusruumist skeemi avamist säilib generaatori eelmine töö eraldi koopiana.</p>')+button('restore-generator',t('Ava eelmine generaatoritöö'))+localizeHTML('</details></section>');}
async function qualityPost(body){aiController ||= new AbortController();const response=await fetch('/api/quality',{method:'POST',headers:{'Content-Type':'application/json'},signal:aiController.signal,body:JSON.stringify({...body,locale:getLocale()})});const result=await response.json();if(!response.ok){const error=new Error(result.error+(result.details?.length?' '+result.details.join(' '):''));error.status=response.status;throw error;}return result;}
async function analysisImage(bounds){
 const meta=doc.pages[ui.page-1],crop=bounds||{x:0,y:0,w:1,h:1};const scale=Math.min(3,2600/Math.max(meta.width*crop.w,meta.height*crop.h));
 const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(meta.width*crop.w*scale));canvas.height=Math.max(1,Math.round(meta.height*crop.h*scale));const ctx=canvas.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,canvas.width,canvas.height);
 if(asset.pdf){const page=await asset.pdf.getPage(ui.page);const job=page.render({canvasContext:ctx,viewport:page.getViewport({scale}),transform:[1,0,0,1,-meta.width*crop.x*scale,-meta.height*crop.y*scale]});await job.promise;}
 else ctx.drawImage(asset.image,meta.width*crop.x,meta.height*crop.y,meta.width*crop.w,meta.height*crop.h,0,0,canvas.width,canvas.height);
 const image=canvas.toDataURL('image/jpeg',.92);if(image.length>4_000_000)throw new Error(t('Pildiala on liiga suur. Märgi väiksem ala.'));return image;
}
async function qualityAction(action){
 if(action==='restore-generator'){const previous=localStorage.getItem('quality-generator-before-import');if(!previous)throw new Error(t('Eelmist generaatoritööd ei ole.'));localStorage.setItem('quality-process-transfer',previous);if(embedded)window.parent.postMessage({type:'studio:open-generator'},location.origin);else location.assign('/?view=generator');return true;}
 if(action==='use-active-card'){await selectDocument(doc.supersededBy);return true;}
 if(action==='link-legacy'){await linkLegacyCopy();return true;}
 if(action==='import-existing'){await receiveGenerator($('#return-target').value);return true;}
 if(action==='import-new'){await receiveGenerator(null);return true;}
 if(action==='open-generator'){
  if(!doc.process)throw new Error(t('Digitaliseeri skeem esmalt AI abil.'));const process=syncProcess(doc).process;if(validateProcess(process).errors.length)throw new Error(t('Skeem vajab parandamist.'));
  localStorage.setItem('quality-process-transfer',JSON.stringify({process,source:process.source,qualityOrigin:originForDocument(doc),sample:'custom',versions:[],command:(proposals.find(p=>p.id===ui.proposalId&&['accepted','implemented'].includes(p.status))?.suggestion||'').slice(0,6000),answers:{}}));if(embedded)window.parent.postMessage({type:'studio:open-generator'},location.origin);else location.assign('/?view=generator');return true;
 }
 if(action==='ai-discard'){await saveDoc({...doc,aiCandidate:null});return true;}
 if(action==='ai-apply'){
  if(!canManage(ui.role)||!doc.aiCandidate)return true;const c=doc.aiCandidate;const stored=await readStore('documents',doc.id);if(c.baseVersion!==doc.version||stored.version!==doc.version)throw new Error(t('Dokument on vahepeal muutunud. Analüüsi uuesti.'));
  const next={...doc,id:uid(),name:doc.name+' · '+c.draft.title,parts:partsFromProcess(c.draft,c.page,c.regions,c.crop),connections:[],history:[],version:1,process:c.draft,aiCandidate:null,createdAt:stamp(),analysis:{page:c.page,crop:c.crop,warnings:c.warnings,sourceDocumentId:doc.id}};
  next.connections=c.draft.edges.flatMap(e=>{const a=next.parts.find(p=>p.nodeId===e.from),b=next.parts.find(p=>p.nodeId===e.to);return a&&b?[{...e,id:uid(),from:a.id,to:b.id}]:[];});const file=await readStore('files',doc.id);await write([{store:'documents',value:next},{store:'files',value:{id:next.id,blob:file.blob}}]);documents.push(next);await selectDocument(next.id);ui.view='map';render();notify(t('AI mustand avatud eraldi protsessina. Kontrolli sammud, vastutajad, valdkonnad ja nooled. Varasemad ettepanekud jäid algse dokumendi juurde.'));return true;
 }
 if(!['ai-vision','ai-proposal','ai-review'].includes(action))return false;
 if(action==='ai-vision'&&!canManage(ui.role))return true;
 const snapshot={id:doc.id,version:doc.version,partId:ui.partId,proposalId:ui.proposalId,role:ui.role,page:ui.page,crop:ui.pendingBounds?{...ui.pendingBounds}:{x:0,y:0,w:1,h:1}};
 const proposal=proposals.find(p=>p.id===ui.proposalId),part=selectedPart();
 if(action==='ai-proposal'&&(!canPropose(ui.role)||!part||part.area!==ui.area))throw new Error(t('Vali oma valdkonna protsessiosa töötaja või kliendi vaates.'));
 if(action==='ai-review'&&(!canManage(ui.role)||!proposal||!['submitted','reviewing'].includes(proposal.status)))throw new Error(t('Vali läbivaatamist ootav ettepanek.'));
 const fields=Object.fromEntries(new FormData($(action==='ai-proposal'?'#proposal-form':action==='ai-review'?'#review-form':'#nonexistent')||document.createElement('form')));
 if(action==='ai-proposal'&&!String(fields.suggestion||fields.problem||'').trim())throw new Error(t('Kirjuta esmalt oma mõte või probleem. AI aitab seda täpsustada.'));
 const scope=$('#ai-scope')?.value||doc.aiScope||'',mode=$('#ai-mode')?.value||doc.aiMode||'as-is';
 aiBusy=true;aiController=new AbortController();busy=true;render();
 try{
  const result=await qualityPost(action==='ai-vision'?{action:'vision',image:await analysisImage(snapshot.crop),scope,mode}:{action:action==='ai-proposal'?'proposal':'review',context:{part:{label:part?.label,area:part?.area,notes:part?.notes},process:doc.process?{title:doc.process.title,questions:doc.process.questions,source:doc.process.source.slice(0,45000)}:null,proposal:action==='ai-review'?proposal:fields,review:action==='ai-review'?fields:undefined}});
  const stored=await readStore('documents',snapshot.id);if(doc.id!==snapshot.id||doc.version!==snapshot.version||stored.version!==snapshot.version||ui.role!==snapshot.role||ui.partId!==snapshot.partId||ui.proposalId!==snapshot.proposalId)throw new Error(t('Vaade või protsess muutus päringu ajal. AI tulemust ei kirjutatud senise töö peale.'));
  if(action==='ai-vision'){await saveDoc({...doc,aiScope:scope,aiMode:mode,aiCandidate:{...result,page:snapshot.page,crop:snapshot.crop,baseVersion:snapshot.version}});notify(t('AI mustand valmis. Loe tekst ja küsimused läbi ning ava eraldi protsessina.'));}
  else{localStorage.setItem('quality-ai-before-draft',JSON.stringify({at:stamp(),action,fields}));const a=result.assistance;
   if(action==='ai-proposal')ui.drafts[draftKey()]={...fields,...Object.fromEntries(['title','problem','suggestion','benefit'].map(k=>[k,a[k]||fields[k]||'']))};
   else ui.reviews[ui.proposalId]={...fields,reason:a.reason,thanks:a.thanks};ui.aiNotes=[a.risks,a.questions].filter(Boolean).join('\n');saveDrafts();notify(t('AI mustand valmis. Kontrolli ja muuda teksti enne esitamist või otsustamist.'));
  }
 }catch(error){notify(error.name==='AbortError'?t('AI päring katkestatud. Senine töö on alles.'):error.message,true);}finally{busy=false;aiBusy=false;aiController=null;render();}return true;
}

function transferOptions(exclude){return documents.filter(d=>d.process&&!d.supersededBy&&d.id!==exclude).map(d=>localizeHTML('<option value="')+esc(d.id)+'">'+esc(d.name)+t(' · kaart v')+d.version+' · '+proposals.filter(p=>p.docId===d.id).length+localizeHTML(' ettepanekut</option>')).join('');}
function linkPanel(){
 if(doc?.supersededBy)return localizeHTML('<section class="ai-panel transfer-panel"><strong>Varasem generaatorikoopia</strong><p>Selle koopia töö jätkub algsel protsessikaardil.</p>')+button('use-active-card',t('Ava aktiivne protsess'))+localizeHTML('</section>');
 if(ui.generatorTransfer)return localizeHTML('<section class="ai-panel transfer-panel"><strong>Vali tagasitoomise protsessikaart</strong><p>Sellel vanemal generaatoritööl puudub algse kaardi seos. Vali, millist olemasolevat protsessi uuendada. Selle ettepanekud ja otsuste ajalugu säilivad.</p><label>Uuendatav protsess<select id="return-target">')+transferOptions(null)+localizeHTML('</select></label>')+button('import-existing',t('Uuenda valitud protsessikaarti'))+button('import-new',t('See on uus protsess: loo uus kaart'))+localizeHTML('</section>');
 if(doc?.process&&!doc.roundtripEstablished&&doc.name.includes(t(' · generaatorist'))&&transferOptions(doc.id))return localizeHTML('<section class="ai-panel transfer-panel"><strong>Seo varasem generaatorikoopia algse protsessiga</strong><p>Vali algne kaart, mille ettepanekute ajalugu soovid säilitada. Selle skeem uuendatakse praeguse skeemiga. See koopia jääb varasemate koopiate alla.</p><label>Algne protsessikaart<select id="legacy-target">')+transferOptions(doc.id)+localizeHTML('</select></label>')+button('link-legacy',t('Seo skeem valitud protsessiga'))+localizeHTML('</section>');
 return '';
}
function readGeneratorTransfer(){
 const raw=localStorage.getItem('quality-generator-transfer');if(!raw)throw new Error(t('Ava generaatoris PDF · AI · Parendusettepanekud.'));
 const saved=JSON.parse(raw),errors=validateProcess(saved.process).errors;if(errors.length)throw new Error(errors.join(' '));
 if(!saved.transferId){saved.transferId=uid();localStorage.setItem('quality-generator-transfer',JSON.stringify(saved));}
 return saved;
}
async function importGenerator(){
 const saved=readGeneratorTransfer();
 if(saved.qualityOrigin){await receiveGenerator(saved.qualityOrigin.documentId,saved);return;}
 const prior=documents.find(d=>d.lastGeneratorTransfer===saved.transferId);if(prior){await selectDocument(prior.id);localStorage.removeItem('quality-generator-transfer');return;}
 if(!documents.some(d=>d.process&&!d.supersededBy)){await receiveGenerator(null,saved);return;}
 const last=localStorage.getItem('quality-pilot-active-document');if(documents.length)await selectDocument(documents.find(d=>d.id===last)?.id||documents.at(-1).id);
 ui.generatorTransfer=saved;render();
}
async function receiveGenerator(targetId,saved=ui.generatorTransfer){
 if(!saved)throw new Error(t('Tagasitoomise andmed puuduvad.'));
 busy=true;render();
 try{
  if(targetId){
   const baseline=await readStore('documents',targetId);if(!baseline)throw new Error(t('Algset protsessikaarti ei leitud. Taasta selle varukoopia; uut kaarti automaatselt ei loodud.'));
   if(baseline.lastGeneratorTransfer!==saved.transferId){
    const result=updateFromGenerator(baseline,saved.process,saved.qualityOrigin||originForDocument(baseline),{actor:actor().name});
    if(result.changed){result.document.lastGeneratorTransfer=saved.transferId;await write([{store:'documents',value:result.document}],[baseline]);}
   }
   const updated=await readStore('documents',targetId);documents=documents.map(d=>d.id===targetId?updated:d);ui.generatorTransfer=null;ui.transferError=null;
   // selectDocument manages the busy flag itself.
   busy=false;await selectDocument(targetId);ui.view='map';render();notify(t('Sama protsessikaart uuendatud. Ettepanekud, otsuste ajalugu ja algfail säilisid.'));
  }else{
   if(saved.qualityOrigin)throw new Error(t('Seotud protsessikaardi asemel uut kaarti ei looda. Ava algne kaart.'));
   const existing=documents.find(d=>d.lastGeneratorTransfer===saved.transferId);if(existing){busy=false;await selectDocument(existing.id);}
   else{const {blob,pages}=await renderGeneratorImage(saved.process),next={id:uid(),revisionId:uid(),name:saved.process.title+t(' · generaatorist'),format:'image',mime:'image/png',createdAt:stamp(),pages,parts:partsFromProcess(saved.process),connections:[],history:[],version:1,process:saved.process,roundtripEstablished:true,lastGeneratorTransfer:saved.transferId};
    await write([{store:'documents',value:next},{store:'files',value:{id:next.id,blob}}]);documents.push(next);busy=false;await selectDocument(next.id);
   }
   ui.generatorTransfer=null;ui.transferError=null;ui.view='map';render();notify(t('Uus protsess loodud. Edaspidised tagasitoomised uuendavad seda sama kaarti.'));
  }
  localStorage.removeItem('quality-generator-transfer');history.replaceState(null,'',embedded?'/quality/?embedded=1':'/quality/index.html');
 }finally{busy=false;render();}
}
async function renderGeneratorImage(process){
 const rawSVG=toSVG(process),dims=rawSVG.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/),svg=rawSVG.replace(localizeHTML('<svg '),localizeHTML('<svg width="')+dims[1]+'" height="'+dims[2]+'" '),url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'}));
 try{const image=await new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(new Error(t('Skeemi eelvaadet ei saa luua.')));img.src=url;});
  const canvas=document.createElement('canvas'),ratio=Math.min(1,2800/Math.max(image.naturalWidth,image.naturalHeight));canvas.width=Math.round(image.naturalWidth*ratio);canvas.height=Math.round(image.naturalHeight*ratio);canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob)throw new Error(t('Skeemi eelvaadet ei saa salvestada.'));return {blob,pages:[{width:canvas.width,height:canvas.height,texts:[]}]};
 }finally{URL.revokeObjectURL(url);}
}
async function linkLegacyCopy(){
 const targetId=$('#legacy-target')?.value;if(!targetId||!canManage(ui.role))return;
 const [target,copy]=await Promise.all([readStore('documents',targetId),readStore('documents',doc.id)]);if(!target||!copy)throw new Error(t('Kaarti ei leitud.'));if(copy.version!==doc.version||(copy.revisionId||null)!==(doc.revisionId||null))throw new Error(t('Koopia muutus teises aknas. Ava see uuesti.'));
 // Both records and all moved proposals commit together; original events are untouched.
 const allProposals=await readStore('proposals'),result=mergeGeneratorCopy(target,copy,allProposals,originForDocument(target),{actor:actor().name});
 await write([{store:'documents',value:result.document},{store:'documents',value:result.copy},...result.proposals.map(p=>({store:'proposals',value:p}))],[target,copy]);
 documents=documents.map(d=>d.id===target.id?result.document:d.id===copy.id?result.copy:d);proposals=allProposals.map(p=>result.proposals.find(m=>m.id===p.id)||p);
 await selectDocument(target.id);ui.view='map';render();notify(t('Skeem seotud algse kaardiga. Ettepanekute ajalugu säilis; vana generaatorikoopia on varasemate koopiate all.'));
}

installLanguage(render,'Process Studio · AI ja parenduste tööruum');
