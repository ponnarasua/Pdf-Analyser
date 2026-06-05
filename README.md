# PDF-Analyser

AI-powered PDF analyser — paste any public PDF URL and get a structured, multi-faceted analysis instantly.

## Architecture

```
frontend/   Next.js 15 + Tailwind + TypeScript   (Vercel)
backend/    FastAPI + PyMuPDF + pdfplumber        (Render / local)
```

## Local Development

### 1. Backend

```bash
cd backend
pip install -r requirements.txt
```

Create a `.env` file in `backend/`:
```
GEMINI_API_KEY=your_gemini_key_here
```

Start the server:
```bash
uvicorn main:app --reload
```

Backend runs at: `http://localhost:8000`

### 2. Frontend

```bash
npm install
```

Create a `.env.local` file in the root:
```
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
GEMINI_API_KEY=your_gemini_key_here  # (used by legacy /api/analyze route)
```

Start the dev server:
```bash
npm run dev
```

Frontend runs at: `http://localhost:3000`

## Features

- 📥 Server-side PDF download and extraction
- 🧠 Document classification (Research Paper, Resume, Invoice, etc.)
- 📄 Full text extraction with PyMuPDF
- 🖼️ Image detection and AI-described visual insights
- 📊 Table detection and key findings extraction
- 📑 TOC reconstruction from PDF structure
- 🔀 Smart chunking strategy for large documents
- ⏱️ Reading time & difficulty estimation
- 🔑 Keywords and main topics
- 🎯 Key takeaway and 2-3 sentence summary
- 📡 Real-time Server-Sent Events (SSE) step progress
- 🛡️ API key never exposed to the browser

## Deployment

### Frontend → Vercel
Push to GitHub and import the repo on [vercel.com](https://vercel.com).
Set env var `NEXT_PUBLIC_BACKEND_URL` to your deployed backend URL.

### Backend → Render
Create a new Web Service, point to `backend/` folder.
Set env var `GEMINI_API_KEY`.
Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
