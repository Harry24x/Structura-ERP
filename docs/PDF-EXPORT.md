# PDF diagram export / PDF-eksport / Export PDF / PDF-Export

28 October 2026 · Process Studio v0.11 supplement

## Eesti

Diagrammi all, SVG ja Mermaidi kõrval, vajuta **PDF**. Alla laaditakse valitud diagramm tervikuna koos süsteemide ja tegevusvaldkondade legendi, pealkirja, versiooni ning ülevaatusolekuga. Vooskeemi puhul säilib valitud vasakult paremale või ülalt alla suund. Kliendi üldvaates eksporditakse koondvaade. Ekraani suum ja kerimisasend ei piira eksporti.

PDF on suurendatav vektorgraafika. Lehe mõõtmed kohanduvad diagrammiga; pikk vooskeem võib vajada lugemiseks sissesuumimist. Paberile printimisel vali printeris sobiv lehesuurus või sobita lehele. PDF ei sisalda taastamiseks vajalikke protsessiandmeid: töö jätkamiseks säilita ka Markdown või JSON. PDF-eksport ei kasuta AI-d ega saada protsessi välisesse teisendusteenusesse.

## English

Select **PDF** below the diagram, next to SVG and Mermaid. The download contains the entire selected diagram, system and business-area legends, title, version and review status. Flowcharts retain the chosen left-to-right or top-to-bottom direction. Customer overview exports the summary. Screen zoom and scrolling do not limit the export.

The PDF uses vector graphics and a page sized for the diagram. Zoom in to read a long flowchart. For paper printing, select an appropriate paper size or fit to page. PDF does not contain restorable process data; retain Markdown or JSON to continue editing. Export makes no AI request and sends no process data to an external conversion service.

## Français

Cliquez sur **PDF** sous le diagramme, à côté de SVG et Mermaid. Le fichier contient tout le diagramme sélectionné, les légendes des systèmes et domaines, le titre, la version et l’état de vérification. L’organigramme conserve le sens choisi, de gauche à droite ou de haut en bas. La vue d’ensemble client exporte la synthèse. Le zoom et le défilement à l’écran ne limitent pas l’export.

Le PDF est vectoriel et sa page s’adapte au diagramme. Zoomez pour lire un long processus. Pour imprimer, choisissez un format de papier adapté ou ajustez à la page. Le PDF ne contient pas les données permettant de restaurer le processus ; conservez aussi Markdown ou JSON. L’export n’utilise pas l’IA et n’envoie pas le processus à un service externe de conversion.

## Deutsch

Klicken Sie unter dem Diagramm neben SVG und Mermaid auf **PDF**. Die Datei enthält das vollständige ausgewählte Diagramm, System- und Bereichslegenden, Titel, Version und Prüfstatus. Die gewählte Richtung von links nach rechts oder von oben nach unten bleibt erhalten. Die Kundenübersicht exportiert die Zusammenfassung. Bildschirmzoom und Scrollposition begrenzen den Export nicht.

Das PDF enthält Vektorgrafiken; die Seitengröße passt sich dem Diagramm an. Zoomen Sie zum Lesen langer Abläufe hinein. Wählen Sie zum Drucken ein geeignetes Papierformat oder passen Sie die Ausgabe an die Seite an. Das PDF enthält keine wiederherstellbaren Prozessdaten; behalten Sie zum Weiterarbeiten auch Markdown oder JSON. Der Export nutzt keine KI und übermittelt keine Prozessdaten an einen externen Konvertierungsdienst.

## Implementation

The browser converts only the application's escaped SVG renderer output with jsPDF and svg2pdf.js, loaded on demand. Embedded DejaVu Sans fonts cover the four interface languages; the font license is included under public/fonts. Page dimensions include the entire renderer viewBox and legends and remain within 14,000 PDF points on each axis. No arbitrary uploaded SVG is accepted. Normal source/model validation remains unchanged.
