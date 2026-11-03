import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile,mkdtemp,mkdir,writeFile,readdir,rm} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {createElement} from 'react';
import {ESLint} from 'eslint';
import {ImageResponse} from 'vinext/shims/og';

const require=createRequire(import.meta.url);
const project=fileURLToPath(new URL('../',import.meta.url));

test('React hook compiler lints valid and invalid components with Zod 4',async()=>{
 const fromNext=createRequire(require.resolve('eslint-config-next'));
 const hooks=fromNext('eslint-plugin-react-hooks');
 const lint=new ESLint({overrideConfigFile:true,overrideConfig:[{
  plugins:{'react-hooks':hooks},
  rules:{'react-hooks/rules-of-hooks':'error','react-hooks/refs':'error','react-hooks/config':'error'},
 }]});
 const [good]=await lint.lintText("import {useState} from 'react'; export function Good(){const [value]=useState(0);return value;}",{filePath:'component.js'});
 assert.equal(good.errorCount,0,JSON.stringify(good.messages));
 const [bad]=await lint.lintText("import {useState} from 'react'; export function Bad({enabled}){if(enabled)useState(0);return null;}",{filePath:'component.js'});
 assert.ok(bad.messages.some(message=>message.ruleId==='react-hooks/rules-of-hooks'));
 const [ref]=await lint.lintText("import {useRef} from 'react'; export function BadRef(){const ref=useRef(0);return ref.current;}",{filePath:'component.js'});
 assert.ok(ref.messages.some(message=>message.ruleId==='react-hooks/refs'),JSON.stringify(ref.messages));
});

test('Drizzle generates SQL from a TypeScript config without the abandoned esm-loader',async()=>{
 const parent=path.join(project,'.sites-runtime');await mkdir(parent,{recursive:true});
 const temporary=await mkdtemp(path.join(parent,'toolchain-test-'));
 try{
  const schema=path.join(temporary,'schema.ts'),out=path.join(temporary,'migrations'),config=path.join(temporary,'config.ts');
  await writeFile(schema,"import {sqliteTable,integer,text} from 'drizzle-orm/sqlite-core'; export const checks=sqliteTable('security_check',{id:integer('id').primaryKey(),label:text('label').notNull()});\n");
  const relative=file=>path.relative(project,file).split(path.sep).join('/');
  await writeFile(config,`import {defineConfig} from 'drizzle-kit'; export default defineConfig(${JSON.stringify({schema:relative(schema),out:relative(out),dialect:'sqlite'})});\n`);
  const bin=path.join(path.dirname(require.resolve('drizzle-kit')),'bin.cjs');
  const {stdout,stderr}=await promisify(execFile)(process.execPath,[bin,'generate','--config',config],{cwd:project,timeout:60000});
  const files=await readdir(out);const sql=files.find(name=>name.endsWith('.sql'));
  assert.ok(sql,stdout+stderr);
  assert.match(await readFile(path.join(out,sql),'utf8'),/CREATE TABLE `security_check`/);
 }finally{
  assert.equal(path.dirname(temporary),parent);
  await rm(temporary,{recursive:true,force:true});
 }
});

test('Vinext ImageResponse renders PNG through the patched OG and Satori pair',async()=>{
 const bytes=await readFile(new URL('../public/fonts/DejaVuSans.ttf',import.meta.url));
 const data=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);
 const response=new ImageResponse(createElement('div',{style:{display:'flex',fontFamily:'Audit',fontSize:20,color:'black',background:'white',width:'100%',height:'100%'}},'Töö · réception · Prüfung'),{width:320,height:100,fonts:[{name:'Audit',data,weight:400,style:'normal'}]});
 assert.equal(response.headers.get('content-type'),'image/png');
 const png=Buffer.from(await response.arrayBuffer());
 assert.deepEqual(png.subarray(0,8),Buffer.from([137,80,78,71,13,10,26,10]));
 assert.equal(png.readUInt32BE(16),320);assert.equal(png.readUInt32BE(20),100);
 assert.ok(png.length>1000);
});

test('Satori escapes a crafted color instead of inserting SVG elements',async()=>{
 const fromVinext=createRequire(import.meta.resolve('vinext'));
 const fromOG=createRequire(fromVinext.resolve('@vercel/og'));
 const module=fromOG('satori'),satori=module.default||module;
 const bytes=await readFile(new URL('../public/fonts/DejaVuSans.ttf',import.meta.url));
 const color='blue"/><script data-audit="injected"/><path fill="blue';
 const svg=await satori(createElement('div',{style:{color}},'Safe label'),{width:160,height:80,embedFont:false,fonts:[{name:'Audit',data:bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)}]});
 assert.ok(!svg.includes('<script'));
 assert.ok(svg.includes('fill="blue&quot;'));
 assert.ok(svg.includes('&lt;script'));
});
