import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from routes.analyze import router as analyze_router

load_dotenv()

app = FastAPI(
    title="PDF.insight Backend",
    description="Server-side PDF analysis powered by Gemini 2.5 Flash",
    version="2.0.0",
)

# Allow requests from the Next.js frontend (local + Vercel)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        os.getenv("FRONTEND_URL", ""),
        # Vercel preview URLs — allow all
        "https://*.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(analyze_router, prefix="/api")


@app.get("/")
async def health():
    return {"status": "ok", "service": "PDF.insight API v2"}


@app.get("/health")
async def health_check():
    api_key = os.getenv("GEMINI_API_KEY", "")
    return {
        "status": "ok",
        "gemini_configured": bool(api_key),
    }
