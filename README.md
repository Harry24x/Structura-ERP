# Process Studio — BIP018 Team 5
A private first prototype for the Digmatix Business Process Diagram Agent challenge.

## Töötaja kontole jagamine · prototüüp 33

Vali oma protsessikaardil samm ja ava **Jagamine · töötaja konto ligipääs**. Sisesta töötaja ChatGPT konto e-post ning vajuta **Anna ligipääs sellele sammule**. Töötaja avab sama lehe vaate **Mulle jagatud osad**; ettepanek jõuab omaniku samale protsessikaardile. Omaniku otsused ja tagasiside kuvatakse ettepaneku autorile. **Lõpeta ligipääs** peatab lugemise ja esitamise ning säilitab omaniku ettepanekute ajaloo.

Lehe Sitesi külastajate nimekiri ja rakenduse protsessiosa õigused on eraldi kaitsekihid. Praeguse privaatse lehe uus külastaja tuleb lubada ka Sitesi jagamise seadetes; rakendus ei saa ise Sitesi külastajate nimekirja muuta. Protsessiosa jagamine ei saada e-kirja ega ava lehte avalikult. Konto kutse seotakse sisselogimisel usaldatud Sitesi e-postiga, seejärel kasutaja püsitunnusega. Töötaja API väljastab ainult jagatud sammu kirjelduse, vastutaja ja kinnitatud juhised ning tema enda ettepanekute otsused. Algfailid, kogu protsessimudel ja teiste ettepanekud jäävad omaniku API-sse. Ligipääsu ja versiooni kontroll toimub serveris ka salvestamise tehingu sees.

## Kontopõhine tööruum


Avaldatud tööriist avaneb protsesside ja parenduste ühisel pealehel. PDF/pildifailid, protsessikaardid ja ettepanekute otsuste ajalugu salvestuvad sisselogitud ChatGPT kasutaja kontole: sama kontoga avanevad need teises brauseris ilma käsitsi varukoopia ülekandmiseta. Varasem IndexedDB töö viiakse esimesel avamisel automaatselt kontole ning kohalik arhiiv säilib. Kontod on serveris eraldatud; töövaate valik (kvaliteedijuht, töötaja, klient) valib oma konto toimingud ega jaga protsesse teiste inimestega.

Vali protsessiosa → **Tee parandusettepanek** → **Esita ettepanek**. Kvaliteedijuhi töövaates ava ettepanek, lisa põhjendus ja tagasiside ning otsusta. Generaator avaneb samal pealehel; **Salvesta skeem kontole** uuendab päritolukaarti ja säilitab ajaloo. Pooleli generaatoritekst ja vormid säilivad kohalikus brauseris; valmis protsessikaart ning esitatud ettepanekud on kontol. Server kasutab Sitesi kasutajatunnust, D1 metainfot ja R2 algfaile; versioonikonflikt ei kirjuta varasemat tööd üle. AI kasutab senist serveriseadistust ja käivitub ainult kasutaja käsul.

## Kohalik AI-vaba parendusruum · katse 1

Windowsis tee topeltklõps failil `Ava-katse.cmd`; see leiab Node.js-i ise ja avab `http://127.0.0.1:5174/`. See eraldi kohalik vaade impordib PDF/PNG/JPG skeeme, lubab protsessiosi märkida ning töötaja ja kvaliteedijuhi rollides ettepanekuid esitada, otsustada ja eraldi rakendada. Tasulisi AI-teenuseid ei kutsuta. Failid ja otsused säilivad selle brauseri IndexedDB-s ning neid saab koos algfailiga varukoopiana eksportida. Rollivahetus on selgelt märgitud demonstratsioonina, mitte päris ligipääsukontrollina. PDF-i tekstiplokid on kontrollitavad kandidaadid; OCR-i ega automaatset nooltuvastust pole. Avaldatud Sitesi versiooni see katse ei muuda. [Käivitamine, DigiMK kohalik allikaloend, kasutamine ja piirid](local-pilot/README.md).

