"""
PDF.insight Backend
Entry point — keeps main.py thin: only app creation and middleware.
"""
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.logging import configure_logging
from app.api.v1.analyze import router as analyze_router

configure_logging()
logger = logging.getLogger(__name__)


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.APP_NAME,
        description="Server-side PDF analysis powered by Gemini 2.5 Flash",
        version=settings.APP_VERSION,
        docs_url="/docs",
        redoc_url="/redoc",
    )

    # CORS — allow the Next.js frontend (local + deployed)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Routers
    app.include_router(analyze_router, prefix="/api/v1")

    @app.get("/", tags=["Health"])
    async def root():
        return {"service": settings.APP_NAME, "version": settings.APP_VERSION, "status": "ok"}

    @app.get("/health", tags=["Health"])
    async def health():
        return {
            "status": "ok",
            "gemini_configured": bool(settings.GEMINI_API_KEY),
        }

    logger.info("Application created — %s v%s", settings.APP_NAME, settings.APP_VERSION)
    return app


app = create_app()
