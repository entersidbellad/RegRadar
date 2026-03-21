"""
Google Gemini 2.5 Flash client for structured compliance analysis.
Uses the google-genai SDK (NOT google-generativeai) with JSON structured output.
Caches all responses in SQLite before returning.
"""

import os
import json
import hashlib
import uuid
from datetime import datetime, timezone
from typing import Literal, Optional

from pydantic import BaseModel, Field
from dotenv import load_dotenv

load_dotenv()

GEMINI_MODEL = "gemini-2.5-flash"


# ---- Pydantic models for structured output ----

class ComplianceRequirement(BaseModel):
    """A single compliance requirement extracted from a regulation."""
    requirement_id: str = Field(..., description="Unique identifier for this requirement")
    regulation_section: str = Field(..., description="Section of the regulation")
    requirement_text: str = Field(..., description="Original text of the requirement")
    plain_language_summary: str = Field(..., description="Plain language explanation")
    obligation_type: Literal["mandatory", "recommended", "conditional"] = Field(..., description="mandatory, recommended, or conditional")
    applicable_industries: list[str] = Field(default_factory=list, description="NAICS codes or industry names")
    deadline: Optional[str] = Field(None, description="Compliance deadline if any")
    penalty_info: Optional[str] = Field(None, description="Penalty information if specified")


class ComplianceGapAnalysis(BaseModel):
    """Full compliance gap analysis result."""
    business_name: str = Field(..., description="Name of the business analyzed")
    business_id: str = Field(..., description="ID of the business")
    regulation_name: str = Field(..., description="Title of the regulation")
    regulation_id: str = Field(..., description="ID of the regulation")
    analysis_date: str = Field(..., description="ISO date of the analysis")
    overall_status: Literal["compliant", "non_compliant", "warning", "unknown"] = Field(..., description="compliant, non_compliant, warning, or unknown")
    confidence_score: float = Field(..., description="Confidence score 0.0 to 1.0")
    requirements: list[ComplianceRequirement] = Field(default_factory=list, description="Extracted requirements")
    gaps: list[str] = Field(default_factory=list, description="Identified compliance gaps")
    recommended_actions: list[str] = Field(default_factory=list, description="Recommended remediation actions")
    summary: str = Field(..., description="Plain language summary of the analysis")


# ---- System prompt for compliance analysis ----

COMPLIANCE_SYSTEM_PROMPT = (
    "You are an environmental compliance analyst specializing in NC CAFO regulations. "
    "Analyze the following regulation text against the business profile. "
    "Identify specific compliance requirements, gaps where the business may not be "
    "meeting obligations, and recommended actions. Cite specific regulatory sections "
    "for every claim. Be specific to this facility's operation type, head count, and permit type."
)


def _build_analysis_prompt(
    business: dict,
    regulation: dict,
    relevant_chunks: list[dict],
) -> str:
    """Build the user prompt for compliance analysis."""
    chunks_text = "\n\n---\n\n".join(
        [f"[Regulation Section Excerpt {i+1}]\n{chunk['text']}" for i, chunk in enumerate(relevant_chunks)]
    )

    return f"""## Regulation Context

**Regulation:** {regulation.get('title', 'Unknown')}
**Agency:** {regulation.get('agency', 'Unknown')}
**Document Type:** {regulation.get('document_type', 'Unknown')}
**Publication Date:** {regulation.get('publication_date', 'Unknown')}
**Abstract:** {regulation.get('abstract', 'No abstract available')}

### Relevant Regulation Excerpts:

{chunks_text}

---

## Business Facility Profile

**Facility Name:** {business.get('name', 'Unknown')}
**Business ID:** {business.get('id', 'Unknown')}
**Permit Number:** {business.get('permit_number', 'N/A')}
**NAICS Code:** {business.get('naics_code', 'Unknown')} (Hog and Pig Farming)
**County:** {business.get('county', 'Unknown')}, North Carolina
**Operation Type:** {business.get('operation_type', 'Unknown')}
**Head Count:** {business.get('head_count', 'Unknown')} animals
**Permit Type:** {business.get('permit_type', 'Unknown')}
**Location:** {business.get('latitude', 'Unknown')}, {business.get('longitude', 'Unknown')}

---

## Instructions

Analyze the above regulation against this specific hog farming facility. 
Provide a structured compliance gap analysis including:
1. All requirements from the regulation that could apply to this type of facility
2. The overall compliance status (compliant, non_compliant, warning, or unknown)
3. A confidence score (0.0 to 1.0) reflecting how certain you are of the assessment
4. Specific gaps between regulation requirements and the facility's apparent status
5. Clear, actionable recommended steps the facility should take

Use the regulation_id "{regulation.get('id', '')}" and business_id "{business.get('id', '')}" 
in your response.
"""