## What works in v0.11
- PDF, Word (.docx), TXT and Markdown source-file input with a local text preview, cancellation, limits and clear partial-PDF warnings. Text is applied only after review; AI is called only by Generate. Scanned PDFs require OCR elsewhere. [Four-language file input guide](docs/FILE-INPUT.md).
- Full-diagram vector PDF download with current direction or customer overview, localized legends and embedded Unicode fonts. Page size follows the diagram, independent of screen zoom/scroll. [Four-language PDF guide](docs/PDF-EXPORT.md).
- Markdown discussion import and full-process Markdown export for chat handoff, with source, Mermaid, questions and pending edits. Unchanged snapshots can reopen locally; edited prose must be analysed as a new description. [English](docs/MARKDOWN-GUIDE-EN.md) · [Eesti](docs/MARKDOWN-GUIDE-ET.md) · [Français](docs/MARKDOWN-GUIDE-FR.md) · [Deutsch](docs/MARKDOWN-GUIDE-DE.md).
- Business areas (sales, purchasing, warehouse, finance, production, other, unknown) are separate from roles and software. New AI drafts suggest a category and rationale; people can confirm or correct them. Saving retains source and graph, creates an unreviewed version, and needs no model call. Legacy work stays unknown until mapped.
- **Customer overview** renders a conservative TD summary of the same process; opening a group reveals its original steps. Decisions, loops and questions remain visible. The detailed view retains its LR/TD preference. JSON stays complete; overview SVG is a summary and Mermaid stays detailed. [Reference, schema, rules and four-language usage](docs/BUSINESS-AREAS.md).
- The workspace uses the available browser width without a fixed maximum. **Expand diagram** temporarily hides the source/change panels; **Restore workspace** or Escape brings them back. It preserves the process, unsent text, zoom and review. Controls and help support all four interface languages. [Diagram views](docs/DIAGRAM-VIEWS.md).
- Choose **Left to right** (the interface default) or **Top to bottom** above the flowchart. The browser remembers this display preference separately from the process. It changes SVG/Mermaid layout without a model call, source edit, new version or review reset. [Diagram views](docs/DIAGRAM-VIEWS.md).
- Task system cards record the responsible role (existing field), named system, execution mode (unknown/manual/person using software/automatic), human-decision flag and exact evidence. Open a diagram step or use **Complete system cards**. Saving an answer adds a source clarification, retains the graph and prior version, and resets review.
- A persistent system registry gives each named system the same square and color across process views and interface languages. It travels with JSON/history and appears in SVG/Mermaid exports. Missing card fields remain focused prompts; they are tracked separately from the existing diagram-review action. [Usage, schema and limits](docs/SYSTEM-CARDS.md).
- Four interface languages: English by default, with Estonian, French and German available in the header. The choice persists in this browser independently of process history. Buttons, help, status, import messages and accessibility labels switch immediately.
- New AI drafts use the selected interface language for titles, roles, steps, branches, questions and notes. Sources and exact evidence quotes keep their original language. Existing processes and prepared examples retain their text; select the language and generate a new draft to produce translated process labels.
- Automatic text-to-process drafts through a server-side OpenAI Responses endpoint, with strict structured output and graph/evidence validation.
- Natural-language changes produce a separate to-be diagram and retain the earlier version. General clarification answers can be mapped into a revised draft.
- Loading/cancellation, safe errors and protection against an old response overwriting changed work.
- One role question per task, questions for explicitly unmapped boundaries and a single start connection to prevent artificial process shortcuts.
- Process descriptions and editable structured process drafts.
- Four **prepared** samples: simple expense approval, sales fulfilment, incomplete purchase request and a synthetic complex purchasing process.
- Supplied Example 2 (Paljuriideid OÜ): the complete 1,179-word interview, three scoped assistant-prepared drafts and 16 explicit clarification questions. Use **Paljuriideid interview** or **Try a process**, then choose a stage. These remain unapproved; see [case review](docs/DIGMATIX-EXAMPLE-2.md).
- Supplied Example 1 (Põllukuld AS): the complete 659-word source, two current-process views and a separate display of the three explicitly labelled future needs. Current accountant ERP use is retained. Unknown owners and incomplete routes remain visible; see [case review](docs/DIGMATIX-EXAMPLE-1.md).
- An import guard rejects as-is activity/decision evidence found only in explicitly marked future-need blocks. It recognises the English labels `Need:`, `Summary of identified needs` and appended `Requested improvement:` blocks; it is not a general semantic classifier.
- Fixed-symbol SVG diagrams, decision branches, role labels, source evidence and a step list.
- Manual clarification of unknown roles and decision rules, with version history.
- A clearly labelled sample text change adding an expense receipt check; repeated application does not duplicate steps.
- As-is / to-be separation, human review status and JSON, SVG and Mermaid exports.
- Browser-local saving. Export JSON to transfer or retain a process outside that browser.
- An AI request to use with an existing assistant, plus validated JSON import.
- Optional WebMCP page actions for an assistant in a supported browser. Read and draft-write execution were verified on the authenticated hosted page; a normal browser need not support them.

