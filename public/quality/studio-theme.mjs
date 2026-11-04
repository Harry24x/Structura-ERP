const key='process-studio-theme';
function apply(value){
 document.documentElement.dataset.studioTheme=value==='lagoon'||value==='ocean'?value:'original';
}
try{apply(localStorage.getItem(key));}catch{apply(null);}
window.addEventListener('storage',event=>{if(event.key===key||event.key===null)apply(event.newValue);});
