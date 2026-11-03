import {toSVG} from './process.mjs';

const COPY={
 en:{busy:'Creating PDF…',error:'PDF export failed. Please try again.',hint:'Download the complete current diagram and legends as a PDF. Large diagrams use a larger page; zoom in to read.',draft:'Draft - not reviewed',reviewed:'Human reviewed',overview:'Customer overview',detail:'Detailed flowchart'},
 et:{busy:'Koostan PDF-i…',error:'PDF-i eksport ebaõnnestus. Proovi uuesti.',hint:'Laadi kogu valitud diagramm koos legendidega PDF-ina alla. Suure diagrammi leht on suurem; lugemiseks suumi sisse.',draft:'Mustand - üle vaatamata',reviewed:'Inimene üle vaadanud',overview:'Kliendi üldvaade',detail:'Detailne vooskeem'},
 fr:{busy:'Création du PDF…',error:'Échec de l’export PDF. Veuillez réessayer.',hint:'Téléchargez le diagramme complet et ses légendes en PDF. Les grands diagrammes utilisent une page plus grande ; zoomez pour lire.',draft:'Brouillon - non vérifié',reviewed:'Vérifié par une personne',overview:'Vue d’ensemble client',detail:'Organigramme détaillé'},
 de:{busy:'PDF wird erstellt…',error:'PDF-Export fehlgeschlagen. Bitte erneut versuchen.',hint:'Das vollständige Diagramm mit Legenden als PDF herunterladen. Große Diagramme verwenden eine größere Seite; zum Lesen hineinzoomen.',draft:'Entwurf - ungeprüft',reviewed:'Von einer Person geprüft',overview:'Kundenübersicht',detail:'Detailliertes Flussdiagramm'}
};
export const pdfCopy=locale=>COPY[locale]||COPY.en;

export function pdfPageSize(width,height){
 if(!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0)throw new Error('Invalid diagram dimensions');
 const margin=28,header=80,scale=Math.min(1,(14000-margin*2)/width,(14000-header-margin)/height);
 return {width:Math.max(595,width*scale+margin*2),height:Math.max(420,height*scale+header+margin),scale,margin,header};
}

let fontData;
async function fonts(){
 if(!fontData)fontData=Promise.all(['DejaVuSans','DejaVuSans-Bold'].map(async name=>{
  const response=await fetch('/fonts/'+name+'.ttf');if(!response.ok)throw new Error('Font unavailable');
  const bytes=new Uint8Array(await response.arrayBuffer());let binary='';
  for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
  return {name,data:btoa(binary)};
 })).catch(error=>{fontData=null;throw error;});
 return fontData;
}

// Only pass our escaped, internally rendered SVG; no arbitrary uploaded SVG.
export async function exportProcessPDF(process,options={}, {locale='en',overview=false,filename='process.pdf'}={}){
 const [{jsPDF},fontFiles]=await Promise.all([import('jspdf'),fonts()]);
 await import('svg2pdf.js');
 const svgText=toSVG(process,[],options);
 const svg=new DOMParser().parseFromString(svgText,'image/svg+xml').documentElement;
 if(svg.localName!=='svg'||svg.querySelector('parsererror'))throw new Error('Invalid SVG');
 const [, ,width,height]=svg.getAttribute('viewBox').split(/\s+/).map(Number);
 const page=pdfPageSize(width,height),copy=pdfCopy(locale);
 const doc=new jsPDF({orientation:page.width>page.height?'landscape':'portrait',unit:'pt',format:[page.width,page.height],compress:true,putOnlyUsedFonts:true});
 fontFiles.forEach(({name,data},index)=>{doc.addFileToVFS(name+'.ttf',data);doc.addFont(name+'.ttf','ProcessStudio',index?'bold':'normal');});
 const fontFaces=await Promise.all(fontFiles.map(async({name},index)=>{
  const face=new FontFace('ProcessStudio',`url(/fonts/${name}.ttf)`,{weight:index?'700':'400'});await face.load();document.fonts.add(face);return face;
 }));
 svg.querySelectorAll('text').forEach(node=>{node.setAttribute('font-family','ProcessStudio');node.setAttribute('font-weight',Number(node.getAttribute('font-weight')||400)>=600?'700':'400');});
 svg.setAttribute('width',String(width));svg.setAttribute('height',String(height));
 const host=document.createElement('div');host.style.cssText='position:fixed;left:-100000px;top:0;pointer-events:none';host.appendChild(svg);document.body.appendChild(host);
 try{
  const diagramLabel=options.notation==='bpmn'?'BPMN':overview?copy.overview:copy.detail;
  doc.setProperties({title:process.title,subject:diagramLabel,creator:'Process Studio'});
  doc.setFont('ProcessStudio','bold');doc.setFontSize(18);doc.setTextColor('#273d50');
  let titleSize=18;while(titleSize>9&&doc.splitTextToSize(process.title,page.width-page.margin*2).length>2){doc.setFontSize(--titleSize);}
  doc.text(process.title,page.margin,30,{maxWidth:page.width-page.margin*2});
  doc.setFont('ProcessStudio','normal');doc.setFontSize(10);
  doc.text(`${diagramLabel} | v${process.version} | ${process.mode} | ${process.reviewed?copy.reviewed:copy.draft}`,page.margin,63);
  await doc.svg(svg,{x:page.margin,y:page.header,width:width*page.scale,height:height*page.scale});
  doc.save(filename);
 }finally{host.remove();fontFaces.forEach(face=>document.fonts.delete(face));}
}