## AI integration and validation
Four hosted v0.9 generations used the original purchasing interview, sales memo and long workshop transcript plus an invented incomplete control. All passed structural validation; source review found a provisional sales revision route and compound actions requiring tighter instructions, and production needed its own category. v0.10 also corrects the prepared incomplete sample’s unstated post-order continuation. Two targeted hosted follow-ups removed the earlier provisional sales loop and assigned the three manufacturing/planning activities to Production. These are development trials, not business acceptance. [Exact results and follow-up](docs/SUPPLIED-INPUT-VALIDATION.md).

The implementation now calls OpenAI on the server, using GPT-6.1 Sol and strict JSON Schema. Generation sends the supplied description and relevant current draft to OpenAI; edit and clarification requests also send the command or answer. No provider request starts on page load. Results remain unapproved. The key is a runtime binding and is never supplied to the browser.

Earlier GPT-6 Luna synthetic trials generated an 8-node as-is travel draft; a natural-language budget change produced a 12-node to-be draft, preserving the date-revision branch and existing IDs. A synthetic incomplete description retained unknown roles and unmapped handoffs as questions. Exact inputs and outputs, failures and limits are recorded in [AI validation](docs/AI-VALIDATION.md). These are focused development trials, not a complete AI-quality acceptance pass.

The managed local preview could display the UI but could not reach the model service from its Worker runtime. Authenticated hosted trials have now verified generation, a textual edit, a flow clarification, cancellation and preservation of work edited while a response was pending. The supplied Supplier 1 receipt and purchasing planning/approval views have focused model trials; business-reviewed references, remaining supplied views and repeatability checks are still pending. Prepared examples remain prepared until explicitly regenerated; T1–T6 and R1–R8 are not all marked passed.

## Run
Use Node.js 22.13 or later. Install the pinned dependencies with the repository's package manager (pnpm and pnpm-lock.yaml), then run:
~~~sh
pnpm dev
~~~
Cross-platform checks (including Windows PowerShell): `pnpm test`, `pnpm typecheck`, `pnpm build`, then `pnpm check:secrets`. Install with `pnpm install --frozen-lockfile`. See [desktop audit](docs/DESKTOP-AUDIT-2026-10-29.md) for the tested environment, security findings and remaining checks.

The [security/runtime follow-up](docs/SECURITY-RUNTIME-FOLLOWUP-2026-10-29.md) supersedes the audit's three residual dependency findings and local proxy limitation. `pnpm start` previews the compiled Worker at `http://127.0.0.1:8787`; `--port 0` selects a temporary free browser port. Its local HTTP transport avoids stale keep-alive connections without retrying POST. See [local preview instructions](docs/LOCAL-PREVIEW.md) for all four languages and `pnpm check:runtime <local-url>` for the regression check.

The browser save includes edited source, the pending change command and pending clarification answers. A failed browser write displays an unsaved status; export Markdown to retain both the process and pending text. JSON exports contain the process itself. [Workspace retention in four languages](docs/WORKSPACE-RETENTION.md).

Server generation, copied requests and browser tools share the same process instructions and JSON contract. Explicit current/future sections are checked in all four interface languages. See the [prompt update and validation notes](docs/AI-PROMPT-UPDATE-2026-10-29.md) and the [complete Estonian-output prompt](docs/ai-prompt-update-2026-10-29/current-system-prompt-et.txt).

