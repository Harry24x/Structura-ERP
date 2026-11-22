# Structura ERP

**Turn meeting notes into validated ERP process diagrams with an LLM.**

Structura ERP is a Next.js web app for ERP consultants. You paste meeting notes or upload a PDF or Word file that describes a business process. The app asks an LLM for a structured process model, validates it, and draws it as a flowchart and a BPMN-style swimlane diagram that you can review, edit and export.

<!-- Add a screenshot or GIF of a generated diagram here: -->
<!-- ![Structura ERP demo](docs/images/demo.png) -->

## How it works

```
Meeting notes / PDF / Word
          │
          ▼
  LLM (Gemini or OpenAI) ── structured output in a fixed JSON schema
          │                 (roles, systems, steps, decisions, connections)
          ▼
  validateProcess()  ── checks schema version, 2–90 steps, unique IDs,
          │             every connection points to a real step,
          │             roles and systems exist
          ▼
  Renderer (app code) ── Mermaid flowchart, BPMN-style swimlanes, SVG, PDF
```

The LLM never writes diagram code itself. It only returns data in `PROCESS_SCHEMA`, and the app turns that data into diagrams. If validation fails, nothing is drawn, so broken model output never reaches the user.

## Features

- **AI process drafts** from free text, PDF (pdf.js) or Word (mammoth) input
- **Two AI providers:** Google Gemini or OpenAI, selected by environment variable
- **Schema validation** of every model response before rendering
- **Diagram views:** detailed flowchart, BPMN-style swimlanes (one lane per role) and a top-down customer overview
- **Editing:** natural-language changes create a separate to-be version and keep the as-is version
- **Consultant rules mode:** a stricter extraction mode that links every step to the source sentences it comes from
- **Exports:** PDF (jsPDF), SVG, Mermaid, Markdown and JSON
- **Four interface languages:** English, German, Estonian and French

## Tech stack

| Area | Technologies |
|---|---|
| Frontend | Next.js, React, TypeScript, Tailwind CSS, shadcn/ui, Radix UI |
| Backend | Next.js API routes (`app/api/process/route.ts`), Cloudflare Workers runtime |
| AI | Google Gemini / OpenAI with structured JSON output |
| Data | SQLite with Drizzle ORM |
| Files and export | pdf.js, mammoth, jsPDF, svg2pdf.js, Mermaid |
| Testing | Node.js test runner, 31 test files |

## Run it locally

Requirements: Node.js 22.13 or later and pnpm.

1. Install the dependencies:
   ```bash
   pnpm install
   ```
2. Create a file called `.env.local` in the project folder with your API key. A free Gemini key from Google AI Studio works:
   ```
   GEMINI_API_KEY=your-key
   ```
   To use OpenAI instead, set `OPENAI_API_KEY`. If both are set, Gemini is used.
3. Optional: check that your Gemini key works:
   ```bash
   pnpm check:gemini
   ```
4. Start the development server and open the address shown in the terminal:
   ```bash
   pnpm dev
   ```

Run the tests with `pnpm test`.

`.env.local` is ignored by git. Never commit API keys.

## Project structure

```
app/            Next.js pages and API routes
components/     React components (process explorer, system cards, UI)
lib/            Process model, validation, AI provider, BPMN, exports
db/, drizzle/   Database schema and migrations
tests/          Automated tests
docs/           Design notes, validation reports and user guides
```

## Background

Structura ERP started as a team project in the Erasmus+ Blended Intensive Programme "Problem-Solving Through Generative AI" (Tallinn, 2026), built for an ERP software company's challenge. This repository is my continued version of it. Since then I have added Gemini as a second AI provider with tests and removed client-specific data. Detailed development notes from the programme are in [docs/PROJECT-NOTES.md](docs/PROJECT-NOTES.md).

## Author

**Harman Bhangu** · [GitHub](https://github.com/Harry24x) · [LinkedIn](https://www.linkedin.com/in/bhanguharman) · [Portfolio](https://harry24x.github.io/)
