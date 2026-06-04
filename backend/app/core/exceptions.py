"""
Custom exception hierarchy for PDF.insight.

Raising typed exceptions instead of plain ValueError/RuntimeError lets
route handlers catch and map errors to meaningful HTTP responses without
using bare try/except blocks that swallow everything.
"""
from http import HTTPStatus


class PDFInsightError(Exception):
    """Base exception for all domain errors."""
    status_code: int = 500
    message: str = "An unexpected error occurred."

    def __init__(self, message: str | None = None):
        self.message = message or self.__class__.message
        super().__init__(self.message)


class InvalidURLError(PDFInsightError):
    """The provided URL is syntactically invalid or uses an unsupported scheme."""
    status_code = 400
    message = "Invalid URL. Must start with http:// or https://"


class PDFDownloadError(PDFInsightError):
    """The remote server could not be reached or returned a non-200 response."""
    status_code = 400
    message = "Failed to download the PDF from the provided URL."


class NotAPDFError(PDFInsightError):
    """The URL returned HTML or some other non-PDF content type."""
    status_code = 400
    message = "The URL did not return a PDF document."


class PDFTooLargeError(PDFInsightError):
    """The PDF exceeds the configured size limit."""
    status_code = 413
    message = "The PDF file is too large to process."


class PDFExtractionError(PDFInsightError):
    """PyMuPDF or pdfplumber could not parse the file (corrupt / password-protected)."""
    status_code = 422
    message = "Could not extract content from the PDF. It may be corrupted or password-protected."


class AIAnalysisError(PDFInsightError):
    """Gemini API returned an error or produced unparseable output."""
    status_code = 502
    message = "The AI analysis service encountered an error. Please try again."


class APIKeyMissingError(PDFInsightError):
    """GEMINI_API_KEY is not configured on the server."""
    status_code = 500
    message = "The Gemini API key is not configured on the server."
