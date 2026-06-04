import textwrap
from typing import Callable, Awaitable

from models.schemas import AnalysisResult
from services.document_processor import ProcessedDocument
from services.gemini_service import GeminiService


class ChunkAnalyzer:
    """
    Implements the chunking strategy:
    - Small PDF  (<30 pages)  → single Gemini call
    - Medium PDF (30-100 pages) → chunk by inferred sections, analyze top sections
    - Large PDF  (>100 pages) → chunk into fixed blocks, summarize each, then synthesize
    """

    def __init__(self):
        self.gemini = GeminiService()

    async def analyze(
        self,
        doc: ProcessedDocument,
        status_callback: Callable[[str], Awaitable[None]] | None = None,
    ) -> AnalysisResult:
        pages = doc.pages
        page_count = doc.metadata.pages

        # Step 1: Classify
        if status_callback:
            await status_callback("Classifying document type...")
        text_sample = "\n".join(p.content for p in pages[:5])
        doc_type = await self.gemini.classify_document(text_sample)

        if status_callback:
            await status_callback(f"Identified as: {doc_type}")

        if page_count <= 30:
            # Small: send everything as one analysis
            if status_callback:
                await status_callback("Small document — running single analysis...")
            return await self.gemini.full_analysis(doc, doc_type, status_callback)

        elif page_count <= 100:
            # Medium: limit to first 60 pages for full analysis
            if status_callback:
                await status_callback("Medium document — analyzing key sections...")
            # Trim the doc pages to the first 60 for the Gemini call
            trimmed = ProcessedDocument(
                metadata=doc.metadata,
                pages=pages[:60],
                images=doc.images,
                tables=doc.tables,
                toc=doc.toc,
                full_text="\n\n".join(p.content for p in pages[:60]),
                avg_words_per_sentence=doc.avg_words_per_sentence,
            )
            return await self.gemini.full_analysis(trimmed, doc_type, status_callback)

        else:
            # Large: chunk into blocks of 25 pages, analyze first + middle + last
            if status_callback:
                await status_callback("Large document — analyzing representative sections...")

            chunk_size = 25
            chunks = [pages[i:i + chunk_size] for i in range(0, len(pages), chunk_size)]
            # Select first, a middle, and last chunk
            selected_indices = [0]
            if len(chunks) > 2:
                selected_indices.append(len(chunks) // 2)
            selected_indices.append(len(chunks) - 1)
            selected_indices = sorted(set(selected_indices))

            chunk_texts = []
            for idx in selected_indices:
                chunk_pages = chunks[idx]
                chunk_text = "\n\n".join(p.content for p in chunk_pages)
                chunk_texts.append(chunk_text)

            combined_text = "\n\n[...]\n\n".join(chunk_texts)

            # Build a synthetic ProcessedDocument from the sampled chunks
            sampled_pages = []
            for idx in selected_indices:
                sampled_pages.extend(chunks[idx])

            sampled_doc = ProcessedDocument(
                metadata=doc.metadata,
                pages=sampled_pages,
                images=doc.images,
                tables=doc.tables,
                toc=doc.toc,
                full_text=combined_text,
                avg_words_per_sentence=doc.avg_words_per_sentence,
            )

            return await self.gemini.full_analysis(sampled_doc, doc_type, status_callback)
