"""
PDF Chunker Service.
Implements chunking and sampling strategies for processing
different document sizes (small, medium, large) to stay within LLM context
limits while preserving key content structure.
"""
import logging
from typing import List

from app.core.config import settings
from app.services.pdf.extractor import ProcessedDocument

logger = logging.getLogger(__name__)


class PDFChunker:
    """
    Handles page chunking and sampling strategies based on page counts:
    - Small PDF (<= 30 pages): Keep the document fully intact.
    - Medium PDF (30-100 pages): Slice to first 60 pages.
    - Large PDF (> 100 pages): Samples representative sections (first, middle, last 25-page blocks).
    """

    def prepare_for_analysis(self, doc: ProcessedDocument) -> ProcessedDocument:
        page_count = doc.metadata.pages
        logger.info("Chunking PDF with page count: %d", page_count)

        if page_count <= settings.SMALL_PDF_PAGES:
            logger.info("Small document detected — keeping full document content")
            return doc

        elif page_count <= settings.MEDIUM_PDF_PAGES:
            logger.info("Medium document detected — trimming to first 60 pages")
            trimmed_pages = doc.pages[:60]
            full_text = "\n\n".join(p.content for p in trimmed_pages)
            return ProcessedDocument(
                metadata=doc.metadata,
                pages=trimmed_pages,
                images=doc.images,
                tables=doc.tables,
                toc=doc.toc,
                full_text=full_text,
                avg_words_per_sentence=doc.avg_words_per_sentence,
            )

        else:
            logger.info("Large document detected — extracting first, middle, and last page samples")
            chunk_size = 25
            pages = doc.pages
            chunks = [pages[i : i + chunk_size] for i in range(0, len(pages), chunk_size)]

            # Select first, middle, and last chunk indexes
            selected_indices = [0]
            if len(chunks) > 2:
                selected_indices.append(len(chunks) // 2)
            selected_indices.append(len(chunks) - 1)
            selected_indices = sorted(list(set(selected_indices)))

            sampled_pages = []
            chunk_texts = []
            for idx in selected_indices:
                chunk_pages = chunks[idx]
                sampled_pages.extend(chunk_pages)
                chunk_texts.append("\n\n".join(p.content for p in chunk_pages))

            combined_text = "\n\n[...] [Truncated pages for token limits] [...]\n\n".join(chunk_texts)

            return ProcessedDocument(
                metadata=doc.metadata,
                pages=sampled_pages,
                images=doc.images,
                tables=doc.tables,
                toc=doc.toc,
                full_text=combined_text,
                avg_words_per_sentence=doc.avg_words_per_sentence,
            )
