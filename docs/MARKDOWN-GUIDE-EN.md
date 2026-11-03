# Markdown: from discussion to diagram and back

Process Studio v0.11 · 28 October 2026 · User guide supplement

1. Ask your chat assistant to save the discussion as a `.md` file. Clearly separate current practice, proposals and unanswered questions.
2. Choose **Open Markdown file**, inspect the preview, then select **Use as description**. This replaces the input text while retaining the current diagram.
3. Review the input and choose **Generate diagram**. Only this action sends the description to the AI model and uses the model service.
4. Review the diagram. Select a step to check its evidence and correct its business area or system card. Answer clarification questions. To change activities or connections, describe the change and select **Apply change**; this creates a proposed to-be process. Choose left-to-right or top-to-bottom layout. Dragging steps is not currently supported.
5. Choose **Export Markdown** in the header. The file contains the complete detailed process even when viewing the customer overview: Mermaid diagram, steps, roles, systems, areas, connections, evidence, open questions and source. Unapplied source edits, a pending command and typed answers are clearly separated.
6. Attach the downloaded `.md` to your chat and ask for analysis or corrections. The file includes a suggested continuation prompt. Diagram display depends on the chat environment's support for Mermaid.
7. Open the resulting Markdown on the site. An unchanged Process Studio file offers **Restore saved process** without an AI call. Restoration creates a new unreviewed version and retains the previous diagram in local history. Direction and pending text are restored; your interface language stays selected.
8. If the readable text or diagram changed in chat, use **Use as description**, then **Generate diagram**. Restoring the old snapshot is disabled so that those changes are not silently ignored.

## Limits and saving

- UTF-8 `.md` and `.markdown` files, up to 2,000,000 bytes. Descriptions sent for analysis are limited to 120,000 characters; select a narrower process for longer discussions.
- Markdown is a readable handoff and one-process snapshot, not a backup of all version history. Download a copy before further changes. Attaching the file to chat remains a user action.
- Opening, restoring and exporting files make no AI calls. Generation, AI clarification and applying a change use the existing model service.
- Review source and notes before sharing: the file contains the complete supplied process information. A knowledgeable person must confirm business facts.
- Existing text input, JSON, SVG and Mermaid exports remain available. This supplement does not update the older v0.7 PDF guides.
