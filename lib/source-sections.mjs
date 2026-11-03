// Explicit section labels supplement model interpretation; ordinary prose is
// never classified by isolated words or guessed verb tense. Preserve source text.
const needLabels=['Need','Vajadus','Besoin','Bedarf'];
const futureLabels=[
 'Summary of identified needs','Future needs','Future requirements','Proposed improvements','Requested improvement',
 'Tuvastatud vajaduste kokkuvõte','Tulevikusoovid','Tulevikuvajadused','Tulevikunõuded','Parendusettepanekud','Soovitud muudatus','Soovitud muudatused','Kavandatavad muudatused',
 'Résumé des besoins identifiés','Synthèse des besoins identifiés','Besoins futurs','Exigences futures','Améliorations proposées','Amélioration demandée',
 'Zusammenfassung der ermittelten Bedarfe','Zukünftige Anforderungen','Zukünftige Bedarfe','Geplante Verbesserungen','Gewünschte Änderung','Gewünschte Änderungen'
];
const currentLabels=[
 "Today's process",'Today’s process','Current process','Current practice','Current state','As-is',
 'Praegune protsess','Praegune töökorraldus','Hetkeolukord','Tänane protsess',
 'Processus actuel','Situation actuelle','Pratiques actuelles',
 'Aktueller Prozess','Ist-Prozess','Aktueller Zustand','Heutiger Prozess'
];
const clarificationLabels=['Clarification','Answer','Täpsustus','Vastus','Réponse','Klarstellung','Antwort'];
const normalized=value=>value.normalize('NFKC').trim().toLocaleLowerCase();
const labels=values=>new Set(values.map(normalized));
const needs=labels(needLabels),future=labels(futureLabels),current=labels(currentLabels),clarification=labels(clarificationLabels);

function section(line) {
 const heading=line.match(/^\s{0,3}(#{1,6})\s+(.+?)(?:\s+#+\s*)?$/);
 const value=(heading?heading[2]:line).replace(/\*\*|__/g,'').trim().replace(/^\d+[.)]\s+/, '');
 const colon=value.search(/[:：]/),label=normalized(colon<0?value:value.slice(0,colon));
 const suffix=colon<0?'':value.slice(colon+1).trim();
 if(needs.has(label))return {kind:'need',level:heading?.[1].length??null,inline:!!suffix};
 if(future.has(label))return {kind:'future',level:heading?.[1].length??null};
 if(current.has(label)||colon>=0&&clarification.has(label))return {kind:'current'};
 if(/^(?:Example|Näide|Exemple|Beispiel)\s+\d+(?:\b|[.:])/iu.test(value))return {kind:'current'};
 return {kind:'other',level:heading?.[1].length??null};
}

export function sourceBlocks(source) {
 const blocks=[];let isFuture=false,untilBlank=false,level=null,lines=[];
 const flush=()=>{if(lines.length)blocks.push({future:isFuture,text:lines.join('\n')});lines=[];};
 for(const line of String(source).split(/\r?\n/)) {
  const label=section(line);
  if(label.kind==='need'||label.kind==='future') {
   flush();isFuture=true;untilBlank=label.kind==='need'&&label.inline;level=label.level;
  } else if(label.kind==='current'||isFuture&&label.level!==null&&(level===null||label.level<=level)) {
   flush();isFuture=false;untilBlank=false;level=null;
  } else if(!line.trim()&&isFuture&&untilBlank) {
   flush();isFuture=false;untilBlank=false;level=null;
  }
  lines.push(line);
 }
 flush();return blocks.filter(block=>block.text.trim());
}

export function explicitFutureNeeds(source) {
 const blocks=sourceBlocks(source).filter(block=>block.future);
 // A final needs summary often repeats the individually labelled needs.
 const individual=blocks.filter(block=>section(block.text.split('\n')[0]).kind==='need');
 return (individual.length?individual:blocks).map(block=>{
  if(section(block.text.split('\n')[0]).kind!=='need')return block.text.trim();
  return block.text.replace(/^\s*(?:#{1,6}\s+)?(?:\*\*|__)?(?:Need|Vajadus|Besoin|Bedarf)(?:\*\*|__)?\s*[:：]\s*(?:\*\*|__)?\s*/iu,'').trim();
 });
}
