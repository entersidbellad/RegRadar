"""
Google Gemini 2.5 Flash client for structured compliance analysis.
Uses the google-genai SDK (NOT google-generativeai) with JSON structured output.

Two-pass analysis pipeline:
  Pass 1 — Extract compliance requirements from regulation full text
  Pass 2 — Gap analysis: match requirements against business profile

Caches all responses in SQLite before returning.
"""

import os
import json
import uuid
import logging
import asyncio
from datetime import datetime, timezone
from typing import Literal, Optional

from pydantic import BaseModel, Field
from dotenv import load_dotenv

load_dotenv()

# Configure logging for this module
logger = logging.getLogger(__name__)

# Override with GEMINI_MODEL (e.g. "gemini-3.1-flash-lite") to run on a cheaper/newer model.
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

# Running token/call totals (read by scripts/run_live_pipeline.py to report cost).
USAGE = {"calls": 0, "input_tokens": 0, "output_tokens": 0}


# ---- Pydantic models for structured output ----

class ComplianceRequirement(BaseModel):
    """A single compliance requirement extracted from a regulation."""
    requirement_id: str = Field(..., description="Unique identifier for this requirement")
    regulation_section: str = Field(..., description="Section of the regulation")
    requirement_text: str = Field(..., description="Original text of the requirement")
    plain_language_summary: str = Field(..., description="Plain language explanation")
    obligation_type: Literal["mandatory", "recommended", "conditional"] = Field(
        ..., description="mandatory, recommended, or conditional"
    )
    applicable_industries: list[str] = Field(
        default_factory=list, description="NAICS codes or industry names"
    )
    deadline: Optional[str] = Field(None, description="Compliance deadline if any")
    penalty_info: Optional[str] = Field(None, description="Penalty information if specified")


class ComplianceGapAnalysis(BaseModel):
    """Full compliance gap analysis result."""
    business_name: str = Field(..., description="Name of the business analyzed")
    business_id: str = Field(..., description="ID of the business")
    regulation_name: str = Field(..., description="Title of the regulation")
    regulation_id: str = Field(..., description="ID of the regulation")
    analysis_date: str = Field(..., description="ISO date of the analysis")
    overall_status: Literal["compliant", "non_compliant", "warning", "unknown"] = Field(
        ..., description="compliant, non_compliant, warning, or unknown"
    )
    confidence_score: float = Field(..., description="Confidence score 0.0 to 1.0")
    requirements: list[ComplianceRequirement] = Field(
        default_factory=list, description="Extracted requirements"
    )
    gaps: list[str] = Field(default_factory=list, description="Identified compliance gaps")
    recommended_actions: list[str] = Field(
        default_factory=list, description="Recommended remediation actions"
    )
    summary: str = Field(..., description="Plain language summary of the analysis")


# ---- Extraction schema wrapper (list needs an object envelope for response_schema) ----

class _ExtractionResult(BaseModel):
    requirements: list[ComplianceRequirement]


def _get_client():
    """Lazily create the Gemini client (reads GEMINI_API_KEY from env)."""
    if not os.getenv("GEMINI_API_KEY"):
        raise RuntimeError(
            "GEMINI_API_KEY is not configured. Set it in backend/.env"
        )
    from google import genai
    return genai.Client()


async def _call_gemini(
    client,
    system_instruction: str,
    user_message: str,
    response_schema: dict,
) -> dict:
    """Make a single structured Gemini call. Returns parsed JSON dict.
    
    Note: This runs the blocking Gemini API call in a thread pool to avoid
    blocking the async event loop.
    """
    def _generate():
        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=user_message,
            config={
                "system_instruction": system_instruction,
                "response_mime_type": "application/json",
                "response_schema": response_schema,
                "temperature": 0.2,
            },
        )
        um = getattr(response, "usage_metadata", None)
        USAGE["calls"] += 1
        USAGE["input_tokens"] += (getattr(um, "prompt_token_count", 0) or 0)
        USAGE["output_tokens"] += (getattr(um, "candidates_token_count", 0) or 0) + (
            getattr(um, "thoughts_token_count", 0) or 0
        )
        text = response.text
        if not text:
            raise RuntimeError("Gemini returned an empty response")
        return json.loads(text)
    
    # Run the blocking Gemini call in a thread pool
    return await asyncio.to_thread(_generate)


