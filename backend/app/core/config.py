"""
Centralised settings management via pydantic-settings.
All environment variables are read here — nowhere else in the codebase.
"""
from functools import lru_cache
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # ── App ──────────────────────────────────────────────────────────────────
    APP_NAME: str = "PDF.insight API"
    APP_VERSION: str = "2.0.0"
    DEBUG: bool = False

    # ── Gemini ───────────────────────────────────────────────────────────────
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.5-flash-preview-05-20"

    # ── PDF limits ───────────────────────────────────────────────────────────
    MAX_PDF_SIZE_MB: int = 50          # hard limit
    SMALL_PDF_PAGES: int = 30          # single-shot threshold
    MEDIUM_PDF_PAGES: int = 100        # section-chunking threshold

    # ── CORS ─────────────────────────────────────────────────────────────────
    FRONTEND_URL: str = "http://localhost:3000"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    @property
    def allowed_origins(self) -> List[str]:
        return [
            "http://localhost:3000",
            "http://localhost:3001",
            self.FRONTEND_URL,
        ]

    @property
    def max_pdf_bytes(self) -> int:
        return self.MAX_PDF_SIZE_MB * 1024 * 1024


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Cached settings singleton — import `settings` instead of calling this directly."""
    return Settings()


settings: Settings = get_settings()
