"""Request models — what the API accepts."""
from pydantic import BaseModel, field_validator, HttpUrl


class AnalyzeRequest(BaseModel):
    pdf_url: str

    @field_validator("pdf_url")
    @classmethod
    def must_be_http(cls, v: str) -> str:
        v = v.strip()
        if not v.startswith(("http://", "https://")):
            raise ValueError("pdf_url must start with http:// or https://")
        return v
