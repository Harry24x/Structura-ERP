import * as pdfjs from '/quality/vendor/build/pdf.mjs';
pdfjs.GlobalWorkerOptions.workerSrc='/quality/vendor/build/pdf.worker.mjs';
export async function openPDF(blob,signal){
 const bytes=new Uint8Array(await blob.arrayBuffer());
 if(!new TextDecoder('latin1').decode(bytes.subarray(0,1024)).includes('%PDF-'))throw new Error('Fail ei sisalda loetavat PDF-i.');
 const task=pdfjs.getDocument({data:bytes,isEvalSupported:false,enableXfa:false,cMapUrl:'/quality/vendor/cmaps/',cMapPacked:true,standardFontDataUrl:'/quality/vendor/standard_fonts/',wasmUrl:'/quality/vendor/wasm/'});
 const cancel=()=>{void task.destroy();};signal?.addEventListener('abort',cancel,{once:true});
 try{const pdf=await task.promise;return {pdf,close:async()=>{signal?.removeEventListener('abort',cancel);await task.destroy();}};}catch(error){signal?.removeEventListener('abort',cancel);throw error;}
}
export async function inspectPDF(pdf,onProgress,signal){
 if(pdf.numPages>50)throw new Error('Katseversioonis on piirang 50 lehekülge.');
 const pages=[];
 for(let number=1;number<=pdf.numPages;number++){
  if(signal?.aborted)throw new DOMException('Katkestatud','AbortError');
  onProgress(number,pdf.numPages);
  const page=await pdf.getPage(number),viewport=page.getViewport({scale:1}),content=await page.getTextContent();
  const texts=content.items.filter(item=>typeof item.str==='string'&&item.str.trim()).map(item=>{
   const position=pdfjs.Util.transform(viewport.transform,item.transform),height=Math.hypot(position[2],position[3]);
   return {text:item.str,x:position[4],y:position[5]-height,w:item.width,h:height};
  });
  pages.push({width:viewport.width,height:viewport.height,texts:texts.slice(0,6000)});page.cleanup();
 }
 return pages;
}
