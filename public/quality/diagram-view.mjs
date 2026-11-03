// Display geometry only: never edits a document, proposal or process version.
export function svgSize(svg){
 const match=svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
 if(!match||!Number(match[1])||!Number(match[2]))throw new Error('Skeemi mõõtmeid ei leitud.');
 return {width:Number(match[1]),height:Number(match[2])};
}
export function fitScale(size,viewport,padding=44){
 if(![size.width,size.height,viewport.width,viewport.height].every(n=>Number.isFinite(n)&&n>0))return 1;
 return Math.max(.001,Math.min(1,Math.max(1,viewport.width-padding)/size.width,Math.max(1,viewport.height-padding)/size.height));
}
