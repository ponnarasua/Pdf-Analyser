import io
from dataclasses import dataclass, field
from typing import Optional

import fitz  # PyMuPDF
import pdfplumber

from models.schemas import DocumentMetadata, ImageInfo, PageContent, TableInfo, TocEntry
from utils.helpers import estimate_difficulty, estimate_reading_time


@dataclass
class ProcessedDocument:
    metadata: DocumentMetadata
    pages: list[PageContent]
    images: list[ImageInfo]
    tables: list[TableInfo]
    toc: list[TocEntry]
    full_text: str
    avg_words_per_sentence: float = 0.0


class DocumentProcessor:
    """
    Extracts metadata, text, images, tables, and TOC from a PDF byte stream
    using PyMuPDF for structure/images and pdfplumber for precise table extraction.
    """

    def process(self, pdf_bytes: bytes) -> ProcessedDocument:
        fitz_doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        plumber_doc = pdfplumber.open(io.BytesIO(pdf_bytes))

        metadata = self._extract_metadata(fitz_doc)
        pages = self._extract_text(fitz_doc)
        images = self._extract_images(fitz_doc)
        tables = self._extract_tables(plumber_doc)
        toc = self._extract_toc(fitz_doc)

        full_text = "\n\n".join(p.content for p in pages)
        word_count = len(full_text.split())
        sentence_count = max(1, full_text.count(".") + full_text.count("!") + full_text.count("?"))
        avg_wps = word_count / sentence_count

        metadata.word_count = word_count
        metadata.total_images = sum(i.image_count for i in images)
        metadata.total_tables = sum(t.table_count for t in tables)
        metadata.estimated_reading_time = estimate_reading_time(word_count)
        metadata.difficulty = estimate_difficulty(full_text[:3000], avg_wps)

        fitz_doc.close()
        plumber_doc.close()

        return ProcessedDocument(
            metadata=metadata,
            pages=pages,
            images=images,
            tables=tables,
            toc=toc,
            full_text=full_text,
            avg_words_per_sentence=avg_wps,
        )

    def _extract_metadata(self, doc: fitz.Document) -> DocumentMetadata:
        raw = doc.metadata or {}
        return DocumentMetadata(
            title=raw.get("title") or None,
            author=raw.get("author") or None,
            subject=raw.get("subject") or None,
            pages=doc.page_count,
        )

    def _extract_text(self, doc: fitz.Document) -> list[PageContent]:
        pages = []
        for i, page in enumerate(doc, start=1):
            text = page.get_text("text").strip()
            if text:
                pages.append(PageContent(page=i, content=text))
        return pages

    def _extract_images(self, doc: fitz.Document) -> list[ImageInfo]:
        results = []
        for i, page in enumerate(doc, start=1):
            img_list = page.get_images(full=False)
            if img_list:
                results.append(ImageInfo(page=i, image_count=len(img_list)))
        return results

    def _extract_tables(self, doc: pdfplumber.PDF) -> list[TableInfo]:
        results = []
        for i, page in enumerate(doc.pages, start=1):
            tables = page.extract_tables()
            count = len([t for t in tables if t])  # filter empty
            if count:
                results.append(TableInfo(page=i, table_count=count))
        return results

    def _extract_toc(self, doc: fitz.Document) -> list[TocEntry]:
        raw_toc = doc.get_toc(simple=True)  # [[level, title, page], ...]
        entries = []
        for level, title, page in raw_toc:
            if title and title.strip():
                entries.append(TocEntry(title=title.strip(), page=max(1, page), level=level))
        return entries[:50]  # cap at 50 entries
