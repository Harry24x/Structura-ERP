# Implementation checkpoint — v0.9, 26 October 2026

Work allocation is deferred. The eight core requirements remain the implementation scope. Jana’s written guidance is recorded in the Google requirements log: prioritize consistent diagrams, an official Business Central reference, top-down customer presentation and a bounded prototype. This is guidance before she viewed the app, not business acceptance. The exact abstraction level still needs validation.

## Current implementation

Process Studio now has a server-side text-to-process pipeline, natural-language edits and flow clarification through the OpenAI Responses API. Strict JSON Schema is followed by graph, role-question and exact-evidence checks. The server binds authoritative source text, mode and version; model-supplied source, approval and version metadata cannot override them. Generation creates an as-is draft; edits create an unapproved to-be proposal while preserving the earlier browser-local version. Explicit future blocks, including appended multi-paragraph improvements, are excluded from as-is evidence.

Generated role questions are split per task so a short answer does not assign one owner to unrelated work. Explicit unmapped ends receive continuation questions. The start must have one outgoing connection, preventing invented entry paths that bypass the stated order. The default model is GPT-6.1 Sol.

The production API requires a signed-in ChatGPT visitor and a same-origin browser request. Request size, source, command and output sizes are bounded. Calls have a 90-second deadline and no automatic provider retry. Refusals, incomplete output, provider errors and invalid drafts leave the current process untouched. The UI supports cancellation and discards output if its captured description, graph, version, command or answer changed while waiting.

SVG rendering, Mermaid/JSON exports, source quotes, short role/rule answers, import and optional WebMCP tools remain available. Bundled examples are prepared reference drafts until explicitly regenerated. Browser history is local, not collaborative; export JSON for transfer or retention.

## Requirements coverage

| Requirement | Implemented evidence | Remaining acceptance |
| --- | --- | --- |
| R1 Text input | Bounded description editor and server request | Full transcript usability |
| R2 Activities | Live synthetic extraction; quoted evidence and validation | Business-reviewed comparison on supplied cases |
| R3 Order | Synthetic date and budget loops; graph integrity checks | Long-interview handoffs and repeated quality checks |
| R4 Roles | Stated roles; focused questions for unassigned steps | Ambiguous source roles and business answers |
| R5 IF/THEN | Labelled branches, missing-rule questions | Complete business-rule interpretation |
| R6 Drawing | Automatic SVG layout of validated model; Mermaid export | Repeated business comparisons and large/A4 readability |
| R7 Text changes | Live synthetic budget-check command | Repeated general edits on accepted references |
| R8 Regeneration | Separate to-be result, stable IDs, history and review reset | Repeated edits on accepted business references |

## Validation

v0.8 removes the 1760px maximum on the main workspace and adds a four-language diagram expansion toggle. Expansion uses a single output column, temporarily hides input panels and sizes the drawing area to the browser viewport. Restoring the workspace or Escape (when no drawer is open) returns the input panels. The process state, unsent fields, SVG, version/history, zoom and review remain unchanged; no model request is made. The existing 84 behavioural checks and TypeScript passed. Preview frame checks at 3440, 1920 and 390 CSS-pixel widths verified fluid sizing without page overflow, both toggle directions, all four labels, Escape and mobile Fit diagram. The harness is excluded from source/deployment. This improves available screen space; large-process/A4 business readability acceptance remains open.

96 behavioural checks pass, including twelve new business-area/customer-overview checks, seven multilingual checks, fourteen system-card checks and five direction checks. TypeScript and the production build are required for publication. The build scan checks deployable output for secret material and local env files. The development-only preview identity branch is absent from production output.

A synthetic travel description produced an eight-node current-process draft. A novel budget-check command produced a twelve-node proposal, retaining all existing IDs and the date-revision branch. A synthetic incomplete description retained missing owners and handoffs as questions. One initial incomplete draft was rejected for a missing role question; deterministic question completion was added without supplying missing facts, and a repeat trial passed. [Exact inputs, outputs and limits](AI-VALIDATION.md).

