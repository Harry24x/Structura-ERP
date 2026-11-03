# Task system cards and persistent legend - v0.6

Open a step in the diagram or Process steps table. **Complete system cards** opens the first task with missing card information. The drawer retains the responsible role and activity evidence and adds the named system, execution mode and human-decision selector. Existing registered systems can be reused; **Add a system** registers a product name without expanding abbreviations such as BC.

Save records the supplied answers in the source as a clarification and stores a new, unreviewed version. It preserves activity order, roles, connections and as-is/to-be mode. It makes no model call. Prior versions remain in history; restoring one keeps the known system registry while restoring that version's task assignments. Manual controls are disabled during an AI request or while the edited description differs from the displayed model.

## Meaning of the fields

| Field | Values and meaning |
| --- | --- |
| `systems` | Up to 30 registered `{id,label}` entries. A registry entry alone does not assert that a task uses it. |
| `node.systemId` | A registry ID or `null` when the program is unknown or the task uses no software. |
| `node.execution` | `unknown`, `manual` (person without software), `assisted` (person using software), `automated` (software executes without a person). |
| `node.humanDecision` | `true`, `false` or `null` (unknown). A diamond alone is not evidence of a human decision. |
| `node.systemEvidence` | A short exact quotation from source supporting known card information, including a manually saved clarification. A selected system must be named in that quote. |

A manual task cannot simultaneously reference software. An automated task cannot simultaneously require a human decision within the same task. A human decision can be manual or assisted. Start/end markers retain unknown/null card values. Missing task fields have focused prompts in the card; they do not consume the general process-question budget. System completeness is displayed separately from the existing manual diagram-review status.

## Persistence and exports

All systems use the same square symbol. Color is derived from a stable canonical ID, itself based on the normalized product name; model/import IDs are reconciled and references updated. Existing labels and IDs are retained when reused. Case and incidental whitespace do not create duplicate names. A conflicting imported ID cannot reassign a step to another program. Product names and identifiers are not translated when the interface language changes.

The registry stays with the current process in the existing browser-local save, is merged when loading another view or restoring a version, and is included in JSON exports. Unused systems remain visible and are labeled as unused in that view. The SVG exporter includes the system legend; Mermaid includes matching system classes and a separate legend subgraph. System names are escaped in exports.

Legacy schemaVersion 1.0 files remain importable. Missing optional card fields migrate to unknown/null/empty defaults. Current exports include the additive `systems`, `systemId`, `execution`, `humanDecision` and `systemEvidence` fields. Invalid references, values, contradictory combinations and unsupported evidence are rejected before import commits a draft.

## AI mapping

Generation, edits, clarification and the copied external-assistant request carry the extended card shape. The server supplies the existing registry as context and trusted card instructions. Only explicitly stated source facts may populate fields; product names, automation and human decision must not be inferred from roles or diagram shape. Current and proposed future system use remain separate. Exact source quotes retain their original language. Registered product labels cannot be renamed by the model, and new system names must appear in source.

## Current limits and verification

Persistence is local to this browser and portable through JSON. It is not shared customer-level storage, automatic collaboration or synchronization across devices. The palette contains seven colors, so different names can share a color; the product label and square remain visible. Registry rename/delete, aliases, multi-system tasks and customer-specific style administration are not included. A task has one primary system; uncertain additional interactions belong in source notes or separate steps.

The 79 automated checks include fourteen system-card checks and seven multilingual checks. Preview tested actual card saving, exact source clarification, review reset, reload, French label/color retention, cross-view unused legend, German contradiction errors, JSON download/import and restoring the previous task assignment. `verification/system-card-browser.json` is the actual exported synthetic sales example after a test answer assigned BC/automatic/no human decision. It is not a claim about a supplied customer case. Model schema/context validation used a mocked provider; live model-quality acceptance and Digmatix review remain open.

Existing PDFs and the v0.5 backup remain their original dated snapshots. This document describes the v0.6 addition. No mentor/customer questions were sent and no original acceptance status was marked fully passed.
