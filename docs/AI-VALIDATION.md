# AI integration trials — v0.4, 24 October 2026

The earlier synthetic trials use invented descriptions; later sections record authorised supplied-source trials. They are development evidence, not a business-owner acceptance of the supplied company examples. The earlier synthetic trials below used GPT-6 Luna through the Responses API with strict structured output. Following the hosted and supplied-source review, the current default is GPT-6.1 Sol with revised actor/routing instructions. The same request preparation and result validation functions are used by the server route.

## Synthetic travel request

The full description is in `verification/travel-generated.json` under `source`. It states the employee, department manager and HR roles, a date-availability decision, approval, a date-revision loop and HR recording.

Generation produced eight nodes, three stated roles and no clarification questions. Review confirmed the stated ordering, both decision outcomes and the return to the same date check. Every activity/decision has matching source evidence. No process approval was set automatically.

The exact change command is appended to `source` in `verification/travel-edited.json`. It adds a Finance budget check between approval and HR recording, with a cost-revision loop. The response contains twelve nodes and four roles, retains all eight existing node IDs and preserves the original date-revision branch. The additional branch checks the budget without inventing a numerical limit. The result is a separate unapproved to-be version.

This is one successful generation/edit sequence. It does not establish repeatability, semantic accuracy on long interviews or model-based idempotence. The prepared receipt example has a separate deterministic idempotence check; that check is not evidence for unrestricted model edits.

## Synthetic incomplete request

The invented description states only that a request is submitted, checked and approved or returned; it supplies no task owners or continuation after approval. `verification/incomplete-generated.json` retains an empty role list, explicitly unknown responsibility and unmapped boundaries. Its five questions cover missing owners and the two continuations. The boundaries are not business completion claims.

An initial response omitted a role question for one unassigned decision and was rejected. The integration now adds a focused role question for each unassigned activity/decision lacking one. It never supplies an owner or changes activities to repair missing facts. A repeat trial passed validation and retained all unresolved information. This narrow completion step does not repair incorrect evidence or invented rules; those still fail validation or need human review.

## Software and UI evidence

58 Node behavioural checks pass: 35 existing process/source checks and 23 integration/concurrency checks. Integration coverage includes authoritative source binding, review/version reset, invalid quotes, missing roles, dirty and stale inputs, proposed-mode enforcement, multi-paragraph improvements, missing configuration, refusal, incomplete/malformed output, redacted provider errors, no automatic retries, timeouts, cancellation, bounded request bodies, request origin and stale browser responses.

TypeScript and the production build pass. The build scan verifies that local secret values and env files are absent from deployable output and that provider calls are not placed in the browser bundle. Production output removes the local-preview identity branch.

The managed preview displayed the generation/edit controls and attempted a synthetic description. Its Worker runtime could not reach the model service. The UI displayed a safe error and retained the previous draft and edited description. Direct server-function model calls succeeded for the invented trials above. The subsequent hosted checks below use the actual published API route and browser controls.

## Remaining acceptance

- Extend hosted checks across remaining supplied views and repeat them.
- Complete the remaining authorised company-source model trials.
- A business-reviewed reference and answers for open handoffs and roles.
- Repeated extraction/edit comparisons, larger diagrams and A4 readability.
- Confirm page-tool availability when using another supported browser.

Exact source quotes are a traceability safeguard, not proof that the activity, role or branch has been interpreted correctly. R1–R8 and T1–T6 remain partial until the relevant business and full-flow checks are complete. Work allocation stays deferred; mentor questions remain held.

## Hosted workflow and supplied-source review

After explicit user authorisation, the private hosted app was exercised through its actual generation and change buttons. Expense generation created an unapproved as-is version; a receipt-change command created a separate to-be version and preserved rejection and the recheck loop. A general clarification on an invented incomplete request added employee correction/resubmission, linked it back to the manager check and retained the unanswered initial-submitter question. Cancellation preserved the exact prior draft. Editing the description while a request was pending preserved both that version and the new text. These are functional observations, not evidence that every generated fact is correct.

The optional page tools executed a workspace read and a valid draft write on the authenticated page. A stale write failed with a generic invocation error; the valid write then created the expected next version. The explicit version guard also has software tests.

The initial Luna receipt edit labelled an Employee activity Ask employee to attach receipt, incorrectly assigning the requester action to its recipient. `hosted-expense-initial.json` retains that result. The initial supplied purchasing model continued a minimum-stock opposite branch whose outcome was unspecified (`digmatix-plan-initial-luna.json`). A later revision also failed structural validation because an end had an outgoing edge; it was rejected. A conservative Sol trial used artificial start connections to separate fragments. The new single-start-connection guard prevents that construction. These findings motivated the actor/recipient instructions, balanced common-continuation instructions and explicit question completion; they are not hidden as successful acceptance tests.

Current focused Sol trials:

| Trial | Result reviewed | Limits |
| --- | --- | --- |
| Purchasing planning/approval | 22 nodes, 4 roles, 14 open questions. The unstated minimum-stock continuation stops at an unmapped boundary. Correction/resubmission and cancellation remain visible; no approval amount is invented. | Cancellation entry/authority and several handoffs remain unresolved. Placement is a reviewable proposal, not accepted business routing. |
| Supplier 1 current receipt | 15 nodes, 2 stated roles, 14 open questions. Current accountant ERP work is retained; future ERP receipt/purchase-order automation is excluded. Damaged-goods disposition stops at a question boundary. | Relative timing, task owners, receipt recording and exact accountant transactions remain open. |
| Fresh receipt edit | 8 nodes, 3 roles. Attach receipt is assigned to Employee before the Finance recheck; the rejection branch and existing IDs are retained. No separate unsupported requester is assigned. | One focused run; not model-edit repeatability or idempotence. |

Exact current results are `digmatix-plan-generated.json`, `pollukuld-supplier1-generated.json` and `expense-receipt-generated.json` under verification/. Each retains its source, remains unapproved and passes the graph/evidence checks. The changes add questions or reject structural shortcuts; they do not mechanically establish semantic correctness. All other supplied views and a business-reviewed reference remain future validation work.

## Multilingual controls, 25 October 2026

The v0.5 header offers English, Estonian, French and German. The server validates the locale and adds a trusted output-language instruction for titles, node/role/branch labels, questions and notes. Source text and evidence quotes remain in the original language. Existing saved process content is not rewritten by a language switch.

Seven added software checks bring the total to 65. Mocked-provider tests verify French output instructions while retaining English source/evidence, reject translated evidence that does not occur in source, and keep deterministic unknown-role and boundary questions working in Estonian, French and German. Concurrent-work comparison also checks the selected language. Browser preview verifies translated UI/help, invalid-import errors, preference persistence and unchanged source/version. These checks do not claim live four-language model acceptance or professional translation review.
