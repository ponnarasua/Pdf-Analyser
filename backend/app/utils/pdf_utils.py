"""
PDF utility functions — downloading and generic helpers.
Kept separate from business logic so they can be tested independently.
"""
import logging
import math

import httpx

from app.core.exceptions import PDFDownloadError, NotAPDFError, PDFTooLargeError
from app.core.config import settings

logger = logging.getLogger(__name__)

_DOWNLOAD_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept": "application/pdf,*/*",
}


async def download_pdf(url: str) -> bytes:
    """
    Download a PDF from a public URL.

    Raises:
        PDFDownloadError  — network failure or non-2xx response
        NotAPDFError      — server returned HTML instead of a PDF
        PDFTooLargeError  — file exceeds settings.max_pdf_bytes
    """
    logger.info("Downloading PDF from %s", url)
    try:
        async with httpx.AsyncClient(timeout=60.0, follow_redirects=True) as client:
            resp = await client.get(url, headers=_DOWNLOAD_HEADERS)
            resp.raise_for_status()
    except httpx.HTTPStatusError as exc:
        raise PDFDownloadError(
            f"Remote server returned {exc.response.status_code} for {url}"
        ) from exc
    except httpx.RequestError as exc:
        raise PDFDownloadError(
            f"Network error while fetching {url}: {exc}"
        ) from exc

    content_type = resp.headers.get("content-type", "")
    if "text/html" in content_type:
        raise NotAPDFError(
            "The URL returned an HTML page, not a PDF. "
            "Make sure the link points directly to a .pdf file."
        )

    data = resp.content
    if len(data) > settings.max_pdf_bytes:
        raise PDFTooLargeError(
            f"PDF is {len(data) / 1_048_576:.1f} MB — limit is {settings.MAX_PDF_SIZE_MB} MB."
        )

    logger.info("Downloaded %d bytes from %s", len(data), url)
    return data


def estimate_reading_time(word_count: int) -> str:
    """Estimate reading time at 200 words-per-minute."""
    if word_count == 0:
        return "Unknown"
    minutes = math.ceil(word_count / 200)
    if minutes < 60:
        return f"{minutes} min"
    h, m = divmod(minutes, 60)
    return f"{h}h {m}min" if m else f"{h}h"


def estimate_difficulty(text_sample: str, avg_words_per_sentence: float) -> str:
    """
    Heuristic difficulty score.
    Combines average sentence length with a list of technical keywords.
    """
    _TECHNICAL_TERMS = {
        "algorithm", "neural", "transformer", "hypothesis", "methodology",
        "empirical", "coefficient", "regression", "derivative", "theorem",
        "protocol", "optimization", "stochastic", "convergence", "latency",
        "inference", "gradient", "heuristic", "bifurcation", "invariant",
    }
    text_lower = text_sample.lower()
    tech_hits = sum(1 for kw in _TECHNICAL_TERMS if kw in text_lower)

    if avg_words_per_sentence > 22 or tech_hits > 6:
        return "Advanced"
    if avg_words_per_sentence > 13 or tech_hits > 2:
        return "Intermediate"
    return "Beginner"
