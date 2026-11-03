import test from 'node:test';
import assert from 'node:assert/strict';
import {html,t,message,localizeHTML,normalizeLanguage,LOCALE_STORE,setLanguagePreference,syncLanguagePreference,getLocale} from '../public/quality/i18n.mjs';
import {QUALITY_TRANSLATIONS} from '../public/quality/translations.mjs';
import {prepareQualityRequest,qualityAI} from '../lib/quality-ai.mjs';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import {TRANSLATIONS} from '../lib/i18n.mjs';

test('all annotated UI text and static button labels have complete translations',()=>{
 const allowed=new Set(['Process Studio']);const missing=new Set();
 function check(raw){const ids=new Map(),key=raw.replace(/\s+/g,' ').trim().replace(/\{(\d+)\}/g,(_,id)=>{if(!ids.has(id))ids.set(id,ids.size);return '{'+ids.get(id)+'}';});if(/[A-Za-zÀ-ž]/.test(key)&&!key.includes('=')&&!allowed.has(key)&&!Object.hasOwn(QUALITY_TRANSLATIONS,key)&&!Object.hasOwn(TRANSLATIONS,key))missing.add(key);}
 function markup(s){for(const m of s.matchAll(/(?:^|>)([^<>]*)(?=<|$)/g))check(m[1]);for(const m of s.matchAll(/(?:aria-label|title|placeholder|alt)=["']([^"']*)["']/g))check(m[1]);}
 for(const name of ['app.mjs','shared-view.mjs']){
  const source=readFileSync(new URL('../public/quality/'+name,import.meta.url),'utf8'),tree=ts.createSourceFile(name,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
  function visit(n){
   if(ts.isTaggedTemplateExpression(n)&&n.tag.getText(tree)==='html'){
    const template=n.template;let text=template.head?.text??template.text;template.templateSpans?.forEach((p,i)=>text+='{'+i+'}'+p.literal.text);markup(text);
   }
   if(ts.isCallExpression(n)){
    const fn=n.expression.getText(tree),arg=fn==='button'?n.arguments[1]:n.arguments[0];
    if(arg&&ts.isStringLiteral(arg)){if(fn==='localizeHTML')markup(arg.text);if(fn==='button'||fn==='t')check(arg.text);}
   }
   ts.forEachChild(n,visit);
  }visit(tree);
 }
 assert.deepEqual([...missing],[]);
});

test('every quality message has all three translations with identical parameters',()=>{
 for(const [key,values]of Object.entries(QUALITY_TRANSLATIONS)){
  assert.equal(values.length,3,key);
  for(const value of values){assert.ok(typeof value==='string'&&value.trim(),key);assert.deepEqual([...key.matchAll(/\{\w+\}/g)].map(m=>m[0]).sort(),[...value.matchAll(/\{\w+\}/g)].map(m=>m[0]).sort(),key);}
 }
});

test('generator controls and account validation messages have four-language coverage',()=>{
 const missing=new Set();
 const source=readFileSync(new URL('../app/page.tsx',import.meta.url),'utf8'),tree=ts.createSourceFile('page.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 function visit(n){if(ts.isCallExpression(n)&&['t','q'].includes(n.expression.getText(tree))&&n.arguments[0]&&ts.isStringLiteral(n.arguments[0])){const key=n.arguments[0].text,catalog=n.expression.getText(tree)==='t'?TRANSLATIONS:QUALITY_TRANSLATIONS;if(!Object.hasOwn(catalog,key))missing.add(key);}ts.forEachChild(n,visit);}visit(tree);
 for(const name of ['lib/account-store.mjs','lib/process-sharing.mjs','public/quality/core.mjs','public/quality/cloud.mjs','public/quality/roundtrip.mjs','public/quality/batch-import.mjs','public/quality/shared-model.mjs']){
  const input=readFileSync(new URL('../'+name,import.meta.url),'utf8'),ast=ts.createSourceFile(name,input,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
  function check(n){if((ts.isNewExpression(n)&&/Error$/.test(n.expression.getText(ast)))||(ts.isCallExpression(n)&&n.expression.getText(ast)==='fail')){const a=n.arguments?.[0];if(a&&ts.isStringLiteral(a)&&!Object.hasOwn(QUALITY_TRANSLATIONS,a.text))missing.add(name+': '+a.text);}ts.forEachChild(n,check);}check(ast);
 }
 assert.deepEqual([...missing],[]);
});
test('quality and generator labels translate in all four languages',()=>{
 assert.equal(LOCALE_STORE,'team5-process-studio-language');assert.equal(normalizeLanguage('xx'),'en');
 assert.equal(t('Protsessid ja parendused',{},'et'),'Protsessid ja parendused');
 assert.equal(t('Protsessid ja parendused',{},'en'),'Processes and improvements');
 assert.equal(t('Töötaja',{},'fr'),'Employé');assert.equal(t('Heaks kiidetud',{},'de'),'Genehmigt');
 assert.equal(t('Systems legend',{},'et'),'Süsteemide legend');
});

test('delayed tab and iframe language events cannot overwrite the latest user choice',()=>{
 const previous=globalThis.localStorage;let stored='et',writes=0;globalThis.localStorage={getItem:()=>stored,setItem:(_,value)=>{stored=value;writes++;}};
 try{
  assert.equal(setLanguagePreference('en'),'en');assert.equal(writes,1);
  assert.equal(syncLanguagePreference('et'),'en');assert.equal(stored,'en');assert.equal(writes,1);
  setLanguagePreference('fr');setLanguagePreference('de');
  for(const delayed of ['en','et','fr','de','fr'])assert.equal(syncLanguagePreference(delayed),'de');
  assert.equal(stored,'de');assert.equal(getLocale(),'de');assert.equal(writes,3);
  setLanguagePreference('de');assert.equal(writes,3);
 }finally{setLanguagePreference('en');if(previous===undefined)delete globalThis.localStorage;else globalThis.localStorage=previous;}
});
test('template localisation preserves process text, history, names, attributes and data values',()=>{
 const previous=globalThis.localStorage;globalThis.localStorage={getItem:()=> 'fr'};
 try{
  const label='Heaks kiidetud',data='Pealkiri',htmlValue='&lt;script&gt;alert(1)&lt;/script&gt;';
  const out=html`<h1>Protsessid ja parendused</h1><p>${label}</p><textarea name="reason">${data}</textarea><button data-action="accepted" title="Protsessiosa: ${htmlValue}">Kiida heaks</button>`;
  assert.match(out,/Processus et améliorations/);assert.match(out,/>Heaks kiidetud<\/p>/);assert.match(out,/>Pealkiri<\/textarea>/);assert.match(out,/data-action="accepted"/);assert.match(out,/Étape : &lt;script&gt;/);assert.doesNotMatch(out,/<script>/);assert.match(out,/>Accepter<\/button>/);
  assert.equal(html`<small>Lk ${2} / ${5}</small>`,'<small>Page 2 / 5</small>');
 }finally{if(previous===undefined)delete globalThis.localStorage;else globalThis.localStorage=previous;}
});
test('server validation details translate without replacing user values',()=>{
 assert.equal(message('Pealkiri: sisesta 1–160 märki.','en'),'Title: enter 1–160 characters.');
 assert.equal(message('Loen lehekülge 2 / 8…','de'),'Seite 2 / 8 wird gelesen…');
 assert.equal(message('Salvestan algfaili 2/4: Müük.png','fr'),'Enregistrement de la source 2/4 : Müük.png');
 assert.match(localizeHTML('<label>Taasta varukoopia<input type="file" accept=".json"></label>','de'),/Datei auswählen/);
});
test('quality AI receives a validated language and never rewrites source evidence for UI locale',async()=>{
 for(const locale of ['et','en','fr','de']){
  const request=prepareQualityRequest({action:'proposal',locale,context:{suggestion:'Keep original source'}});assert.equal(request.locale,locale);
  let sent;const assistance={title:'',problem:'',suggestion:'',benefit:'',reason:'',thanks:'',risks:'',questions:''};
  await qualityAI(request,{apiKey:'test',fetcher:async(_,options)=>{sent=JSON.parse(options.body);return Response.json({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(assistance)}]}]});}});
  assert.equal(sent.store,false);assert.match(sent.instructions,new RegExp({et:'Estonian',en:'English',fr:'French',de:'German'}[locale]));assert.equal(sent.input,JSON.stringify(request.context));
 }
 assert.throws(()=>prepareQualityRequest({action:'proposal',locale:'es',context:{}}),e=>e.code==='INVALID_LOCALE');
});
