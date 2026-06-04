"""Response models — what the API returns."""
from typing import Optional
from pydantic import BaseModel


class PageContent(BaseModel):
    page: int
    content: str


class ImageInfo(BaseModel):
    page: int
    image_count: int


class TableInfo(BaseModel):
    page: int
    table_count: int


class TocEntry(BaseModel):
    title: str
    page: int
    level: int = 1


class DocumentMetadata(BaseModel):
    title: Optional[str] = None
    author: Optional[str] = None
    subject: Optional[str] = None
    pages: int = 0
    word_count: int = 0
    total_images: int = 0
    total_tables: int = 0
    estimated_reading_time: Optional[str] = None
    difficulty: Optional[str] = None


class AnalysisResponse(BaseModel):
    """The complete structured analysis returned to the frontend."""
    documentType: str
    title: str
    authors: str
    summary: str
    keyTakeaway: str
    keywords: list[str] = []
    difficulty: str = "Intermediate"
    estimatedReadingTime: str = ""
    mainTopics: list[str] = []
    imageInsights: list[str] = []
    tableInsights: list[str] = []
    toc: list[TocEntry] = []
    metadata: DocumentMetadata = DocumentMetadata()
