import httpx
import math


async def download_pdf(url: str) -> bytes:
    """Download a PDF from a public URL and return raw bytes."""
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/120.0.0.0 Safari/537.36"
        ),
        "Accept": "application/pdf,*/*",
    }
    async with httpx.AsyncClient(timeout=60.0, follow_redirects=True) as client:
        resp = await client.get(url, headers=headers)
        resp.raise_for_status()
        content_type = resp.headers.get("content-type", "")
        if "text/html" in content_type:
            raise ValueError(
                "The URL returned an HTML page, not a PDF. "
                "Ensure the link points directly to a .pdf file."
            )
        return resp.content


def estimate_reading_time(word_count: int) -> str:
    """Estimate reading time based on average 200 words per minute."""
    if word_count == 0:
        return "Unknown"
    minutes = math.ceil(word_count / 200)
    if minutes < 60:
        return f"{minutes} min"
    hours = minutes // 60
    remaining = minutes % 60
    return f"{hours}h {remaining}min" if remaining else f"{hours}h"


def estimate_difficulty(text_sample: str, avg_words_per_sentence: float) -> str:
    """
    Heuristic difficulty estimate based on average sentence length.
    <10 words → Beginner, 10-20 → Intermediate, >20 → Advanced
    """
    technical_keywords = [
        "algorithm", "neural", "transformer", "hypothesis", "methodology",
        "empirical", "coefficient", "regression", "derivative", "theorem",
        "protocol", "framework", "optimization", "stochastic", "convergence",
    ]
    text_lower = text_sample.lower()
    tech_count = sum(1 for kw in technical_keywords if kw in text_lower)

    if avg_words_per_sentence > 22 or tech_count > 6:
        return "Advanced"
    elif avg_words_per_sentence > 13 or tech_count > 2:
        return "Intermediate"
    else:
        return "Beginner"
