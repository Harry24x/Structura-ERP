// Only application validation diagnostics are shown; never relay provider bodies.
export function processDiagnostics(result) {
 if(result?.code!=='INVALID_DRAFT'||!Array.isArray(result.details))return [];
 return result.details.filter(item=>typeof item==='string'&&item.trim()).slice(0,8).map(item=>item.slice(0,1200));
}
const copy={
 en:['Why the draft was rejected','Technical check details','This does not necessarily mean your description is wrong. The generated diagram failed a check.','Try generating again. For a document containing several processes, examples or translations, select one process and one language first. Your input and previous diagram are kept.'],
 et:['Miks mustand tagasi lükati','Kontrolli tehnilised üksikasjad','See ei tähenda tingimata, et sinu kirjeldus on vale. Loodud diagramm ei läbinud kontrolli.','Proovi uuesti luua. Kui fail sisaldab mitut protsessi, näiteid või tõlkeid, vali esmalt üks protsess ja üks keel. Sinu sisend ja eelmine diagramm säilivad.'],
 fr:['Pourquoi le brouillon a été rejeté','Détails techniques du contrôle','Cela ne signifie pas forcément que votre description est incorrecte. Le diagramme généré a échoué à un contrôle.','Réessayez la génération. Si le document contient plusieurs processus, exemples ou traductions, sélectionnez d’abord un processus et une langue. Votre saisie et le diagramme précédent sont conservés.'],
 de:['Warum der Entwurf abgelehnt wurde','Technische Prüfdetails','Das bedeutet nicht unbedingt, dass Ihre Beschreibung falsch ist. Das erstellte Diagramm hat eine Prüfung nicht bestanden.','Versuchen Sie die Erstellung erneut. Enthält das Dokument mehrere Prozesse, Beispiele oder Übersetzungen, wählen Sie zunächst einen Prozess und eine Sprache. Ihre Eingabe und das vorherige Diagramm bleiben erhalten.']
};
export function diagnosticCopy(locale){const [title,details,explanation,next]=copy[locale]||copy.en;return {title,details,explanation,next};}