Keep the prototype badge numeric: the user wants it to show release progress. Before building a release, set `APP_RELEASE` in `lib/release-info.ts` to the next Sites saved-version number (`latest_version_number + 1`). Confirm that `save_site_version` returns the same number before deploying. Do not replace this counter with a date.
~~~sh
node --test tests/*.test.mjs
node node_modules/typescript/bin/tsc --noEmit
pnpm build
node scripts/check-build-secrets.mjs
~~~
For local generation, configure the ignored `.env.local` file from `.env.example`. For hosting, configure `OPENAI_API_KEY` as a native Sites server secret after the owner authorises that destination. Never use a `VITE_*` variable. The production endpoint requires a signed-in ChatGPT visitor and checks request origin. The development-only local-preview branch is removed from production builds. The Sites workflow handles the private hosted version; preserve its access policy, hosting configuration and Worker entrypoint. Build configuration disables local env-file copying; the scan blocks publication if secret material is found.

## Structure
- app/page.tsx — workspace, version history, clarifications, imports/exports and optional page tools.
- app/api/process/route.ts — authenticated, same-origin generation/edit/clarification endpoint.
- lib/ai-process.mjs — request limits, strict schema, model calls and response validation.
- lib/ai-workspace.mjs — stale-response protection.
- lib/i18n.mjs — four-language UI catalogue, safe locale selection, localized error messages and server-controlled output-language instructions.
- lib/business-areas.mjs and components/business-area-card.tsx — controlled functional areas, human confirmation and conservative customer summaries.
- tests/business-areas.test.mjs — migration, source/graph retention, model-confirmation safeguards, safe aggregation, cycles and multilingual exports.
- lib/systems.mjs — system identity, registry merging, card validation, completeness prompts and trusted mapping instructions.
- components/system-card.tsx and system-legend.tsx — manual card editing and the persistent legend.
- lib/process.mjs — validation, changes, deterministic layout, SVG and Mermaid serialization.
- lib/examples.mjs — prepared sample inputs and explicit reference models.
- lib/digmatix.mjs and lib/digmatix-source.mjs — scoped Example 2 drafts and its complete retained source text.
- lib/pollukuld.mjs and lib/pollukuld-source.mjs — Example 1 current-process drafts and complete source, including future needs.
- tests/process.test.mjs — behavioural tests for graph integrity, evidence, unknowns, edits, round-trips and text escaping.
- tests/ai-process.test.mjs — provider failures, source binding, review reset, request limits, unknowns and concurrent-work safeguards.
- tests/systems.test.mjs — legacy migration, source-backed card updates, registry identity across views/imports, contradictory values, future-only facts, export escaping and AI schema/context guards.
- tests/i18n.test.mjs — language validation, translated-output instructions, source/evidence retention, multilingual missing-information safeguards and stale-language protection.
- docs/IMPLEMENTATION.md — requirements coverage, limitations and verification record.
- docs/AI-VALIDATION.md and docs/verification/ — focused live synthetic trials and their exact inputs/outputs.

## Shared project records
The Google Docs remain the maintained requirements and course record:
- Full source and all supplied examples: https://docs.google.com/document/d/1FEJ3BLKfjMqlIHu8_aok2fPOtvqN8xc7e6Ak1FCbNmM/edit
- Course requirements / assessment: https://docs.google.com/document/d/1-lOfBzMiFwUGWQTTA1aAjgxikFTtD243zVXVSHca1oQ/edit
- Requirements and tests: https://docs.google.com/document/d/1JFlOUku2S11E9KMz10x3nCGNn5kcVD9jmR4QLYFGTas/edit
- Project hub: https://docs.google.com/document/d/1I0KV9pHnSw9YQ-ScqYWz9DyqrU5BAzaZHKhpBs_F7AE/edit

Work allocation is deferred. Jana’s guidance, recorded 26 October, permits diagram technology choices while asking for a Business Central reference and a top-down customer view. The prototype implements an initial interpretation; the required abstraction level and any later deployment/integration needs still require validation.


## Ühine AI ja parenduste tööruum (versioon 24)

Avaldatud rakenduse külgriba `PDF · AI · Parendusettepanekud` avab `/quality/index.html`. Tekstigeneraatori kehtiv skeem liigub parendusruumi sama mudelina. PDF või PNG/JPG imporditakse brauserisse; AI-nupp saadab ainult valitud lehekülje või märgitud ala serveri kaudu OpenAI Responses API-le (`store:false`), kasutades olemasolevat `OPENAI_API_KEY` sidumist. Võtit ei kopeerita brauserisse ega kohalikku katseserverisse.

AI tulemus sisaldab transkriptsiooni, samme, nooli, rolle, asukohti ja küsimusi. Transkriptsioon ei ole sõltumatu tõend: inimene peab seda algfailiga võrdlema. Mustand võetakse kasutusele eraldi dokumendina, säilitades varasemad ettepanekud algse dokumendi juures. Töötaja AI-abi täpsustab tema sisestatud mõtet; kvaliteedijuhi AI-abi koostab hinnangu mustandi. Otsuse, tänu ja rakendamise teeb inimene. Kirjelduse rakendamine uuendab ühist mudelit. Üldine parendus jääb märkuseks; struktuurimuudatuse saab koostada tekstigeneraatoris.

Rollivahetus on endiselt ühe brauseri demonstratsioon, mitte osakondade turvaline õigussüsteem. IndexedDB andmeid ei sünkroonita kasutajate vahel. Kasuta varukoopia eksporti/taastamist, et viia kohalik katse samasse avaldatud brauserivaatesse. Mainsteni faile ei avaldata rakenduse varadena. `Ava tekstigeneraatoris` säilitab generaatori eelmise töö võtmes `quality-generator-before-import`; taastamisnupp asub parendusruumi AI-paneelis.

Parendusruumi `public/quality/lib/` failid on olemasoleva credential-free skeemimootori koopiad; hoia need `lib/` lähtefailidega samad. PDF.js asub samal domeenil, litsents failis `public/quality/vendor/LICENSE`.

Versioon 25 täiendab ühise tööruumi salvestustõrgete käsitlemist, AI-päringu katkestamist töötaja vaates ja skeemi peidetud elementide kuvamist. Päris AI-päring Mainsteni ostu- ja transpordiosa pildialalt läbis serveri valideerimise versioonis 24.

## Sama protsessi tagasitoomine (versioon 26)

Parendusruumist avatud skeem kannab generaatorisse algse kaardi ID-d, versiooni ja redaktsiooni. Need säilivad generaatori brauserisalvestuses. Külgriba tagasitoomise nupp uuendab sama kaarti; muutmata skeemi tagasitoomine ei loo ka uut versiooni. Vahepeal teises aknas muudetud kaart peatab tagasitoomise. Kaart ja selle seosed salvestatakse IndexedDB ühes tehingus.

Samade sõlme-ID-dega protsessiosad säilitavad oma ID, märkused ja ettepanekute seosed. Muutunud tegevuse osaversioon kasvab, et vana ettepanekut ei saaks pimesi rakendada. Eemaldatud sammud jäävad ajalooliste osadena alles ja nende ettepanekuid saab endiselt vaadata. Uued sammud on ainult digitaalsel skeemil: algsele PDF-ile ei joonistata neile väljamõeldud asukohti. Eelmine skeem ja osad salvestuvad kaardi ajalukku.

Varem loodud kaardil nime lõpuga „· generaatorist” saab valida „Seo skeem valitud protsessiga”. Kasutaja valib algse protsessikaardi; sellele tuuakse uuem skeem, senised ettepanekud säilivad ja vana koopia jääb jaotisse „Varasemad generaatorikoopiad”. Kui koopial oli oma ettepanekuid, viiakse need samas tehingus algsele kaardile ning ootel ettepanekud vajavad uuel kaardil uuesti koostamist. Varukoopia eksport sisaldab jätkuvalt algfaili, kaardi ajalugu ja ettepanekuid.

## Töötaja ja klient (versioon 27)

Parendusruumi rollivalikus on Kvaliteedijuht, Töötaja ja Klient. Töötaja ja klient esitavad valitud valdkonna aktiivsele sammule ettepaneku; ainult kvaliteedijuht otsustab ja rakendab. Ettepanek salvestab esitaja nime ning rolli. Vanade rollita ettepanekute roll on Töötaja. Uue ettepaneku läbivaatamine lisab selle enda otsuste ajalukku; sama protsessi varasemad ettepanekud säilivad. Praegu on see ühe brauseri rollidemonstratsioon, mitte kliendikontode või suhtluskanali teostus.

## Kohanduv parendusruumi diagramm (versioon 28)

Digitaalsel kaardil vali Suund: Vasakult paremale või Ülalt alla. Mahuta diagramm mahutab kogu kaardi nähtavasse aknasse; akna muutmisel arvutatakse mahutus uuesti, kuni suumid käsitsi. Laienda diagrammi peidab ajutiselt külgpaneelid; Taasta töövaade või Esc taastab need. Näita ettepanekuid taastab töövaate ja avab ettepanekute paneeli. AI ja tekstigeneraator on avatavas jaotises. Algfaili saab samuti mahutada/suurendada, kuid suunavalik muudab ainult digitaalset kaarti. Kuvamise eelistused ei kirjuta dokumenti ega ettepanekuid, ei lisa protsessiversiooni ega käivita AI-päringut.

## Kompaktne tööruum ja protsesside teek (versioon 29)

Parendusruumi päis on kompaktne ning abi avatavas jaotises. Läbivaatamine asub diagrammi all. Avalehe Minu protsessid ja parendused avab teegi ilma generaatori praegust näidist importimata; Vii skeem parendusruumi on eraldi toiming. Arhiveeritud koopia asemel avatakse selle aktiivne algkaart. Vana generaatoritöö ei kirjuta uuemat kaarti üle. Varukoopia ekspordil klõpsa Salvesta varukoopiafail; taastamine on teegis. Brauserite andmed ei sünkrooni: Edge ja Codexi brauser kasutavad eraldi IndexedDB-d. Mainsteni faile ei avaldata veebivaradena.
