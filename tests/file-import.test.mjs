import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fileFormat,decodeText,checkedText,checkDocxArchive,checkDocxContents,pdfPageText,extractFile} from '../lib/file-import.mjs';
import {FILE_IMPORT_TRANSLATIONS} from '../lib/file-import-i18n.mjs';
import {examples} from '../lib/examples.mjs';
import {toMarkdown} from '../lib/markdown.mjs';
const file=(name,bytes)=>({name,size:bytes.length,arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)});
test('formats and upload limits are checked before reading the file',async()=>{
 assert.equal(fileFormat('SOURCE.PDF',20_000_000),'pdf');assert.equal(fileFormat('source.docx',1),'docx');
 assert.throws(()=>fileFormat('source.doc',100),/\.docx/);
 for(const [name,size] of [['bad.exe',1],['bad.pdf',20_000_001],['bad.txt',2_000_001],['empty.docx',0]])await assert.rejects(extractFile({name,size,arrayBuffer:()=>assert.fail('must not read')}));
});
test('UTF-8 and BOM-tagged UTF-16 retain accented text; invalid encoding and binary fail',()=>{
 const text='Töö, réception, Prüfung';assert.equal(decodeText(new TextEncoder().encode(text)),text);
 assert.equal(decodeText(Buffer.concat([Buffer.from([255,254]),Buffer.from(text,'utf16le')])),text);
 const b=Buffer.from(text,'utf16le');b.swap16();assert.equal(decodeText(Buffer.concat([Buffer.from([254,255]),b])),text);
 assert.throws(()=>decodeText(new Uint8Array([255,255])),/UTF-8/);assert.throws(()=>decodeText(new Uint8Array([65,0,66])),/text file/);
});
test('plain TXT and Markdown import preserves input and only Markdown can restore a snapshot',async()=>{
 const text='<script>not executed</script>\nTöötaja kontrollib.';
 const r=await extractFile(file('source.txt',new TextEncoder().encode(text)));assert.equal(r.text,text);assert.equal(r.canRestore,false);
 const md=toMarkdown(examples[0].process);const restored=await extractFile(file('process.md',new TextEncoder().encode(md)));assert.equal(restored.canRestore,true);
 const txt=await extractFile(file('process.txt',new TextEncoder().encode(md)));assert.equal(txt.kind,'text');assert.equal(txt.canRestore,false);
});
test('real Word document paragraphs and table text survive extraction',async()=>{
 const bytes=fs.readFileSync(new URL('./fixtures/source-import.docx',import.meta.url));
 const r=await extractFile(file('source.docx',bytes));
 assert.equal(r.format,'docx');assert.equal(r.canRestore,false);
 for(const text of ['Töötaja esitab taotluse.','réception','Prüfung','Vastutaja','Tegevus','Kontroll'])assert.ok(r.text.includes(text));
 assert.ok(r.text.indexOf('Kui juht kinnitab')<r.text.indexOf('Kui juht lükkab'));
 assert.ok(r.warnings.length);
});
test('invalid or huge Word containers are rejected before decompression',()=>{
 assert.throws(()=>checkDocxArchive(new Uint8Array([1,2,3])),/Word/);
 const bytes=fs.readFileSync(new URL('./fixtures/source-import.docx',import.meta.url));
 checkDocxArchive(bytes);const damaged=Buffer.from(bytes);damaged[0]=0;assert.throws(()=>checkDocxArchive(damaged));
 const huge=Buffer.from(bytes),central=huge.indexOf(Buffer.from([0x50,0x4b,0x01,0x02]));huge.writeUInt32LE(60_000_000,central+24);assert.throws(()=>checkDocxArchive(huge),/complex/);
});
test('PDF text keeps line boundaries and word spacing without splitting text fragments',()=>{
 const item=(str,x,y,width=20,hasEOL=false)=>({str,width,height:10,transform:[1,0,0,1,x,y],hasEOL});
 assert.equal(pdfPageText([item('Töö',0,100,20),item('taja',20,100,20),item('kontrollib.',45,100,50,true),item('Juht kinnitab.',0,80)]),'Töötaja kontrollib.\nJuht kinnitab.');
});
test('empty extraction, overlong text, and cancelled reads never yield usable input',async()=>{
 assert.throws(()=>checkedText('  '),/OCR/);assert.throws(()=>checkedText('x'.repeat(120001)),/120,000/);
 const controller=new AbortController();controller.abort();await assert.rejects(extractFile(file('a.txt',new Uint8Array([65])),{signal:controller.signal}),e=>e.name==='AbortError');
 await assert.rejects(extractFile(file('fake.pdf',new TextEncoder().encode('not a pdf'))),/readable PDF/);
});
test('file import messages all have Estonian, French and German translations',()=>{
 for(const translations of Object.values(FILE_IMPORT_TRANSLATIONS)){assert.equal(translations.length,3);assert.ok(translations.every(t=>typeof t==='string'&&t.length));}
});

test('Word preflight rejects forged decompressed lengths and inconsistent ZIP directories',async()=>{
 const bytes=fs.readFileSync(new URL('./fixtures/source-import.docx',import.meta.url));
 await checkDocxContents(bytes);
 const forged=Buffer.from(bytes),central=forged.indexOf(Buffer.from([0x50,0x4b,0x01,0x02]));
 forged.writeUInt32LE(1,central+24);
 await assert.rejects(checkDocxContents(forged),/complex|damaged/);
 const mismatched=Buffer.from(bytes);mismatched.writeUInt16LE(0,central+10);
 assert.throws(()=>checkDocxArchive(mismatched),/damaged/);
 const wrongCount=Buffer.from(bytes);wrongCount.writeUInt16LE(0,wrongCount.length-22+10);
 assert.throws(()=>checkDocxArchive(wrongCount),/complex|damaged/);
 const controller=new AbortController();controller.abort();
 await assert.rejects(checkDocxContents(bytes,controller.signal),{name:'AbortError'});
});

test('cancellation after the file read never publishes a late TXT or Markdown result',async()=>{
 for(const name of ['a.txt','a.md']){
  const controller=new AbortController();let finish;
  const result=extractFile({name,size:1,arrayBuffer:()=>new Promise(resolve=>{finish=resolve;})},{signal:controller.signal});
  controller.abort();finish(new Uint8Array([65]).buffer);
  await assert.rejects(result,{name:'AbortError'});
 }
});
