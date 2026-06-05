# PDF-Analyser

> A polished Next.js + Gemini-powered web app that analyzes PDF documents and produces structured, human-friendly summaries, metadata, and visual/table insights.

---

## Table of Contents
- Project Overview
- Key Features
- Architecture & Flow
- Tech Stack
- Setup & Run (Developer)
- Environment & Secrets
- Usage (UI + API)
- Security & Privacy
- Tests & Development Notes
- Deployment
- Contributing
- License & Contact

---

## Project Overview

`PDF-Analyser` is a focused developer project that converts any public PDF (or uploaded PDF) into a structured analysis using server-side multimodal AI. The app extracts document metadata, generates a concise summary and single-line takeaway, detects tables and images, and returns topic keywords and other insights in a clean dashboard.

This project is suitable as a portfolio piece — it demonstrates full-stack engineering, careful security considerations (SSRF checks, file validation), streaming user feedback (Server-Sent Events), and integration with large multimodal generative models (Gemini) for high-quality document understanding.

## Key Features

- Paste a public PDF URL or upload a local PDF file (20MB upload limit).
- Secure URL downloads with DNS resolution + private IP filtering to prevent SSRF.
- Magic-byte validation and PDF encryption detection.
- Streamed progress updates via SSE so the UI shows step-by-step progress.
- Uses Google Generative models (Gemini) to produce structured JSON outputs (summary, keywords, topics, table/image insights).
- Clean and responsive frontend dashboard with summary, metadata, TOC explorer, image/table insights, and keyword chips.

## Architecture & Flow

1. Frontend (`src/app/page.tsx`) — user input & results dashboard.
2. Hook (`src/hooks/useAnalysis.ts`) — handles uploads/URLs, reads files, initiates streaming request.
3. Client stream helper (`src/lib/api.ts`) — POSTs to the server route and decodes SSE events.
4. Server route (`src/app/api/v1/analyze/route.ts`) — downloads or decodes PDF, validates, runs quick heuristics, and calls Gemini via `@google/generative-ai` to generate structured JSON. The route streams step updates and the final result back to the client.
5. UI components (`src/components/analysis/*`) render the `AnalysisResult`.

### Architecture Diagram

```mermaid
flowchart LR
  U[User Browser] --> F[Next.js Frontend<br/>`src/app/page.tsx`]
  F --> H[`useAnalysis` Hook<br/>`src/hooks/useAnalysis.ts`]
  H --> A[`streamAnalysis`<br/>`src/lib/api.ts`]
  A --> S[/Server Route: /api/v1/analyze<br/>`src/app/api/v1/analyze/route.ts`]

  subgraph ServerFlow [Server-side analysis flow]
    S --> D[DNS lookup & SSRF checks]
    S --> DL[Download remote PDF or decode<br/>`pdf_base64` payload]
    S --> V[Validation: magic-bytes, size, encryption]
    S --> G[Gemini AI (`@google/generative-ai`)]
    G --> P[Generate structured JSON
    (AnalysisResult schema)]
    P --> SSE[SSE: stream steps & final result]
  end

  SSE --> F

  DL -->|URL| R[Remote PDF URL]
  DL -->|Upload| UPL[`pdf_base64` upload payload]

  subgraph Config
    K[GEMINI_API_KEY]
    B[BACKEND_URL]
  end

  G --- K
  A --- B
```

Core file references:

- Frontend page: `src/app/page.tsx`
- Analysis hook: `src/hooks/useAnalysis.ts`
- Streaming client: `src/lib/api.ts`
- Server route: `src/app/api/v1/analyze/route.ts`
- Types: `src/types/analysis.ts`

## Tech Stack

- Next.js (App Router)
- React 19
- TypeScript
- Tailwind CSS (UI)
- Server-Side: Node (Next.js route) + `@google/generative-ai`
- PDF helpers: `@pdfsmaller/pdf-decrypt`, `pdf-lib`

See `package.json` for exact dependency versions.

## Setup & Run (Developer)

1. Clone the repo and install dependencies:

```bash
git clone https://github.com/ponnarasua/Pdf-Analyser.git
cd Pdf-Analyser
npm install
```

2. Create a `.env.local` at the project root and add required secrets (see Environment section).

3. Run the dev server:

```bash
npm run dev
```

4. Open your browser at `http://localhost:3000`.

## Environment & Secrets

Required environment variables:

- `GEMINI_API_KEY` — API key for Google Generative AI (used server-side). Without this the analysis step will fail and the route will return a helpful error.

Optional/Config:

