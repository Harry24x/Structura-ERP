# Diagram views - v0.8

Use **Direction** above the diagram to choose **Left to right** or **Top to bottom**. The interface defaults to left-to-right when no preference is saved. The selector and option labels support English, Estonian, French and German.

These are two orientations of the same flowchart. They show the same activities, decisions, roles, connections, evidence and system cards. Switching direction changes the drawing immediately; it does not call AI, create a process version, modify the source or reset review. The choice stays in this browser independently of process history and language.

SVG export uses the selected orientation and includes the system legend. Mermaid preview/export starts with `flowchart LR` or `flowchart TD`. JSON remains the process data; the separate browser display preference is not added to it. On another browser, choose the preferred direction again. Earlier low-level renderer calls without a direction option retain their TD default for compatibility.

The horizontal layout places process levels in columns, keeps labels and system cards upright and separates alternative branches vertically. Return loops route above the process. Long diagrams can be scrolled horizontally; use zoom or Fit diagram for an overview. Fitting a large process onto one screen may make text small, so use normal zoom to read individual tasks.

Current scope is horizontal/vertical flowchart layout, Process steps and Mermaid code. BPMN notation and role swimlanes remain possible future work requiring a separate design and acceptance decision. Direction selection does not settle the customer's required diagram format or the existing large/A4 readability acceptance work.

Five direction-specific checks pass with the existing suite (84 total). Preview verified default LR, Estonian TD selection, the corresponding Mermaid prefix, persistence after reload, unchanged source/version/history and French LR switching. No model call was needed for this feature.

## Available screen width - v0.8

The main workspace has no fixed maximum width. It fills the browser's available area, keeping the navigation and normal page padding. A wider browser therefore provides a wider diagram panel automatically. The drawing retains its zoom; use Fit diagram for a new overview. Long diagrams still scroll within the diagram rather than widening the page.

**English:** Select **Expand diagram** in the diagram header to hide the source and change panels temporarily. Select **Restore workspace**, or press Escape while no detail panel is open, to bring them back. The process, version, review, unsent source/change text and zoom remain unchanged. This is a temporary view choice and resets on page reload. It makes no AI request.

**Eesti:** Vali diagrammi päises **Laienda diagrammi**, et peita algteksti ja muudatuskäsu paneelid ajutiselt. **Taasta töövaade** või Escape toob need tagasi, kui üksikasjade paneel pole avatud. Protsess, versioon, ülevaatus, saatmata tekst ja suum säilivad. See ajutine vaatevalik lähtestub lehe uuesti laadimisel ega kasuta AI-d.

**Français :** Cliquez sur **Agrandir le diagramme** pour masquer temporairement les panneaux de source et de modification. **Rétablir l’espace de travail**, ou Échap lorsqu’aucun panneau de détails n’est ouvert, les affiche à nouveau. Le processus, la version, la vérification, le texte non envoyé et le zoom sont conservés. Ce choix temporaire est réinitialisé au rechargement et n’appelle pas l’IA.

**Deutsch:** Mit **Diagramm vergrößern** blenden Sie Quelltext und Änderungsbereich vorübergehend aus. **Arbeitsbereich wiederherstellen** oder Escape zeigt sie wieder an, sofern kein Detailbereich geöffnet ist. Prozess, Version, Prüfstatus, ungesendeter Text und Zoom bleiben erhalten. Die vorübergehende Ansicht wird beim Neuladen zurückgesetzt und ruft keine KI auf.

Browser QA used a temporary same-origin preview iframe with 3440x1440, 1920x1080 and 390x844 CSS-pixel viewports. At 3440, the main area measured 3221 pixels and the diagram output 2754 pixels normally / 3131 expanded (the browser's vertical scrollbar consumes 15 pixels). There was no page-wide horizontal overflow at any tested width; diagram-internal scrolling remains intentional. All four languages, expansion/restoration, Escape, mobile fit and retention of source, an unsent command, SVG, version/history, review and zoom were verified. The temporary harness was removed before packaging. These are simulated viewport checks, not a claim of testing the user's physical monitor. See `verification/responsive-workspace-browser.json`.

## Export interoperability

The available exports remain SVG, Mermaid text and Process Studio JSON. This release adds no native VSDX/VDX or draw.io exporter. An SVG is a vector graphic; importing it does not promise native process shapes, connected semantic links or system-card metadata in another product. Mermaid can generate editable draw.io shapes, but layout and metadata may differ. The JSON restores the active process in Process Studio; it is not a universal diagram exchange schema.

Official references checked 25 October 2026:

- Visio desktop SVG graphics import: https://support.microsoft.com/en-us/visio/import-or-insert-graphics-into-visio-drawings
- Lucid SVG image support: https://help.lucid.co/hc/en-us/articles/18313461696788-Troubleshooting-Images
- Lucid native diagram imports (Visio and draw.io formats): https://help.lucid.co/hc/en-us/articles/16389149809428-Import-files-into-Lucidchart
- draw.io editable Mermaid import: https://www.drawio.com/docs/manual/mermaid/
- Microsoft 365 SVG support: https://support.microsoft.com/en-us/office/graphics-visuals/edit-svg-images-in-microsoft-365

Compatibility was checked against vendor documentation, not by executing Visio/Lucidchart imports. Existing v0.7 PDF guides and the v0.7 ZIP remain dated snapshots. Future PDF user-guide updates must be maintained in EN/ET/FR/DE and saved with the project, as recorded in D1.

## Customer overview (v0.9)

**English:** Customer overview is a TD summary of the same process. Only safe adjacent same-area/owner/system activities are grouped. Select a group to open its original steps; Show all steps clears the filter. Flowchart restores the detailed direction. Overview SVG exports the summary; Detailed Mermaid and JSON retain the full process. Review business areas in Step details.

**Eesti:** Kliendi üldvaade on sama protsessi ülalt alla koondvaade. Koondatakse ainult sobivad järjestikused sama valdkonna, vastutaja ja süsteemiga tegevused. Vali rühm algsete sammude avamiseks; Kuva kõik sammud eemaldab filtri. Vooskeem taastab detailvaate suuna. Üldvaate SVG ekspordib koondvaate; Detailvaate Mermaid ja JSON säilitavad kogu protsessi. Tegevusvaldkonda saab kontrollida sammu üksikasjades.

**Français :** La Vue d’ensemble client résume le même processus de haut en bas. Seules les activités consécutives compatibles, de même domaine, responsable et système, sont regroupées. Sélectionnez un groupe pour ouvrir ses étapes ; Afficher toutes les étapes retire le filtre. Organigramme rétablit le sens détaillé. Le SVG exporte la synthèse ; Mermaid détaillé et JSON conservent le processus complet. Vérifiez le domaine dans les détails de l’étape.

**Deutsch:** Die Kundenübersicht fasst denselben Prozess von oben nach unten zusammen. Nur geeignete aufeinanderfolgende Aktivitäten mit gleichem Bereich, Verantwortlichen und System werden gruppiert. Öffnen Sie eine Gruppe für die ursprünglichen Schritte; Alle Schritte anzeigen entfernt den Filter. Flussdiagramm stellt die Detailrichtung wieder her. Übersicht als SVG exportiert die Zusammenfassung; Detailliertes Mermaid und JSON erhalten den vollständigen Prozess. Prüfen Sie den Geschäftsbereich in den Schrittdetails.

Reference, schema, safeguards and tests: [BUSINESS-AREAS.md](BUSINESS-AREAS.md).