The managed local preview cannot reach the model service from its Worker runtime. The authenticated hosted page did verify generation, a textual edit, general clarification, cancellation and retention of a draft/text edited while waiting. Optional page-tool read and valid draft write also executed on the hosted page. Focused supplied-source trials produced 22-node planning/approval and 15-node Supplier 1 receipt drafts, each with 14 open questions. Remaining business ambiguities and trial failures are recorded in AI-VALIDATION.md; these checks are not a complete AI-quality pass.

## Source retention and earlier milestones

The shared Google project folder retains the original complete challenge DOCX, a searchable native Google Doc with all supplied examples, and the course requirements/assessment register. The Course Book PDF is linked, not claimed as an archived PDF. Source comparison against the original challenge passed apart from terminal empty paragraphs. Assessment weights remain 20/70/10.

v0.1 delivered prepared examples, validated import, optional page tools, renderer, history and exports. Its novel travel trial used a conversational assistant and import rather than an automatic model endpoint.

v0.2 bundled the complete 1,179-word Paljuriideid interview with three prepared views (19/13/19 nodes; 16 questions). [Source limits](DIGMATIX-EXAMPLE-2.md). T3 remains partial.

v0.3 bundled the complete 659-word Põllukuld source with two current-process views (15/8 nodes; 13 questions) and three separately displayed future needs. It retained existing accountant ERP work and excluded planned warehouse automation. [Source limits](DIGMATIX-EXAMPLE-1.md). T6 remains partial.

## Next acceptance gates

Extend the authorised supplied-source trials to the remaining views. Obtain business answers and a reviewed reference, then run repeated extraction/edit comparisons, long transcript and readability checks. Confirm supported-browser availability when using page tools in a different browser. Do not mark all eight requirements or T1–T6 passed on the basis of software fixtures or a single synthetic sequence.

## v0.5: multilingual workspace, 25 October 2026

M1 adds English (default), Estonian, French and German. A native, accessible header selector switches UI text, help, labels, statuses and safe errors. Its preference is saved separately from process data; changing language does not commit, replace or approve a process, alter the source, or add a history entry. The HTML language follows the selection. The layout allows longer translated labels to wrap.

Generation, edits and AI clarification send a validated locale to the server. Trusted output instructions request the selected language for human-readable process fields while preserving source quotes, schema keys, identifiers, mode and role identity. Deterministic missing-role and unmapped-boundary safeguards support all four languages. A language change while waiting makes the captured result stale, preserving current work. The optional assistant workspace read includes the selected locale and output-language instruction.

Prepared process text and previously saved models retain their original language. Regeneration after choosing a language creates a new localized draft; changing the UI is not an automatic translation of existing user content. Source segmentation still recognises the explicit English future-need labels documented above; multilingual UI support does not claim a general multilingual future-need classifier.

Preview checks verified the English default, Estonian UI and source retention, French help and layout, German JSON-import error feedback, and saved language after reload without changing the active version. Seven additional automated checks cover complete interpolation, safe locale validation, French output instructions with untouched English evidence, rejection of translated/fabricated evidence, all-language unknowns, stale output after language changes and escaped SVG fallback text. Native-language editorial review and broad live model-language acceptance remain future checks.


## v0.6: system cards and persistent system legend, 25 October 2026

M2 adds task-level system, execution mode, human-decision status and exact supporting evidence while retaining the existing responsible role. Manual entries append a source clarification, create a new browser-local version, preserve the process mode and graph, and reset review. The previous version remains restorable. Missing card fields are shown as focused prompts separately from the general role/flow question budget and diagram-review action.

The system registry persists across view changes, reloads and restores and travels with JSON. Canonical IDs derive from normalized product names; registering BC in another language or normalizing a model-generated ID preserves its identity and color. All systems use a square; labels remain visible, including systems unused in a view. The same identity colors SVG badges and the exported SVG/Mermaid legend. System colors are separate from role colors. This is browser-local persistence and portable JSON, not a shared customer database.