- `BACKEND_URL` — configured in `src/config/constants.ts` (default `""` so the frontend uses same origin `/api/v1/analyze`). Only change if separating frontend and backend origins.

Keep secrets out of source control. Use your platform's secret manager or `.env.local` (gitignored) for local development.

## Usage

Frontend (recommended):

1. Paste a public PDF URL into the input and click **Analyse PDF Link**.
2. Or switch to **Upload Local File** and upload a PDF (≤ 20MB).
3. Watch the progress bar (SSE stepper), then review the structured dashboard: Summary, Key Takeaway, Metadata, TOC, Visual & Table insights, Keywords.

API (programmatic):

- Endpoint: `POST /api/v1/analyze`
- Payload (URL mode): `{ "pdf_url": "https://example.com/file.pdf" }`
- Payload (upload mode): `{ "pdf_base64": "<base64>", "filename": "document.pdf" }`

Example `curl` (URL mode):

```bash
curl -N -X POST \
  -H "Content-Type: application/json" \
  -d '{"pdf_url":"https://arxiv.org/pdf/1706.03762"}' \
  http://localhost:3000/api/v1/analyze
```

Notes:
- The route streams Server-Sent Events (SSE). Using `curl -N` will show streamed events, but parsing should be done by the client for production usage.

## Security & Privacy

- SSRF mitigation: the server resolves hostnames and blocks private or local IP ranges (e.g., 127.0.0.1, 10.x.x.x, 192.168.x.x, 169.254.x.x, certain IPv6 ranges).
- File checks: verifies PDF magic bytes, enforces size limits (20MB upload, 25MB URL), and detects password-encrypted PDFs using `@pdfsmaller/pdf-decrypt`.
- Do not forward sensitive private PDFs to external AI services unless you have explicit consent and an appropriate data handling policy.

## Tests & Development Notes

- There are no automated tests included with this repository yet. For local verification:
  - Run the app and use one of the `QUICK_TESTS` links on the UI.
  - Inspect browser DevTools network tab to observe SSE events and final JSON payload.

Developer tips:

- `src/types/analysis.ts` defines the JSON contract between the backend and frontend; keep the types and server schema in sync.
- `src/config/constants.ts` contains `INITIAL_STEPS` used by the progress UI.

## Deployment

This app is built with Next.js server routes and can be deployed to any platform that supports Next.js server functions (Vercel, Render, Fly, etc.).

Recommended steps:

1. Set `GEMINI_API_KEY` in your deployment environment secrets.
2. Keep `BACKEND_URL` blank or set to your deployment origin.
3. Build and deploy via your platform's Next.js workflow.

## Contributing

Contributions are welcome. If you want to improve the project, consider:

- Adding automated tests for the server route and stream parser.
- Improving PDF parsing (e.g., leveraging `pdf-lib` to extract real page counts, table detectors).
- Adding CI, linting, and type-check workflows.

## License

This repository is provided as-is for demonstration purposes. Add a license file if you intend to open-source it publicly.

## Contact

If you'd like help improving or deploying this project, open an issue or reach out to the repository owner.

---

File: [README.md](README.md)
# PDF-Analyser

AI-powered PDF analyser — paste any public PDF URL and get a structured, multi-faceted analysis instantly.

## Architecture

This application is built as a modern full-stack web application using Next.js, eliminating the need for a separate Python backend.

- **Framework:** Next.js (App Router)
- **Styling:** Tailwind CSS + Lucide React
- **Language:** TypeScript
- **PDF Processing:** `pdf-lib` and `@pdfsmaller/pdf-decrypt`
- **AI Integration:** Google Gemini API (`@google/generative-ai`)

## Local Development

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create a `.env.local` file in the root directory and add your Gemini API key:

```env
GEMINI_API_KEY=your_gemini_key_here
```

### 3. Start the Development Server

```bash
npm run dev
```

The application will be available at: `http://localhost:3000`

## Features

- 📥 Server-side PDF downloading and parsing via Next.js API routes
- 🧠 Document classification (Research Paper, Resume, Invoice, etc.)
- 📄 Text extraction and structural analysis
- ⏱️ Reading time & difficulty estimation
- 🔑 Keywords and main topics extraction
- 🎯 Key takeaway and concise summaries
- 🛡️ API key securely stored on the server, never exposed to the browser

## Deployment

The easiest way to deploy this application is on [Vercel](https://vercel.com).

1. Push your code to GitHub.
2. Import the repository in your Vercel dashboard.
3. Add `GEMINI_API_KEY` to your Vercel Environment Variables.
4. Click **Deploy**.
