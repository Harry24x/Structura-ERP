import {MAX_SOURCE} from './process.mjs';
import {MAX_MARKDOWN_BYTES,parseMarkdown} from './markdown.mjs';

export const MAX_DOCUMENT_BYTES=20_000_000;
export const MAX_TEXT_BYTES=2_000_000;
export const MAX_PDF_PAGES=200;
export const FILE_ACCEPT='.pdf,.docx,.txt,.md,.markdown';
const fail=message=>{throw new Error(message);};
const aborted=signal=>{if(signal?.aborted)throw new DOMException('Cancelled','AbortError');};

export function fileFormat(name,size){
 const ext=String(name).split('.').at(-1).toLowerCase();
 if(ext==='doc')fail('Older Word .doc files are not supported. Save a copy as .docx and open it.');
 if(!['pdf','docx','txt','md','markdown'].includes(ext))fail('Choose a PDF, Word (.docx), TXT or Markdown file.');
 if(!Number.isFinite(size)||size<=0)fail('This file is empty. Choose a file containing text.');
 const limit=['md','markdown'].includes(ext)?MAX_MARKDOWN_BYTES:ext==='txt'?MAX_TEXT_BYTES:MAX_DOCUMENT_BYTES;
 if(size>limit)fail(ext==='pdf'||ext==='docx'?'PDF and Word files must be smaller than 20 MB.':'TXT and Markdown files must be smaller than 2 MB.');
 return ext;
}

export function decodeText(bytes){
 let encoding='utf-8';
 if(bytes[0]===255&&bytes[1]===254)encoding='utf-16le';
 if(bytes[0]===254&&bytes[1]===255)encoding='utf-16be';
 let text;try{text=new TextDecoder(encoding,{fatal:true}).decode(bytes);}catch{fail('The text encoding could not be read. Save the file as UTF-8 and try again.');}
 if(text.includes('\0')||/[\x01-\x08\x0B\x0E-\x1F]/.test(text))fail('This is not a readable text file. Choose a text document.');
 return text.replace(/^\uFEFF/,'').replace(/\r\n?/g,'\n');
}

export function checkedText(text){
 text=String(text).replace(/^\uFEFF/,'').replace(/\r\n?/g,'\n').trim();
 if(!text)fail('No readable text was found. For a scanned document, first create a searchable PDF using OCR.');
 if(text.length>MAX_SOURCE)fail('The extracted text exceeds 120,000 characters. Split the document into smaller sections.');
 return text;
}

// Validate DOCX container size before decompression; do not load images or HTML.
export function checkDocxArchive(bytes){
 const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
 if(bytes.length<22||view.getUint32(0,true)!==0x04034b50)fail('The Word file could not be read. Open it in Word and save an unprotected .docx copy.');
 let end=-1;
 for(let i=bytes.length-22;i>=Math.max(0,bytes.length-65557);i--){if(view.getUint32(i,true)===0x06054b50&&i+22+view.getUint16(i+20,true)===bytes.length){end=i;break;}}
 if(end<0)fail('The Word file is damaged or unsupported. Save a new .docx copy.');
 const count=view.getUint16(end+10,true),offset=view.getUint32(end+16,true),directorySize=view.getUint32(end+12,true);
 if(count>2000||count===65535||offset+directorySize!==end||view.getUint16(end+4,true)!==0||view.getUint16(end+6,true)!==0||view.getUint16(end+8,true)!==count)fail('This Word document is too complex. Save a smaller .docx copy.');
 let pos=offset,total=0,hasDocument=false;const entries=[],names=new Set();
 for(let n=0;n<count;n++){
  if(pos+46>bytes.length||view.getUint32(pos,true)!==0x02014b50)fail('The Word file is damaged or unsupported. Save a new .docx copy.');
  const flags=view.getUint16(pos+8,true),method=view.getUint16(pos+10,true),compressed=view.getUint32(pos+20,true),length=view.getUint32(pos+24,true),nameLen=view.getUint16(pos+28,true),extra=view.getUint16(pos+30,true),comment=view.getUint16(pos+32,true),local=view.getUint32(pos+42,true);
  total+=length;if(total>50_000_000||flags&1)fail('This Word document is encrypted or too complex. Save a smaller, unprotected .docx copy.');
  if(pos+46+nameLen+extra+comment>end||local+30>offset||![0,8].includes(method)||view.getUint32(local,true)!==0x04034b50)fail('The Word file is damaged or unsupported. Save a new .docx copy.');
  const name=new TextDecoder().decode(bytes.subarray(pos+46,pos+46+nameLen));
  const localNameLen=view.getUint16(local+26,true),data=local+30+localNameLen+view.getUint16(local+28,true);
  if(names.has(name)||view.getUint16(pos+34,true)!==0||data+compressed>offset||view.getUint16(local+6,true)!==flags||view.getUint16(local+8,true)!==method||new TextDecoder().decode(bytes.subarray(local+30,local+30+localNameLen))!==name)fail('The Word file is damaged or unsupported. Save a new .docx copy.');
  names.add(name);entries.push({data,compressed,length,method});
  if(name==='word/document.xml')hasDocument=true;
  pos+=46+nameLen+extra+comment;
 }
 if(pos!==end)fail('The Word file is damaged or unsupported. Save a new .docx copy.');
 if(!hasDocument)fail('This file is not a Word .docx document.');
 return entries;
}

