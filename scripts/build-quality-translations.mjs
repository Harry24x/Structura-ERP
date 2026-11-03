import {readFileSync,writeFileSync,readdirSync,copyFileSync} from 'node:fs';
import {TRANSLATIONS} from '../lib/i18n.mjs';
const catalog=Object.fromEntries(Object.entries(TRANSLATIONS).map(([en,[et,fr,de]])=>[et,[en,fr,de]]));
for(const [i,line]of readFileSync(new URL('../lib/quality-translations.tsv',import.meta.url),'utf8').trim().split(/\r?\n/).entries()){
 const row=line.split('|');if(row.length!==4||row.some(s=>!s.trim()))throw new Error('Invalid translation row '+(i+1));
 catalog[row[0]]=row.slice(1);
}
writeFileSync(new URL('../public/quality/translations.mjs',import.meta.url),'// Generated from lib/quality-translations.tsv and the generator catalogue.\nexport const QUALITY_TRANSLATIONS = '+JSON.stringify(catalog,null,1)+';\n');
console.log(Object.keys(catalog).length+' complete four-language messages');
for(const name of readdirSync(new URL('../lib/',import.meta.url)).filter(n=>n.endsWith('i18n.mjs')))copyFileSync(new URL('../lib/'+name,import.meta.url),new URL('../public/quality/lib/'+name,import.meta.url));

// Share the process and presentation contract across both workspaces.
for(const name of ['process.mjs','bpmn.mjs','process-explorer.mjs','process-signature.mjs','dynamics-catalog.mjs','dynamics-catalog-index.mjs'])copyFileSync(new URL('../lib/'+name,import.meta.url),new URL('../public/quality/lib/'+name,import.meta.url));
