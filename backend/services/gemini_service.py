import os
import json
import textwrap
from typing import Callable, Awaitable

import google.generativeai as genai
from dotenv import load_dotenv

from models.schemas import AnalysisResult, DocumentMetadata, TocEntry
from services.document_processor import ProcessedDocument

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
genai.configure(api_key=GEMINI_API_KEY)

# Use gemini-2.5-flash — best for structured extraction with large contexts
MODEL = "gemini-2.5-flash-preview-05-20"

CLASSIFICATION_TYPES = [
    "Research Paper",
    "Resume",
    "Invoice",
    "Report",
    "User Manual",
    "Whitepaper",
    "Legal Document",
    "Slide Deck",
    "Book Chapter",
    "Other",
]


class GeminiService:
    def __init__(self):
        self.model = genai.GenerativeModel(MODEL)

    async def classify_document(self, text_sample: str) -> str:
        """Phase 4: Classify document type before deeper analysis."""
        prompt = textwrap.dedent(f"""
            You are a document classification expert.
            
            Based on this text excerpt, classify the document into EXACTLY one of these categories:
            {', '.join(CLASSIFICATION_TYPES)}
            
            Respond with ONLY the category name, nothing else.
            
            Text excerpt:
            {text_sample[:2000]}
        """).strip()

        try:
            response = self.model.generate_content(prompt)
            doc_type = response.text.strip()
            # Validate it's one of our known types
            if doc_type in CLASSIFICATION_TYPES:
                return doc_type
            # Fuzzy fallback
            for t in CLASSIFICATION_TYPES:
                if t.lower() in doc_type.lower():
                    return t
            return "Other"
        except Exception:
            return "Other"

    async def analyze_chunk(self, text: str, doc_type: str, chunk_num: int, total_chunks: int) -> dict:
        """Analyze a single text chunk."""
        prompt = textwrap.dedent(f"""
            You are an expert document analyst. This is chunk {chunk_num} of {total_chunks} from a {doc_type}.

            Analyze this text and respond with ONLY a valid JSON object with these fields:
            - "summary": 2-3 sentence summary of this section
            - "keyPoints": array of up to 5 key points from this section
            - "topics": array of up to 5 main topics mentioned
            - "keywords": array of up to 8 important keywords or technical terms

            Text:
            {text[:8000]}

            Respond ONLY with a JSON object. No markdown, no explanation.
        """).strip()

        try:
            response = self.model.generate_content(prompt)
            raw = response.text.strip()
            # Strip any markdown fences if model adds them
            if raw.startswith("```"):
                raw = raw.split("```")[1]
                if raw.startswith("json"):
                    raw = raw[4:]
            return json.loads(raw)
        except Exception as e:
            return {"summary": "", "keyPoints": [], "topics": [], "keywords": []}

    async def full_analysis(
        self,
        doc: ProcessedDocument,
        doc_type: str,
        status_callback: Callable[[str], Awaitable[None]] | None = None,
    ) -> AnalysisResult:
        """
        Run the full analysis pipeline:
        - Classify (already done, passed in as doc_type)
        - Chunk-aware analysis
        - Image insights
        - Table insights
        - Final structured synthesis
        """

        # Build page-structured text for the synthesis prompt
        pages_text = "\n\n".join(
            f"[Page {p.page}]\n{p.content}" for p in doc.pages[:80]
        )

        # Build context about images and tables
        image_context = ""
        if doc.images:
            image_context = f"\nDocument contains {doc.metadata.total_images} images across pages: " + \
                ", ".join(str(i.page) for i in doc.images[:10])

        table_context = ""
        if doc.tables:
            table_context = f"\nDocument contains {doc.metadata.total_tables} tables across pages: " + \
                ", ".join(str(t.page) for t in doc.tables[:10])

        toc_context = ""
        if doc.toc:
            toc_context = "\nDocument table of contents:\n" + \
                "\n".join(f"  {'  ' * (e.level - 1)}{e.title} (p.{e.page})" for e in doc.toc[:20])

        synthesis_prompt = textwrap.dedent(f"""
            You are an expert document analyst. Analyze the following {doc_type} and return a structured JSON object.

            {toc_context}
            {image_context}
            {table_context}

            Document content:
            {pages_text[:30000]}

            Return ONLY a valid JSON object with these exact fields:
            {{
              "title": "the document title",
              "authors": "author names as a single string (e.g., 'Vaswani et al.' or 'Unknown')",
              "summary": "2-3 sentence summary of the entire document",
              "keyTakeaway": "the single most important insight or finding",
              "keywords": ["keyword1", "keyword2", ...],  // 5-10 keywords
              "mainTopics": ["topic1", "topic2", ...],    // 3-6 main topics
              "imageInsights": ["description of what images show, e.g. 'Architecture diagram showing encoder-decoder structure'", ...],  // one per image group, max 5
              "tableInsights": ["key finding from a table, e.g. 'Table 2 shows BLEU scores comparing models'", ...],  // max 5
              "difficulty": "Beginner | Intermediate | Advanced"
            }}

            Rules:
            - imageInsights: infer what images likely contain based on surrounding text and context. If no images, return [].
            - tableInsights: infer what tables contain based on nearby text. If no tables, return [].
            - All fields must be present.
            - Respond ONLY with the JSON object. No markdown fences.
        """).strip()

        if status_callback:
            await status_callback("Running AI analysis with Gemini...")

        try:
            response = self.model.generate_content(synthesis_prompt)
            raw = response.text.strip()
            if raw.startswith("```"):
                raw = raw.split("```")[1]
                if raw.startswith("json"):
                    raw = raw[4:]
            data = json.loads(raw)
        except Exception as e:
            # Fallback with minimal data
            data = {
                "title": doc.metadata.title or "Unknown",
                "authors": doc.metadata.author or "Unknown",
                "summary": "Unable to generate summary.",
                "keyTakeaway": "Analysis failed. Please retry.",
                "keywords": [],
                "mainTopics": [],
                "imageInsights": [],
                "tableInsights": [],
                "difficulty": doc.metadata.difficulty or "Intermediate",
            }

        return AnalysisResult(
            documentType=doc_type,
            title=data.get("title") or doc.metadata.title or "Unknown",
            authors=data.get("authors") or doc.metadata.author or "Unknown",
            summary=data.get("summary", ""),
            keyTakeaway=data.get("keyTakeaway", ""),
            keywords=data.get("keywords", [])[:10],
            mainTopics=data.get("mainTopics", [])[:6],
            imageInsights=data.get("imageInsights", [])[:5],
            tableInsights=data.get("tableInsights", [])[:5],
            difficulty=data.get("difficulty", doc.metadata.difficulty or "Intermediate"),
            estimatedReadingTime=doc.metadata.estimated_reading_time or "",
            toc=doc.toc,
            metadata=doc.metadata,
        )
