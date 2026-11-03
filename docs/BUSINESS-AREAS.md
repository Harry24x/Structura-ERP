# Business areas and customer overview — v0.10

This implements the first bounded response to Jana's guidance, recorded on 26 October 2026. Her email predates access to the app and is not customer acceptance of v0.8 or v0.9. The purpose is consistent, source-supported diagrams across varied memos, with a customer summary and a detailed working view.

## Reference and scope

Reference profile: `bc-project-areas-2026-10-26`. The official [Business Central inbound warehouse flow](https://learn.microsoft.com/en-us/dynamics365/business-central/design-details-inbound-warehouse-flow), particularly its basic flow, is the concrete process-diagram reference. The prototype retains its own fixed symbols and layout. It does not reproduce a Microsoft diagram or claim Microsoft certification. This small function taxonomy is a project adaptation, not the complete Dynamics business process catalog.

| ID | Function | Official product reference |
| --- | --- | --- |
| sales | Customer orders and customer-facing sales work | [Sales](https://learn.microsoft.com/en-us/dynamics365/business-central/sales-manage-sales) |
| purchasing | Sourcing and supplier orders | [Purchasing](https://learn.microsoft.com/en-us/dynamics365/business-central/purchasing-manage-purchasing) |
| warehouse | Physical receipt, storage, picking and shipment | [Warehouse management](https://learn.microsoft.com/en-us/dynamics365/business-central/design-details-warehouse-management) |
| finance | Credit, invoices, payments and expense reimbursement | [Finance](https://learn.microsoft.com/en-us/dynamics365/business-central/finance) |
| production | Manufacturing and production planning/control | [Production orders](https://learn.microsoft.com/en-us/dynamics365/business-central/production-about-production-orders) |
| other | A clear function outside the five categories | Project fallback |
| unknown | Insufficient or ambiguous evidence | Project fallback |

Microsoft's [process levels](https://learn.microsoft.com/en-us/dynamics365/guidance/business-processes/about-catalog-levels) distinguish end-to-end processes, areas and detail. v0.9 supplies a conservative top-down summary of the current graph, not the entire catalog hierarchy. Whether Jana means a particular proposal-level hierarchy still needs validation. No Business Central steps are inserted into a customer's as-is process. No reference step proves a customer's actual software use, responsibility or automation.

## Data and review

The additive schemaVersion 1.0 extension supplies `businessArea`, `areaReason` (up to 600 characters) and `areaReviewed` on nodes. Legacy files migrate to unknown/empty/false without keyword guesses. Only activities and decisions can have an assigned area. A known category needs a rationale; the existing exact task evidence remains the factual anchor. Roles, systems and business functions are separate.

The model schema requires category and rationale. Server instructions classify the actual work, preserve uncertainty and never insert a reference activity. The server prevents a model from claiming human area confirmation; edit/clarify preserves manual assignments only on unchanged tasks. A person can correct or confirm an assignment in Step details. Saving increments the version and resets overall review while preserving source, graph, role, system fields and mode. It makes no model request. Classification metadata does not change the source wording.

Area IDs and their seven colors remain stable across languages, views, JSON and history. The four synthetic teaching cases have explicitly curated suggested mappings. Supplied customer drafts and old saved work remain unknown until mapped. Area confirmation and completeness are independent of the existing whole-diagram review action.

## Summary rules

Customer overview always uses TD. The detailed flowchart keeps the separately saved LR/TD preference, with LR as the interface default. Switching views makes no process version or model request. The summary contracts only adjacent activities with the same known area, responsible role and system card on a single unlabelled path. It never contracts decisions, cycle members, explicitly human decision tasks, questioned activities or unknown areas. Different owners or systems remain separate.

Every original node belongs to exactly one displayed node. Internal edges of a contracted linear group are represented by that group's members; all external branches are mapped from existing edges. Start/end and unknown-boundary questions remain visible. Selecting a group opens a filtered table of its exact original steps. Selecting a single task opens its original evidence and editors. JSON always exports the full process. Overview SVG exports the derived TD summary with its legend; Mermaid remains the full detailed graph in the saved detail direction. Neither export is native VSDX.

## Usage — English

Choose **Customer overview** for the top-down summary. Select a grouped activity to open its original steps; **Show all steps** clears the filter. **Flowchart** returns to the detailed drawing and your saved direction. Open a task, choose its **Business area**, explain the assignment and select **Save area assignment**. Confirmation creates a new unreviewed version; the source and connections stay unchanged. The area legend links to the Microsoft references. **Overview SVG** exports the summary; **Detailed Mermaid** and **Export JSON** keep the complete process. Unknown or questioned activities and decisions remain visible. Existing work is not automatically reclassified.

## Kasutamine — Eesti

Vali ülalt alla koondvaateks **Kliendi üldvaade**. Koondatud tegevusele vajutades avanevad selle algsed sammud; **Kuva kõik sammud** eemaldab filtri. **Vooskeem** taastab detailse joonise ja sinu suunavaliku. Ava tegevus, vali **Tegevusvaldkond**, põhjenda määrangut ja vajuta **Salvesta valdkond**. Kinnitamine loob uue ülevaatamata versiooni; algtekst ja ühendused säilivad. Valdkondade legendist leiad Microsofti võrdlusallikad. **Üldvaate SVG** ekspordib koondvaate; **Detailvaate Mermaid** ja **Ekspordi JSON** säilitavad kogu protsessi. Teadmata või küsimustega tegevused ning otsused jäävad nähtavaks. Olemasolevat tööd automaatselt ümber ei liigitata.

## Utilisation — Français

Choisissez **Vue d’ensemble client** pour la synthèse de haut en bas. Sélectionnez une activité regroupée pour ouvrir ses étapes d’origine ; **Afficher toutes les étapes** retire le filtre. **Organigramme** rétablit le dessin détaillé et le sens enregistré. Ouvrez une tâche, choisissez son **Domaine métier**, justifiez l’attribution et sélectionnez **Enregistrer l’attribution**. La confirmation crée une version à vérifier ; la source et les connexions sont conservées. La légende des domaines contient les références Microsoft. **SVG de la vue d’ensemble** exporte la synthèse ; **Mermaid détaillé** et **Exporter JSON** conservent le processus complet. Les décisions et les activités inconnues ou avec des questions restent visibles. Les travaux existants ne sont pas reclassés automatiquement.

## Verwendung — Deutsch

Wählen Sie **Kundenübersicht** für die Zusammenfassung von oben nach unten. Öffnen Sie eine zusammengefasste Aktivität, um ihre ursprünglichen Schritte zu sehen; **Alle Schritte anzeigen** entfernt den Filter. **Flussdiagramm** stellt die Detailzeichnung mit der gespeicherten Richtung wieder her. Öffnen Sie eine Aufgabe, wählen Sie den **Geschäftsbereich**, begründen Sie die Zuordnung und wählen Sie **Zuordnung speichern**. Die Bestätigung erstellt eine ungeprüfte Version; Quelle und Verbindungen bleiben erhalten. Die Bereichslegende enthält die Microsoft-Referenzen. **Übersicht als SVG** exportiert die Zusammenfassung; **Detailliertes Mermaid** und **JSON exportieren** enthalten den vollständigen Prozess. Entscheidungen und unbekannte oder mit Fragen versehene Aktivitäten bleiben sichtbar. Vorhandene Arbeit wird nicht automatisch neu zugeordnet.

## v0.9 verification and limits

Twelve new behavioural checks cover legacy migration, invalid metadata, fact-preserving manual assignments, JSON, server-controlled model confirmation, preserved human assignments, exact summary membership and branch retention, unordered node arrays, protected unknowns/owners/rules/cycles, maximum-size input and translated safe exports. They pass with the existing suite (96 total). Browser evidence is in [customer-overview-browser.json](verification/customer-overview-browser.json); the synthetic prepared fixture is [customer-overview-demo.json](verification/customer-overview-demo.json). Interface checks and mocked-provider tests do not establish real model classification accuracy. Validate the original interview, memo, transcript and incomplete cases against a reviewed business reference before claiming business acceptance. No additional paid model call was made for this change. Existing v0.7 PDF guides and backup remain dated snapshots.

## v0.10 validation follow-up

The original long workshop transcript contains manufacturing and shift planning. Production is now a separate function, with a linked official product reference, rather than requiring Other. This does not assert that the customer uses Business Central production orders. Existing area IDs, colors and saved Other assignments remain unchanged; old work is not reclassified automatically. New drafts may suggest Production and remain unconfirmed. The taxonomy and model instructions now include seven options. See [supplied-input validation](SUPPLIED-INPUT-VALIDATION.md) for real model results and outstanding semantic limits.

English: **Production** is available when choosing a task’s business area. Existing work is not reclassified automatically.

Eesti: Tegevuse valdkonnaks saab valida **Tootmine**. Olemasolevat tööd automaatselt ümber ei liigitata.

Français : **Production** est disponible dans les domaines métier d’une tâche. Les travaux existants ne sont pas reclassés automatiquement.

Deutsch: Als Geschäftsbereich einer Aufgabe kann **Produktion** gewählt werden. Vorhandene Arbeit wird nicht automatisch neu zugeordnet.
