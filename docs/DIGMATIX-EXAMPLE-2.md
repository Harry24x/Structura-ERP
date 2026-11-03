# Supplied Example 2 — first source review

24 October 2026. Status: **partial draft; business review required**.

Source: complete Paljuriideid OÜ purchasing interview in the [retained challenge text](https://docs.google.com/document/d/1FEJ3BLKfjMqlIHu8_aok2fPOtvqN8xc7e6Ak1FCbNmM/edit). The Example 2 section is retained unchanged in `lib/digmatix-source.mjs`; each view includes all 1,179 words, not a shortened synthetic replacement.

The conversational assistant prepared the models from that source. No external model API or automatic browser extraction was used. This is one assisted drafting pass, not a repeated quality benchmark or an approved ground truth.

## Three scopes

| Stage | Nodes / decisions | Open questions | Boundary |
| --- | --- | --- | --- |
| Plan and approve | 19 / 5 | 6 | Purchase need to confirmed order or cancellation |
| Confirm and track | 13 / 2 | 4 | Confirmed order to arrival, supplier response or unresolved deviation |
| Receive and close | 19 / 4 | 6 | Physical arrival to accepted stock, an open balance or supplier-resolution handoff |

The scopes are three separate diagrams, not an automatically linked composite process. Stage handoffs are explicit labels. Waiting and clarification ends do not mean the whole purchase is complete. Use normal zoom and scrolling for detail; Fit provides an overview. A4 readability is not approved.

## Source findings and limits

- The purchasing manager is the interview speaker. This does not establish that this person performs every activity described as “we” or in passive voice. Unstated operational roles remain null, with questions.
- The buyer can confirm regular smaller purchases. Larger amounts need the purchasing manager. No amount is specified. The correction loop returns to the manager, and cancellation is a separate stated outcome; cancellation authority is unknown.
- Price discrepancies must be checked. Updating the order and the precise reapproval sequence are not described fully.
- Supplier deviations can lead to acceptance of a modest delay, a request for partial delivery, an alternative supplier or negotiation with the customer. These may combine. The draft records the options in visible notes and asks about routing instead of inventing exclusive branches or a continuation.
- For large deliveries the source literally says the warehouse informs the buyer, while the interviewer's question asks about advance notification of the warehouse. The direction is retained as an unresolved contradiction. The mapped warehouse ERP view is explicitly limited to regular deliveries.
- Wrong or damaged goods are separated, the buyer is informed and a supplier arrangement is agreed. The execution of return, replacement or other arrangements is not supplied; the draft stops at that handoff.
- Only the actual arrived quantity is registered. A promised balance stays open; an undeliverable balance is adjusted by the buyer. The text describes shortages, not a complete over-delivery policy; other quantity differences remain unresolved.
- The condition and quantity gates are a draft decomposition of the stated inspection, not evidence of mandatory precedence between those checks.
- Customer-specific purchasing requires sales to know about receipt. The sender and handling of partial receipts are unknown.
- Invoice checking and supplier payment are explicitly outside this process and are not added as receipt activities.

## Verification and next gate

25 Node behavioural checks passed after adding seven focused source-case checks and three fixture-validity checks to the previous 15 checks. They verify supported source evidence, unknown roles, the correction loop, preserved cancellation, unresolved supplier routing, segregation of damaged goods, open balances, non-destructive rejection of short answers to flow questions, and finite exports. They cannot establish the semantic correctness of a model or replace a process owner's review.

TypeScript and production build checks are required for publication. Local browser checks cover the stage selector, visible source and scope notes, approval blocking, process-step view, context-preserving clarification request and history across stage switches. Hosted execution remains subject to the private site's sign-in; no direct WebMCP success is claimed.

Next gate: review the 16 questions with a person who knows the process, complete the unresolved paths, then compare model outputs against an accepted reference and run the planned repeated edit tests. T3 is partial, not passed. Work allocation and both held questions for Jana remain unchanged.
