"""
Structured logging configuration.
Sets up a single root logger with a consistent format that
integrates cleanly with uvicorn's log output.
"""
import logging
import sys


def configure_logging(level: str = "INFO") -> None:
    """Call once at application startup (in main.py / create_app)."""
    fmt = "%(asctime)s | %(levelname)-8s | %(name)s — %(message)s"
    date_fmt = "%Y-%m-%d %H:%M:%S"

    logging.basicConfig(
        level=getattr(logging, level.upper(), logging.INFO),
        format=fmt,
        datefmt=date_fmt,
        stream=sys.stdout,
    )

    # Silence noisy third-party loggers
    for noisy in ("httpx", "httpcore", "watchfiles"):
        logging.getLogger(noisy).setLevel(logging.WARNING)