Strict model output now carries the registry and card fields. Trusted instructions prohibit inventing programs, inferring automation from a program name, inferring human decision from a decision shape, translating product names or expanding BC. The server binds evidence to the source, requires a selected system to be named in its quotation, rejects future-only system evidence from as-is drafts, validates referenced systems and reconciles IDs against the existing registry. A manual software task and an automatic task with a human decision in the same task are rejected. Legacy v0.5 files remain importable with unknown card defaults under the additive schemaVersion 1.0 extension.

Preview UI checks exercised Estonian card entry (BC, person using software, no human decision), a new unreviewed version with an exact source clarification, persistence after reload, French language switching with unchanged version/label/color, the same unused BC entry in another process view, German contradiction feedback without committing a version, correction to automatic/no human decision, a real JSON download and reimport, and restoration of the earlier card as a new version. The synthetic exported UI fixture is in verification/system-card-browser.json. These BC assignments are test answers, not facts about Digmatix customer processes. The AI schema/evidence path was tested with a mocked provider; no new live model request or business-reference acceptance is claimed for M2.

Fourteen added behavioural checks cover migration, version/review/evidence retention, contradictions, malformed imports, future-only facts, cross-view/history/JSON persistence, ID collisions, independent model ID convergence, safe labeled exports, focused unknowns, AI registry/schema context, renaming/fabricated evidence rejection and stale-result protection. All 79 checks and TypeScript pass. See SYSTEM-CARDS.md for usage and current limits. R1–R8 and T1–T6 business acceptance remain partial; work allocation stays deferred and mentor questions remain held.


## v0.7: selectable flowchart direction, 25 October 2026

M3 adds a translated Direction selector above the flowchart. The interface defaults to left-to-right (LR); top-to-bottom (TD) remains available. A separate browser preference remembers the choice independently of process JSON, source, versions, review and interface language. Changing direction does not call the model, regenerate a process or invalidate unchanged in-flight process inputs. Both SVG and Mermaid exports follow the current choice. The Mermaid code preview switches between flowchart LR and flowchart TD. Existing low-level helper calls that omit an option retain TD for compatibility.

The horizontal layout positions graph levels in columns and siblings vertically while keeping text, roles and system cards upright. Forward edges enter from the left; return loops route above the diagram. The vertical renderer retains its existing routing. Both use the same validated process and persistent system legend. This adds two orientations of the existing flowchart, not BPMN or swimlane notation.

All 84 automated checks and TypeScript pass. Five added checks cover safe direction normalization, all prepared cases in both directions with bounded node/card coordinates and forward-edge order, horizontal loops with all connections retained, SVG/Mermaid export direction with unchanged system identity/evidence/review, and upright labels with separated branches. Preview verified the English default LR, Estonian controls, TD Mermaid prefix, retained TD after reload with source/version/history unchanged, and French LR selection with the same draft. Business-reference and large/A4 readability acceptance remain partial. No new model request was made for this display-only change.

## v0.9: business areas and customer overview, 26 October 2026

M5 follows Jana’s guidance with a controlled, correctable functional classification and a conservative customer summary. The six project areas are aligned with linked Business Central documentation; they are separate from role/software and are not the entire Microsoft process catalog. The official basic inbound warehouse flow is the concrete reference. No reference activity is inserted into a customer’s model. Unknown legacy mappings stay unknown. Strict model output carries category/rationale; model responses cannot mark new assignments human-confirmed. Manual confirmation preserves source and graph, creates a new unreviewed version and is retained on unchanged tasks during subsequent edits/clarifications.

Customer overview always uses TD and contracts only safe single paths of adjacent same-area/owner/system activities. It preserves decisions, cycles, labelled edges, questioned steps and unknowns. Each displayed group links to its original step rows. The detailed view retains its own direction and all JSON stays complete. SVG adds category/status labels and stable area colors; overview SVG is the summary, while Mermaid exports the detailed graph. Sources, help, controls and errors support all four interface languages. See [BUSINESS-AREAS.md](BUSINESS-AREAS.md) for schema, reference profile and usage.

