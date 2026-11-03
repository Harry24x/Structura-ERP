# Supplied-input validation — 26 October 2026

These are development observations from the authenticated hosted Generate diagram button, using the existing GPT-6.1 Sol connection and unchanged credentials. The initial four generations used v0.9. Three inputs are supplied company material (Examples 2, 3 and 5a); the fourth is a synthetic incomplete control. The comparison checks in verification/v0-10/*-reference.json were recorded before generation. They are developer-defined checks, not business-owner-approved expected diagrams. Provider duration was not measured. No automatic retry is enabled.

Each exact initial result is preserved in verification/v0-10/*-initial.json, including its authoritative source and unreviewed draft. All four passed structural, exact-quotation and schema validation. Those checks do not establish that quoted material supports every action, role or connection semantically.

| Input | Initial result | Source review and limit |
| --- | --- | --- |
| Full purchasing interview, Example 2, 1,179 words | 40 nodes; 23 questions; purchasing 25 and warehouse 8 activities/decisions | Correction, supplier deviations, actual receipt and exception boundaries remain visible. Approval amount is not invented. Invoice/payment is excluded as the next process. The contradictory advance-notice statement is questioned rather than silently reversed. Cancellation authority/entry and some branch readability still need business review. |
| Detailed sales memo plus compact alternative, Example 3 | 35 nodes; 23 questions; all 31 activities/decisions classified sales | The two descriptions were consolidated, postponement stayed distinct from loss, and specialist input did not become finance work. However, “Revise agreed offer terms” was supported only by “ask for changes”; its provisional return route was not stated. A note/question did not make this valid. Additional analysis/requesting an estimate and recording a loss reason/closing the case also combined actions whose owners may differ. Partial result requiring tighter extraction. |
| Full long workshop transcript, Example 5a | 7 nodes; 11 questions; other 3 and warehouse 2 activities | The model chose a limited production-planning-to-picking view and retained other workshop topics in notes. Excel/Directo use was source-bound; future FEFO/EDI and unspecified raw-material movement or finished-goods logistics were not invented. This is partial transcript coverage. Manufacturing and shift planning lacked a dedicated category. |
| Invented incomplete purchase request | 7 nodes; 4 questions; purchasing 4 activities/decisions | Missing reviewer, approval rule, notification sender and post-order continuation stayed explicit. The generated boundary was more faithful than the prepared teaching fixture, which incorrectly shared the rejection completion with order placement. |

## v0.10 corrections

Production is now a separate category in English, Estonian, French and German. Its Microsoft product reference describes manufacturing planning/control; it is not evidence that this customer uses Business Central. Existing Other assignments, IDs, colors and customer facts are not changed automatically. A safe unknown fallback is independent of category position.

The prepared incomplete purchase example now has a separate post-order unmapped boundary and a third question. The stated rejection completion remains. Answering the reviewer and rule questions cannot silently resolve the missing continuation.

Trusted server instructions now distinguish requesting a change from performing it, prohibit provisional as-is revision activities/loops justified only by questions, and keep actions separate when performers may differ. The alternative-assistant request includes the same core caution. These are prompt safeguards, not a semantic proof or a deterministic repair of earlier drafts. Existing generated versions remain available for review.

The behavioural suite has 98 checks, including production metadata/localized export round-tripping and preservation of the incomplete boundary. TypeScript, the production build and the 66-file secret scan passed before publishing. Real model follow-up is restricted to the two affected original inputs: the sales memo and workshop transcript. Do not interpret a single improved response as repeatability or four-language generation acceptance.

## Targeted hosted follow-up on v0.10

Two further real generations used the same original memo and full workshop transcript, with no additional key, model change or automatic retry. Total for this validation sequence: six model requests (four initial and two targeted follow-ups), all returned validated, unreviewed drafts. Exact follow-ups are verification/v0-10/memo-retest.json and transcript-retest.json. Existing generations are retained; only new requests use the revised instructions.

| Input | Follow-up result | Targeted observation and remaining limit |
| --- | --- | --- |
| Original sales memo | 40 nodes; 30 questions; all 33 activities/decisions classified sales | The earlier provisional terms-revision activity and return loop are absent. Terms-only continuation and continuation after explicitly stated reassessment/re-preparation end at questioned boundaries. Analysis and requesting an estimate are separate unknown-owner tasks; recording rejection has the stated salesperson, while closing lost remains a separate unknown-owner task. Postponement remains distinct from loss. Price negotiation and early specialist involvement are partly held in notes rather than given invented routes. There are more questions and this single result is not proof of completeness or repeatability. |
| Original full workshop transcript | 8 nodes; 11 questions; sales 1, production 3 and warehouse 2 activities | Shift review, production-list preparation and manufacturing now use Production; finished-goods movement/picking remain Warehouse. Customer-order administration adds Sales. The explicit post-picking boundary remains, with no invented dispatch, transport documents, retail receipt or raw-material receipt-to-production flow. Excel/Directo current use and future FEFO/order integration stay separate. This is still a limited connected view, not a full mapping of the transcript. Collective “we” in preparing the list was mapped to Margus and still needs ownership confirmation; source interpretation is not mechanically proven. |

The narrower changes improved the observed targets. They do not resolve every commercial approval, refused confirmation, contract exception, collective-owner statement or source ambiguity. No further paid retry was performed to chase a cleaner result.

## Remaining acceptance

R1–R8 and T1–T6 remain partial. Business-owner review of the diagram boundaries, cancellation routing, commercial approvals and source ambiguities is still required. The workshop covers several processes; one limited view is not a complete end-to-end mapping. Large-diagram/A4 readability, repeated extraction/edit comparisons and real four-language output quality remain open. Existing v0.7 guide PDFs and ZIP are dated snapshots and were not regenerated for this bounded change. Work allocation remains deferred.
