# Desktop audit — 29 October 2026

**Follow-up:** the three residual security findings and local proxy limitation recorded below have since been corrected. See [security/runtime follow-up](SECURITY-RUNTIME-FOLLOWUP-2026-10-29.md) for the current zero-finding audit, 135 tests and runtime regression evidence. The results below retain the first audit's chronology.

## Kokkuvõte

Projekt klooniti tühja Windowsi töökausta harust `prototype/process-studio-v0-1`. Parandused asuvad kohalikul harul `audit/desktop-2026-10-29`. Parandatud on pooleli tekstide säilitamine, eksitav salvestusolek, DOCX-i mahu kontroll, Mermaidi puuduva rolli tõlge ja paneelide klaviatuurikasutus. Lisatud on Windowsis töötavad kontrollkäsud ja turvauuendused. Säilivad neli keelt, as-is/to-be eristus, allikatõendid ja varasemad salvestused.

128 automaattesti ja TypeScripti kontroll läbivad. Windowsi tootmisbuild ning 88 ehitatud faili saladuste kontroll läbivad; viimase lõppkontrolli käsud ja tulemused on allpool. Brauseris kontrolliti importi, taastamist, ekspordifaile, klaviatuuri ja keeli. Tasulisi mudelikatseid ei tehtud. Avaldatud lehte, ligipääse ja kaug-repositooriumi ei muudetud.

Sõltuvusauditi loendur vähenes **84-lt kolmele**: kriitilisi leide 3 → 0, kõrgeid 35 → 1, keskmisi 35 → 2, madalaid 11 → 0. Kolm allesjäänud kaudset sõltuvust ja nende tegelik kasutusulatus on eraldi kirjas. See ei ole väide täieliku turva- ega ärilise vastuvõtukontrolli kohta.

## Baseline and environment

- OS: Windows, PowerShell; workspace `C:\Users\sande\OneDrive\ChatGPT_Projektid\BIP018_processstudio`.
- Source commit: `198f90931c7b92cc787609f46c1cb98751c28cb2`; clone initially clean, no local user changes.
- Node `v24.19.0`, pnpm `11.25.0`; portable execution profile.
- Read the handoff as background material, README, implementation notes and relevant import, Markdown, diagram, system, business-area, AI-validation and PDF guides. Existing verification documents are historical evidence.
- Initial run: 119/120 tests passed while installation was incomplete; DOCX extraction failed because Mammoth was not installed yet. This was an environment/setup failure. After installation, all existing tests passed alongside the new regression checks.
- Baseline dependencies also built successfully on Windows; the original secret scan covered 87 files.
- Sandbox DNS restrictions required approved network execution for Git clone and dependency installation. Worker startup initially hit local-socket `EACCES`; running the development server with the supported permission resolved it without application authentication changes.

## Corrections and evidence

| Finding | Reproduction and impact | Correction / verification |
| --- | --- | --- |
| Pending work lost on reload | The saved object omitted `command` and `answers`, and the save effect did not depend on them. | `lib/workspace-storage.mjs` saves and restores both, bounds untrusted pending fields, supports older workspace objects and filters damaged history entries. Node round trips and actual browser reloads retain edited source, an unapplied command and an unapplied role answer. |
| False saved status | The header used `hydrated` as its saved signal even when `localStorage.setItem` threw. | Saved status now follows a successful write. Failure leaves the previous stored copy intact and recommends Markdown, which includes pending text. Quota failure is exercised with a throwing storage implementation; an actual browser quota was not filled. New messages and a retention guide cover EN/ET/FR/DE. |
| DOCX preflight trusted ZIP size claims | Changing an entry's central-directory uncompressed length could pass the old size preflight; full decompression then happened inside the parser. Directory count, local metadata and duplicate names were also insufficiently checked. | Cross-check directory boundaries/counts, local headers, names, methods and data ranges. Stream-count actual output before Mammoth and reject overclaimed output or sizes exceeding the existing 50 MB decompression budget. Tests cover a genuine DOCX, forged lengths, inconsistent headers/counts and cancellation. No compressed-bomb allocation is needed to reproduce the bypass. |
| English unknown-role text in translated Mermaid | `toMermaid` ignored the supplied `unknownRoleLabel`. | Use the supplied label. Tests cover ET/FR/DE. The Markdown reader accepts the exact historical rendering as well as the corrected rendering, so older unchanged translated snapshots remain restorable; edited prose still disables restore. |
| Drawer keyboard behavior | Drawers lacked dialog semantics, Escape handling and focus containment. | Dialog label and modal semantics, initial focus, Tab/Shift+Tab containment, Escape and return focus. Actual browser checks verified initial Close focus, Shift+Tab wrapping to the last control and focus returning to Import after Escape. |
| Late import after unmount | Cleanup aborted parsing but did not invalidate the import sequence token. | Cleanup also advances the token, so stale progress/results fail the existing guard. Delayed file-read cancellation has a regression test; not every possible late browser parser race was reproduced. |
| Vulnerable dependencies | `pnpm audit --json` reported 84 findings, including three critical Next.js entries. | Update affected direct dependencies and compatible transitive versions; retain Vinext and the hosting integration. Zod 4 required explicit record key schemas in the local connector protocol; an added test verifies nonempty argument/result records, strict envelopes and session options. |