All 96 behavioural checks passed. Managed-preview checks verified a real import, two groups covering eight original nodes, exact before/after JSON equality on display change, group-to-original-row navigation, manual confirmation from v2 to v3 with review reset, source retention and reload persistence. English, Estonian, French and German labels and localized status were checked. Simulated 390/1920/3440 viewports had no page-wide horizontal overflow. Local preview SVG download events were not observed; serialization and geometry pass tests. New AI/schema tests used a mocked provider, not a paid model request. Original R1–R8/T1–T6 business-reference acceptance remains partial; full transcript quality and A4 readability still need review. Existing v0.7 guide PDFs/ZIP remain dated snapshots.

## v0.11: Markdown discussion handoff, 28 October 2026

Markdown import stages UTF-8 `.md`/`.markdown` files in a plain-text preview. The explicit use-as-description action replaces input only; it never starts model generation. The same existing Generate path consumes that text. Size limits are 2,000,000 bytes per file and 120,000 characters for analysed descriptions. Decode/read/schema errors leave the current process intact. No Markdown/HTML is executed.

Markdown export includes the full detailed graph as Mermaid, readable steps/roles/systems/areas, evidence, connections, questions, notes and original source. Edited-but-unmodelled source, an unapplied command and pending answers remain separate from the current diagram. A fenced `process-studio-json` envelope stores the process and workspace snapshot. Earlier version history is not exported. EN/ET/FR/DE labels and four guide supplements are included.

Reopening an unchanged snapshot validates the model and creates a new unreviewed local version, preserving the previous diagram in history. Direction and pending texts return, while the chosen interface language stays unchanged. The importer compares readable content to the deterministic rendering of the envelope; a chat edit disables snapshot restore. The revised readable text remains available for explicit re-analysis without the embedded JSON. This comparison detects inconsistent representations; it is not a signature or proof of trusted authorship.

Validation: 106 behavioural checks, TypeScript, production build and 66-file secret scan passed. Tests cover all prepared examples in four languages, retained real memo/transcript outputs, pending inputs, invalid schema/encoding-related content, size limits, nested fences and changed-prose/diagram detection. Browser preview verified file chooser import, unchanged restoration (v1 to v2, pending command and TD direction), changed prose disabling restore and being loaded without its JSON envelope, and ordinary Markdown preview. The preview download event was not observed; production download is checked separately. No additional paid model trial is required for this client-side file feature. Business acceptance of the underlying AI mapping remains open.

Guides: [EN](MARKDOWN-GUIDE-EN.md), [ET](MARKDOWN-GUIDE-ET.md), [FR](MARKDOWN-GUIDE-FR.md), [DE](MARKDOWN-GUIDE-DE.md). Existing v0.7 PDF guides remain dated snapshots.

## v0.10: supplied-input review and conservative boundaries, 26 October 2026

Four real hosted generations covered the full purchasing interview, detailed/compact sales memo, long workshop transcript and an invented incomplete control. All passed structural validation; source review found a provisional sales revision action/return route and compound actions with potentially different owners. The limited transcript view needed a Production category. These findings are retained rather than described as business acceptance. Exact results, predefined comparisons and limits are in [SUPPLIED-INPUT-VALIDATION.md](SUPPLIED-INPUT-VALIDATION.md).

Production adds a seventh option and four-language labels without migrating existing mappings or changing earlier category colors. Unknown fallback no longer depends on array position. The incomplete teaching fixture separates the unstated post-order boundary from the stated rejection completion and retains its missing-step question after role/rule answers. Trusted AI instructions and the alternative-assistant request reject request-to-implementation inference and provisional as-is routes, and separate actions where owners may differ. Existing drafts are not silently rewritten. Two additional behavioural checks bring the suite to 98. Targeted live follow-up and business limitations are recorded with the validation evidence.