// ZIP metadata is untrusted. Count actual decompressed bytes in bounded chunks
// before handing the container to a parser that materializes complete entries.
export async function checkDocxContents(bytes,signal){
 const entries=checkDocxArchive(bytes);let total=0;
 for(const entry of entries){
  aborted(signal);
  let length=0;
  if(entry.method===0)length=entry.compressed;
  else{
   const stream=new Blob([bytes.subarray(entry.data,entry.data+entry.compressed)]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
   const reader=stream.getReader(),cancel=()=>{void reader.cancel().catch(()=>{});};
   signal?.addEventListener('abort',cancel,{once:true});
   try{
    for(;;){const {done,value}=await reader.read();aborted(signal);if(done)break;length+=value.byteLength;
     if(length>entry.length||total+length>50_000_000)fail('This Word document is encrypted or too complex. Save a smaller, unprotected .docx copy.');
    }
   }finally{signal?.removeEventListener('abort',cancel);await reader.cancel().catch(()=>{});reader.releaseLock();}
  }
  if(length!==entry.length)fail('The Word file is damaged or unsupported. Save a new .docx copy.');
  total+=length;
 }
 aborted(signal);
}

// Retain the PDF's text stream order, using explicit line breaks and coordinates.
// Complex columns/tables still require human review in the text preview.
export function pdfPageText(items){
 let text='',previous=null;
 for(const item of items){
  if(typeof item.str!=='string')continue;
  const y=item.transform?.[5],x=item.transform?.[4];
  if(previous&&text&&!text.endsWith('\n')){
   const differentLine=Number.isFinite(y)&&Number.isFinite(previous.y)&&Math.abs(y-previous.y)>Math.max(2,(item.height||10)*.5);
   const gap=Number.isFinite(x)&&Number.isFinite(previous.end)&&x-previous.end>1;
   if(differentLine)text+='\n';else if(gap&&!/\s$/.test(text)&&!/^\s/.test(item.str))text+=' ';
  }
  text+=item.str;if(item.hasEOL)text+='\n';
  if(item.str)previous={y,end:Number.isFinite(x)?x+(item.width||0):null};
 }
 return text.trim();
}

async function readPDF(bytes,signal,onProgress){
 if(!new TextDecoder('latin1').decode(bytes.subarray(0,1024)).includes('%PDF-'))fail('The file does not contain a readable PDF.');
 const [pdfjs,worker]=await Promise.all([import('pdfjs-dist/build/pdf.mjs'),import('pdfjs-dist/build/pdf.worker.min.mjs?url')]);
 aborted(signal);pdfjs.GlobalWorkerOptions.workerSrc=worker.default;
 const task=pdfjs.getDocument({data:bytes,isEvalSupported:false,disableFontFace:true,useSystemFonts:true,useWorkerFetch:false,stopAtErrors:true});
 const cancel=()=>{void task.destroy();};signal?.addEventListener('abort',cancel,{once:true});
 try{
  const pdf=await task.promise;aborted(signal);
  if(pdf.numPages>MAX_PDF_PAGES)fail('PDF files may contain up to 200 pages. Choose a smaller document.');
  const pages=[],emptyPages=[];let length=0;
  for(let i=1;i<=pdf.numPages;i++){
   aborted(signal);onProgress?.(i,pdf.numPages);
   const page=await pdf.getPage(i);const content=await page.getTextContent();
   const text=pdfPageText(content.items);page.cleanup();
   if(!text)emptyPages.push(i);
   pages.push(text);length+=text.length+2;
   if(length>MAX_SOURCE)fail('The extracted text exceeds 120,000 characters. Split the document into smaller sections.');
  }
  aborted(signal);
  return {text:checkedText(pages.join('\n\n')),pageCount:pdf.numPages,emptyPages,warnings:['PDF text order may differ from the page layout. Check tables, columns and missing text before generating.',...(emptyPages.length?['Some PDF pages contain no readable text. They may be blank or scanned; OCR is not included.']:[])]};
 }catch(error){
  aborted(signal);
  if(error?.name==='PasswordException')fail('This PDF is password-protected. Save an unlocked copy before importing.');
  if(error?.name==='InvalidPDFException')fail('The PDF is damaged or unsupported. Save a new PDF copy.');
  throw error;
 }finally{signal?.removeEventListener('abort',cancel);await task.destroy();}
}

export async function extractFile(file,{signal,onProgress}={}){
 const format=fileFormat(file.name,file.size);aborted(signal);
 const buffer=await file.arrayBuffer();aborted(signal);const bytes=new Uint8Array(buffer);
 if(format==='md'||format==='markdown')return {...parseMarkdown(decodeText(bytes)),format:'md',warnings:[]};
 let result;
 if(format==='txt')result={text:checkedText(decodeText(bytes)),warnings:[]};
 else if(format==='pdf')result=await readPDF(bytes,signal,onProgress);
 else{
  await checkDocxContents(bytes,signal);
  const module=await import('mammoth/mammoth.browser.js');aborted(signal);
  const mammoth=module.default||module;
  const converted=await mammoth.extractRawText({arrayBuffer:buffer},{externalFileAccess:false});aborted(signal);
  result={text:checkedText(converted.value),warnings:['Word import reads document text, not images or page layout. Check tables and any omitted content.',...(converted.messages.length?['The Word reader reported conversion warnings. Compare the extracted text with the original document.']:[])]};
 }
 aborted(signal);return {kind:'text',format,canRestore:false,...result};
}
