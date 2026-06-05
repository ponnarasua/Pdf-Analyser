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
