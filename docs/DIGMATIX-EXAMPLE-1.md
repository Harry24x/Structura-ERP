# Supplied Example 1 — current practice and future needs

24 October 2026. Status: **partial source draft, with a verified explicit-label import guard**.

Source: complete Põllukuld AS goods-receipt/storage workshop example in the [retained challenge text](https://docs.google.com/document/d/1FEJ3BLKfjMqlIHu8_aok2fPOtvqN8xc7e6Ak1FCbNmM/edit). All 659 words are retained in `lib/pollukuld-source.mjs` and loaded with each view. The current conversational assistant prepared the models; no external model API or unattended extraction was used.

## What is current, what is requested

| Current practice | Explicit future need |
| --- | --- |
| Supplier 1 has an Excel order prepared in advance; paper documents and manual checks are used. | Purchase orders and visibility of already ordered goods in ERP. |
| Warehouse workers do not make ERP transactions; the accountant makes the necessary entries. For other suppliers this includes an ERP purchase invoice. | Electronic goods receipt and comparison against an ERP order. |
| Packaging-related taxable quantity is calculated in Excel. Historical weighing practice is mentioned. | More automatic packaging calculation in ERP. |

Future ERP functions must not be promoted into today's process. Conversely, future ERP needs must not erase the accountant's already existing ERP work.

## Draft scopes and unresolved details

- Supplier 1 receipt: 15 nodes, 3 decisions, 2 explicitly assigned roles and 7 questions. Shows paper, comparison with the existing Excel order, manual checks, acceptance of actual quantity, supplier email, a credit claim for damage, stock placement, batch rotation and accountant follow-up.
- Other sources: 8 nodes, 1 decision, the accountant role and 6 questions. Shows the other-supplier document route and explicitly keeps own-production receipts out of external inspection/invoicing. This is a document view, not a completed physical-receipt process.
- The operational owners of several passively described tasks are unknown. Location in a warehouse is not sufficient evidence to assign every task to a warehouse worker.
- Relative timing of quantity/quality checks, storage and accountant entries is not fully established. The first view uses a draft sequence and leaves this question open.
- A credit claim is stated for damage, but physical disposition and continuation are not. The diagram stops at a clarification handoff, rather than inventing a return, a stock acceptance or a real business stoppage.
- The own-production source explicitly says no inspection on receipt. Subsequent recording and stock movement are not mapped; no purchase invoice is invented for that branch.
- Established stock locations, two warehouse floors, handling speed and rare cross-docking remain source context. Packaging is an independent scope and is not chained into an unsupported receipt sequence.

## Import guard and its limit

`sourceBlocks` recognises the English `Need:` paragraph marker and `Summary of identified needs`. A numbered section, a new example or a current-process heading ends that future scope; a blank paragraph ends an individual Need paragraph. Clarification/Answer prefixes also start a new scope.

For an as-is model, an activity/decision quote found only inside a recognised future block is rejected before commit. The same text is allowed in a proposed to-be model. If the quote is also stated outside future blocks, it is not rejected solely because a future need repeats it.

The guard does not understand arbitrary tense, implied requirements, every language or semantic correspondence between the label and quote. An activity with an incorrectly interpreted current quote can still need rejection by a person. Exact quotes and deterministic guards do not establish semantic correctness.

## Verification

35 Node behavioural checks passed: the previous 25, two fixture-validity checks and eight new source/guard checks. TypeScript passed. The new checks cover future paragraphs and summaries, boundary resets, repeated current/future phrases, preserved accountant ERP use, the own-production exception and the Supplier 1 current branches.

Local browser verification confirmed the two scopes and the separate three-need display. A deliberately invalid as-is import using the future electronic-receipt statement was rejected, with the previous draft retained. The other-source step table retained the accountant purchase invoice and the own-production exception. Open questions prevent approval. Native private publication and its build are recorded in the shared test log; hosted authenticated interaction and WebMCP are not claimed as passed.

T6's explicit current/future separation has software and assisted-import evidence. Complete extraction quality, business acceptance and repeated model trials remain pending. Work allocation and the two held mentor questions are unchanged.