Additional commands: `pnpm test` discovers explicit test paths for PowerShell and Unix shells; `pnpm typecheck` and `pnpm check:secrets` expose the existing checks consistently.

## Dependency changes

Direct security updates: Next.js / eslint-config-next 16.4.1, React / React DOM / react-server-dom-webpack 19.2.8, Vite 8.1.6 and Zod 4.6.6. Vinext remains 1.0.0-beta.5. The pnpm policy pins affected transitive packages including Sharp, ws, Undici, Babel, js-yaml and parsing/build helpers; the lockfile records the full resolved graph. A frozen-lockfile reinstall passed. Existing release-age and build-script policies remain enabled.

References include the maintainers' [Next image-optimization advisory](https://github.com/advisories/GHSA-2464-fhr4-w9xw), [Next cache-function advisory](https://github.com/advisories/GHSA-673q-mjm6-r5xr), [Windows editor advisory](https://github.com/advisories/GHSA-587h-7wmj-h5pm) and [Zod advisory](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5). Audit entries identify installed packages; they do not establish exploitability of this Vinext application. No application `use cache`, ImageResponse or Next image-optimization feature was added or exercised.

Remaining findings from the final registry audit:

| Package / path | Severity | Disposition |
| --- | --- | --- |
| esbuild 0.18.20 under drizzle-kit → esm-loader | Moderate | Development database tooling; this audit did not run its development server or database migration workflow. The active Vite/esbuild toolchain uses the corrected version. Updating/replacing the old loader deserves a separate database-tool check. [Advisory](https://github.com/advisories/GHSA-67mh-4wv8-2f99). |
| Zod 3.25.76 under eslint-plugin-react-hooks / zod-validation-error | High | Lint/compiler tooling dependency. Application and connector code use Zod 4.6.6. A forced cross-major override could break the lint tool; left explicit rather than claiming all copies are patched. [Advisory](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5). |
| Satori 0.16.0 under Vinext → @vercel/og | Moderate | Transitive image-generation support; no application ImageResponse/OG-generation route is present. Moving to 0.33.5 crosses several 0.x versions and needs an upstream-compatible image-generation test. [Advisory](https://github.com/advisories/GHSA-wx4j-mvgx-mqwp). |

## Commands and results

| Check | Result |
| --- | --- |
| `pnpm install --frozen-lockfile` | Passed after the security update; lockfile unchanged by reinstall. |
| `pnpm test` | 128 passed, 0 failed, no skipped tests. Includes mocked-provider failure/stale-response checks and real DOCX extraction. |
| `pnpm typecheck` | Passed, no diagnostics. |
| `pnpm build` | Passed on native Windows with the updated dependencies. |
| `pnpm check:secrets` | Passed, 88 files. No local env files, credential patterns or client provider endpoint detected. |
| Production artifact string check | No `local_seedy`, `seedy@sites.test` or `localPreview` strings in dist. This is an artifact check, not a hosted authentication penetration test. |
| Local production Worker smoke check | Page 200; anonymous API GET/POST 401; synthetic authenticated, cross-origin POST 403; a standalone same-origin POST without a key returned 503 JSON `NOT_CONFIGURED`. See the local runtime qualification below. |
| `pnpm audit --json` | Three residual findings above; exit 1 because findings remain. |
| `git diff --check` | Passed. |

Local evidence/logs are in ignored `.sites-runtime/audit-tests.log`, `audit-build.log`, `dependency-audit.json`, `dependency-audit-after.json` and `audit-evidence/`. No real customer content or credentials were used in new fixtures. Downloaded verification artifacts contain synthetic prepared process data.

## Browser and export verification

Tested the actual local React application at `http://127.0.0.1:5173/` with the real Worker runtime, without a model key:

- DOCX preview retained paragraphs, table text and Estonian/French/German characters; applying text left the prior diagram visible and did not start generation.
- Readable PDF preview succeeded; no PDF worker/fake-worker warning appeared in the captured browser warning/error logs. The earlier `window is not defined` issue did not recur with Vite 8.1.6. This does not prove every PDF or every development configuration works.
- Mixed PDF listed textless page 2, disabled application until acknowledgement and enabled it after acknowledgement. Encrypted PDF and image-only PDF produced the expected clear errors without replacing the description or diagram.
- Downloaded Markdown, JSON and overview SVG. JSON reopened through the UI as a new valid unreviewed draft. An unchanged Markdown export of a reviewed process restored as a new unreviewed version. Automated checks additionally cover edited prose, legacy translated snapshots, malformed snapshots and limits.
- PDF downloads succeeded for LR detail, TD detail and customer overview. Poppler rendered all three and pypdf confirmed a single complete page, extractable text and the area legend. Dimensions: LR 1736 × 702 pt; TD/overview 700 × 1025 pt. PNG inspection found no clipped diagram, header or legend. The exported expense overview had zero contractible activity groups; complex grouped-overview/maximum-size PDF rendering remains outside this focused run.
- UI switches EN/ET/FR/DE while preserving the process and original source. At a 390 × 844 viewport, document width stayed within the viewport; the temporary viewport override was reset.
- Missing AI configuration returned the safe setup error through the actual endpoint; process/version/source stayed intact. No provider request or paid generation was made.
- Keyboard dialog focus, backwards wrapping, Escape and return focus passed. Reload retained an unapplied role answer without assigning it to a task.

## Limits and next acceptance work

### Local runtime observations

The development log emitted React's “multiple renderers concurrently rendering the same context provider” warning during the earlier concurrent build/development run. It did not recur after a clean development restart without a concurrent build. Browser state and work preservation checks passed. Avoid sharing generated framework state between simultaneous build/dev checks when reproducing it; its precise upstream cause was not established.

The first compiled Worker startup on port 5174 aborted in native workerd with `std::terminate() called with no exception`. An automatically allocated port (`pnpm start --port 0`) started successfully. No listener on 5174 was observed; a port conflict is not established. The workerd/miniflare versions are unchanged from the baseline. During batched production HTTP probes, some POSTs received Wrangler's plain-text “worker restarted mid-request” 503 instead of the application's JSON; standalone repeats returned the expected JSON. This also occurred with a separate `SITES_RUNTIME_ROOT`, so shared-registry collision is not a proven explanation. The non-JSON text is generated by the installed Wrangler ProxyWorker. This is a residual local preview/runtime limitation, not evidence that a hosted model call failed. Production browser model quality and the hosted endpoint were not tested. See the ignored `audit-start.log` and `audit-start-isolated.log`.

The local auth smoke test supplied synthetic trusted identity headers only to the local compiled Worker, emulating the platform's authenticated-request boundary. It does not test the hosted gateway or establish that identity headers from an external visitor would be trusted. All local test servers were stopped after verification.

No deployment, remote push, PR, merge, access-policy change or paid AI trial is included. Hosted authentication was not changed. No real course/customer acceptance has been established.

Existing automated tests cover graph/evidence rejection, source binding, future/current separation, provider 401/403/429/5xx, timeouts, refusal, cancellation and stale responses. These were rerun with mocked providers; those individual states were not all simulated through the actual browser API. Exhaustive late parsing races, browser storage denial/quota, 200-page PDFs, unusual DOCX ZIP variants, maximum-size/Unicode process PDF renderings, all supplied business cases and repeated live AI quality trials remain unverified in this desktop audit. TXT decoding and limits are covered by automated tests; a separate TXT picker test was not needed to validate the unchanged UI path.

The application still has prototype limits: browser-local storage, no OCR, no native Visio/BPMN certification and no Business Central integration. Exact evidence validation remains a safeguard, not proof of correct business interpretation.
