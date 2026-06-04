"""
PDF Analysis API Router.
Streams analysis steps, status updates, and the final JSON response
via Server-Sent Events (SSE).
"""
import asyncio
import json
import logging
from typing import AsyncGenerator

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from app.core.exceptions import PDFInsightError, InvalidURLError
from app.models.request import AnalyzeRequest
from app.services.pdf import PDFExtractor, PDFChunker
from app.services.ai import GeminiService
from app.utils.pdf_utils import download_pdf

logger = logging.getLogger(__name__)
router = APIRouter()

# Instantiate services
extractor = PDFExtractor()
chunker = PDFChunker()
gemini = GeminiService()


def sse_event(data: dict) -> str:
    """Format a Server-Sent Event string."""
    return f"data: {json.dumps(data)}\n\n"


@router.post("/analyze", summary="Analyze PDF from URL")
async def analyze_pdf(request: AnalyzeRequest) -> StreamingResponse:
    """
    Accepts a PDF URL and streams step-by-step processing status,
    eventual metadata, and a detailed Gemini-extracted JSON analysis.
    """
    url = request.pdf_url.strip()
    logger.info("Received PDF analysis request for URL: %s", url)

    async def stream() -> AsyncGenerator[str, None]:
        try:
            # --- Step 1: Downloading PDF ---
            yield sse_event({"type": "step", "step": "Downloading PDF", "status": "active"})
            try:
                pdf_bytes = await download_pdf(url)
            except PDFInsightError as exc:
                yield sse_event({"type": "error", "message": exc.message})
                return
            except Exception as exc:
                logger.error("Unexpected error downloading PDF: %s", exc)
                yield sse_event({"type": "error", "message": "Failed to download PDF due to an unexpected error."})
                return

            yield sse_event({"type": "step", "step": "Downloading PDF", "status": "done"})

            # --- Step 2: Extracting Text ---
            yield sse_event({"type": "step", "step": "Extracting Text", "status": "active"})
            try:
                # Run the extraction in a separate thread because it's CPU-bound and synchronous
                doc = await asyncio.get_event_loop().run_in_executor(
                    None, extractor.extract, pdf_bytes
                )
            except PDFInsightError as exc:
                yield sse_event({"type": "error", "message": exc.message})
                return
            except Exception as exc:
                logger.error("Unexpected error extracting PDF: %s", exc)
                yield sse_event({"type": "error", "message": "Failed to parse PDF document content."})
                return

            yield sse_event({"type": "step", "step": "Extracting Text", "status": "done"})

            # --- Step 3: Detecting Tables & Images ---
            yield sse_event({"type": "step", "step": "Detecting Tables & Images", "status": "active"})
            await asyncio.sleep(0.1)  # brief pause to allow frontend step transitions to render smoothly

            # Yield metadata details to the client
            yield sse_event({
                "type": "meta",
                "pages": doc.metadata.pages,
                "images": doc.metadata.total_images,
                "tables": doc.metadata.total_tables,
            })

            yield sse_event({"type": "step", "step": "Detecting Tables & Images", "status": "done"})

            # --- Step 4: AI Analysis ---
            yield sse_event({"type": "step", "step": "AI Analysis", "status": "active"})

            queue = asyncio.Queue()

            async def run_ai_pipeline():
                try:
                    # Classify type
                    text_sample = "\n".join(p.content for p in doc.pages[:5])
                    doc_type = await gemini.classify_document(text_sample)
                    queue.put_nowait({"type": "status", "message": f"Document identified as: {doc_type}"})

                    # Chunk and sample appropriately
                    sampled_doc = chunker.prepare_for_analysis(doc)

                    # Run final structured summary synthesis
                    res = await gemini.full_analysis(
                        sampled_doc,
                        doc_type,
                        status_callback=lambda msg: queue.put_nowait({"type": "status", "message": msg})
                    )
                    queue.put_nowait({"type": "result", "data": res.model_dump()})
                except Exception as e:
                    logger.error("AI pipeline background task failed: %s", e)
                    queue.put_nowait({"type": "error_exc", "exception": e})

            # Start pipeline in the background
            analysis_task = asyncio.create_task(run_ai_pipeline())

            # Read from the queue and stream events to client
            while not analysis_task.done() or not queue.empty():
                try:
                    item = await asyncio.wait_for(queue.get(), timeout=0.2)
                    
                    if item["type"] == "status":
                        yield sse_event(item)
                    elif item["type"] == "result":
                        yield sse_event({"type": "step", "step": "AI Analysis", "status": "done"})
                        
                        # --- Step 5: Finalizing ---
                        yield sse_event({"type": "step", "step": "Finalizing", "status": "active"})
                        await asyncio.sleep(0.2)
                        yield sse_event({"type": "step", "step": "Finalizing", "status": "done"})
                        
                        # Yield the final payload
                        yield sse_event(item)
                        return
                    elif item["type"] == "error_exc":
                        raise item["exception"]
                except asyncio.TimeoutError:
                    continue

        except PDFInsightError as exc:
            yield sse_event({"type": "error", "message": exc.message})
        except Exception as exc:
            logger.error("Unexpected error in SSE stream: %s", exc)
            yield sse_event({"type": "error", "message": "An unexpected server error occurred during analysis."})

    return StreamingResponse(
        stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Access-Control-Allow-Origin": "*",
        },
    )