async def analyze_compliance(
    business: dict,
    regulation: dict,
    relevant_chunks: list[dict],  # kept for API compatibility; not used in two-pass
) -> ComplianceGapAnalysis:
    """
    Run a two-pass Gemini compliance analysis.

    Pass 1: Extract compliance requirements from the regulation's full text.
    Pass 2: Gap analysis — match requirements against the business profile.

    Args:
        business: Business profile dict from the database.
        regulation: Regulation dict from the database (must contain full_text).
        relevant_chunks: ChromaDB chunks (unused in two-pass; kept for compat).

    Returns:
        ComplianceGapAnalysis with structured results.
    """
    from core.prompt_builder import build_extraction_prompt, build_gap_analysis_prompt
    from datetime import date

    client = _get_client()

    full_text = regulation.get("full_text") or regulation.get("abstract", "")

    # ------------------------------------------------------------------
    # Pass 1: Extract requirements
    # ------------------------------------------------------------------
    sys_extract, user_extract = build_extraction_prompt(full_text)

    raw_extraction = await _call_gemini(
        client,
        system_instruction=sys_extract,
        user_message=user_extract,
        response_schema=_ExtractionResult.model_json_schema(),
    )
    requirements_list = raw_extraction.get("requirements", [])

    # Validate requirements through Pydantic
    validated_requirements = []
    for i, req in enumerate(requirements_list):
        try:
            validated_requirements.append(ComplianceRequirement(**req))
        except Exception as e:
            # Log validation errors for debugging, but continue processing valid requirements
            logger.warning(f"Skipping malformed requirement {i}: {e}")
            continue

    requirements_json = json.dumps(
        [r.model_dump() for r in validated_requirements], indent=2
    )

    # ------------------------------------------------------------------
    # Pass 2: Gap analysis
    # ------------------------------------------------------------------
    sys_gap, user_gap = build_gap_analysis_prompt(
        requirements_json=requirements_json,
        business_profile=business,
    )

    raw_gap = await _call_gemini(
        client,
        system_instruction=sys_gap,
        user_message=user_gap,
        response_schema=ComplianceGapAnalysis.model_json_schema(),
    )

    # Ensure required IDs and date are present
    raw_gap.setdefault("business_id", business.get("id", ""))
    raw_gap.setdefault("regulation_id", regulation.get("id", ""))
    raw_gap.setdefault("analysis_date", date.today().isoformat())

    analysis = ComplianceGapAnalysis(**raw_gap)
    return analysis


async def check_cache(business_id: str, regulation_id: str) -> Optional[ComplianceGapAnalysis]:
    """
    Check SQLite for a previously cached analysis.

    Returns:
        ComplianceGapAnalysis if found, None otherwise.
    """
    from db.database import fetch_one

    row = await fetch_one(
        "SELECT full_response FROM analyses "
        "WHERE business_id = ? AND regulation_id = ? "
        "ORDER BY created_at DESC LIMIT 1",
        (business_id, regulation_id),
    )

    if row and row.get("full_response"):
        try:
            data = json.loads(row["full_response"])
            return ComplianceGapAnalysis(**data)
        except json.JSONDecodeError as e:
            logger.warning(f"Failed to parse cached analysis JSON for {business_id}/{regulation_id}: {e}")
            return None
        except Exception as e:
            logger.error(f"Validation error loading cached analysis for {business_id}/{regulation_id}: {e}")
            return None

    return None


async def cache_analysis(
    analysis: ComplianceGapAnalysis,
    business_id: str,
    regulation_id: str,
) -> str:
    """
    Cache an analysis result in SQLite.

    Returns:
        The new analysis UUID.
    """
    from db.database import execute

    analysis_id = str(uuid.uuid4())
    response_json = analysis.model_dump_json()

    await execute(
        """INSERT INTO analyses
           (id, business_id, regulation_id, overall_status, confidence,
            gaps_json, actions_json, requirements_json, summary,
            full_response, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
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
            datetime.now(timezone.utc).isoformat(),
        ),
    )

    return analysis_id