async def analyze_compliance(
    business: dict,
    regulation: dict,
    relevant_chunks: list[dict],
) -> ComplianceGapAnalysis:
    """
    Run a Gemini compliance analysis for a business against a regulation.

    Args:
        business: Business profile dict from the database.
        regulation: Regulation dict from the database.
        relevant_chunks: List of relevant text chunks from ChromaDB.

    Returns:
        ComplianceGapAnalysis with structured results.

    Raises:
        RuntimeError: If Gemini API key is not configured or API call fails.
    """
    if not os.getenv("GEMINI_API_KEY"):
        raise RuntimeError(
            "GEMINI_API_KEY is not configured. Set it in your .env file."
        )

    from google import genai

    # Client auto-reads GEMINI_API_KEY from environment
    client = genai.Client()

    user_prompt = _build_analysis_prompt(business, regulation, relevant_chunks)

    response = client.models.generate_content(
        model=GEMINI_MODEL,
        contents=user_prompt,
        config={
            "system_instruction": COMPLIANCE_SYSTEM_PROMPT,
            "response_mime_type": "application/json",
            "response_schema": ComplianceGapAnalysis.model_json_schema(),
            "temperature": 0.2,
        },
    )

    # Parse the JSON response
    response_text = response.text
    if response_text is None:
        raise RuntimeError("Gemini returned an empty response")
    response_data = json.loads(response_text)

    # Validate through Pydantic
    analysis = ComplianceGapAnalysis(**response_data)

    return analysis


def hash_analysis(analysis: ComplianceGapAnalysis) -> str:
    """Generate a SHA256 hash of the analysis for attestation purposes."""
    analysis_json = analysis.model_dump_json(indent=None)
    return hashlib.sha256(analysis_json.encode()).hexdigest()


async def check_cache(business_id: str, regulation_id: str) -> Optional[ComplianceGapAnalysis]:
    """
    Check if we already have a cached analysis for this business+regulation pair.

    Returns:
        ComplianceGapAnalysis if found in cache, None otherwise.
    """
    from db.database import fetch_one

    row = await fetch_one(
        "SELECT full_response FROM analyses WHERE business_id = ? AND regulation_id = ? ORDER BY created_at DESC LIMIT 1",
        (business_id, regulation_id),
    )

    if row and row.get("full_response"):
        try:
            data = json.loads(row["full_response"])
            return ComplianceGapAnalysis(**data)
        except (json.JSONDecodeError, Exception):
            return None

    return None


async def cache_analysis(
    analysis: ComplianceGapAnalysis,
    business_id: str,
    regulation_id: str,
) -> str:
    """
    Cache an analysis result in the SQLite database.

    Returns:
        The analysis ID.
    """
    from db.database import execute

    analysis_id = str(uuid.uuid4())
    response_json = analysis.model_dump_json()
    response_hash = hash_analysis(analysis)

    await execute(
        """INSERT INTO analyses 
           (id, business_id, regulation_id, overall_status, confidence, 
            gaps_json, actions_json, requirements_json, summary, 
            full_response, response_hash, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            analysis_id,
            business_id,
            regulation_id,
            analysis.overall_status,
            analysis.confidence_score,
            json.dumps(analysis.gaps),
            json.dumps(analysis.recommended_actions),
            json.dumps([r.model_dump() for r in analysis.requirements]),
            analysis.summary,
            response_json,
            response_hash,
            datetime.now(timezone.utc).isoformat(),
        ),
    )

    return analysis_id
