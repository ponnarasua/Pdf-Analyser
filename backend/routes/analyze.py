import json
import asyncio
from typing import AsyncGenerator

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from models.schemas import AnalyzeRequest
from services.document_processor import DocumentProcessor
from services.chunk_analyzer import ChunkAnalyzer
from utils.helpers import download_pdf

router = APIRouter()
processor = DocumentProcessor()
analyzer = ChunkAnalyzer()


def sse_event(data: dict) -> str:
    """Format a Server-Sent Event string."""
    return f"data: {json.dumps(data)}\n\n"


@router.post("/analyze")
async def analyze_pdf(request: AnalyzeRequest):
    """
    Main analysis endpoint. Streams Server-Sent Events (SSE) with
    step-by-step status updates, then the final JSON result.
    """

    async def stream() -> AsyncGenerator[str, None]:
        try:
            # --- Step 1: Validate URL ---
            url = request.pdf_url.strip()
            if not url.startswith(("http://", "https://")):
                yield sse_event({"type": "error", "message": "Invalid URL. Must start with http:// or https://"})
                return

            yield sse_event({"type": "step", "step": "Downloading PDF", "status": "active"})

            # --- Step 2: Download PDF ---
            try:
                pdf_bytes = await download_pdf(url)
            except Exception as e:
                yield sse_event({"type": "error", "message": f"Download failed: {str(e)}"})
                return

            if len(pdf_bytes) > 50 * 1024 * 1024:  # 50 MB limit
                yield sse_event({"type": "error", "message": "PDF too large (max 50 MB)."})
                return

            yield sse_event({"type": "step", "step": "Downloading PDF", "status": "done"})
            yield sse_event({"type": "step", "step": "Extracting Text", "status": "active"})

            # --- Step 3: Extract content ---
            try:
                doc = await asyncio.get_event_loop().run_in_executor(
                    None, processor.process, pdf_bytes
                )
            except Exception as e:
                yield sse_event({"type": "error", "message": f"PDF extraction failed: {str(e)}. The file may be corrupted or password-protected."})
                return

            yield sse_event({"type": "step", "step": "Extracting Text", "status": "done"})
            yield sse_event({"type": "step", "step": "Detecting Tables & Images", "status": "active"})
            await asyncio.sleep(0.1)  # allow UI to update

            yield sse_event({
                "type": "meta",
                "pages": doc.metadata.pages,
                "images": doc.metadata.total_images,
                "tables": doc.metadata.total_tables,
            })

            yield sse_event({"type": "step", "step": "Detecting Tables & Images", "status": "done"})
            yield sse_event({"type": "step", "step": "AI Analysis", "status": "active"})

            # --- Step 4: AI Analysis with status streaming ---
            status_updates = []

            async def status_callback(msg: str):
                yield sse_event({"type": "status", "message": msg})

            # Collect analysis result
            try:
                result = await analyzer.analyze(doc, status_callback=None)
            except Exception as e:
                yield sse_event({"type": "error", "message": f"AI analysis failed: {str(e)}"})
                return

            yield sse_event({"type": "step", "step": "AI Analysis", "status": "done"})
            yield sse_event({"type": "step", "step": "Finalizing", "status": "active"})
            await asyncio.sleep(0.2)
            yield sse_event({"type": "step", "step": "Finalizing", "status": "done"})

            # --- Step 5: Send result ---
            yield sse_event({"type": "result", "data": result.model_dump()})

        except Exception as e:
            yield sse_event({"type": "error", "message": f"Unexpected error: {str(e)}"})

    return StreamingResponse(
        stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Access-Control-Allow-Origin": "*",
        },
    )
