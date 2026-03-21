"""
Federal Register API client.
Fetches EPA regulations from the Federal Register public API.
"""

from typing import Optional
import httpx
from pydantic import BaseModel, Field


FEDERAL_REGISTER_API_BASE = "https://www.federalregister.gov/api/v1"


class RegulationDocument(BaseModel):
    """Pydantic model for a Federal Register regulation document."""
    document_number: str = Field(..., description="Federal Register document number")
    title: str = Field(..., description="Document title")
    agency_names: list[str] = Field(default_factory=list, description="List of agency names")
    type: str = Field(default="RULE", description="Document type (RULE, PROPOSED_RULE, NOTICE)")
    publication_date: str = Field(..., description="Publication date (YYYY-MM-DD)")
    effective_on: Optional[str] = Field(None, description="Effective date")
    abstract: Optional[str] = Field(None, description="Document abstract")
    raw_text_url: Optional[str] = Field(None, description="URL to plaintext version")
    html_url: Optional[str] = Field(None, description="URL to HTML version")
    body_html_url: Optional[str] = Field(None, description="URL to body HTML")
    cfr_references: list[dict] = Field(default_factory=list, description="CFR references")


class FederalRegisterClient:
    """Async client for the Federal Register API."""

    def __init__(self):
        self.base_url = FEDERAL_REGISTER_API_BASE

    async def search_regulations(
        self,
        agency: str = "environmental-protection-agency",
        doc_type: str = "RULE",
        per_page: int = 20,
        page: int = 1,
        order: str = "newest",
    ) -> dict:
        """
        Search for regulations on the Federal Register.

        Args:
            agency: Agency slug for filtering.
            doc_type: Document type (RULE, PROPOSED_RULE, NOTICE).
            per_page: Number of results per page.
            page: Page number.
            order: Sort order ('newest' or 'oldest').

        Returns:
            Dict with 'results' (list of RegulationDocument) and 'total_pages', 'count'.
        """
        params = {
            "conditions[agencies][]": agency,
            "conditions[type][]": doc_type,
            "per_page": per_page,
            "page": page,
            "order": order,
            "fields[]": [
                "document_number",
                "title",
                "agency_names",
                "type",
                "publication_date",
                "effective_on",
                "abstract",
                "raw_text_url",
                "html_url",
                "body_html_url",
                "cfr_references",
            ],
        }

        async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
            response = await client.get(
                f"{self.base_url}/documents.json",
                params=params,
            )
            response.raise_for_status()
            data = response.json()

        results = []
        for item in data.get("results", []):
            try:
                doc = RegulationDocument(**item)
                results.append(doc)
            except Exception:
                # Skip malformed entries
                continue

        return {
            "results": results,
            "total_pages": data.get("total_pages", 1),
            "count": data.get("count", len(results)),
        }

    async def fetch_full_text(self, raw_text_url: str) -> str:
        """
        Fetch the full plaintext content of a regulation document.

        Args:
            raw_text_url: URL to the raw text version of the document.

        Returns:
            The full text content as a string.
        """
        if not raw_text_url:
            return ""

        async with httpx.AsyncClient(timeout=60.0, follow_redirects=True) as client:
            response = await client.get(raw_text_url)
            response.raise_for_status()
            return response.text

    def to_db_record(self, doc: RegulationDocument) -> dict:
        """
        Convert a RegulationDocument to a dict suitable for database insertion.
        """
        import json
        from datetime import datetime, timezone

        agency = "EPA" if any("Environmental Protection" in a for a in doc.agency_names) else doc.agency_names[0] if doc.agency_names else "UNKNOWN"

        return {
            "id": doc.document_number,
            "title": doc.title,
            "agency": agency,
            "document_type": doc.type,
            "publication_date": doc.publication_date,
            "effective_date": doc.effective_on,
            "abstract": doc.abstract or "",
            "raw_text_url": doc.raw_text_url or "",
            "full_text": "",  # To be populated by fetch_full_text
            "cfr_references": json.dumps(
                [ref for ref in doc.cfr_references] if doc.cfr_references else []
            ),
            "ingested_at": datetime.now(timezone.utc).isoformat(),
        }
