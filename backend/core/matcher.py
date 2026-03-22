"""
Business-to-regulation matching orchestrator.
Coordinates the full compliance analysis pipeline:
  1. Fetch business and regulation from DB
  2. Check file-based cache (backend/cached_responses/) — fastest path
  3. Check SQLite cache for existing analysis
  4. Query ChromaDB for relevant chunks (context for Gemini)
  5. Call Gemini two-pass analysis (extract → gap analysis)
  6. Cache the result in SQLite
"""

import json
import os
from pathlib import Path

from db.database import fetch_one
from core.indexing import search as vector_search
from core.gemini_client import (
    analyze_compliance,
    check_cache,
    cache_analysis,
    ComplianceGapAnalysis,
)

# File-based cache lives one level up from backend/ (i.e. backend/cached_responses/)
_BACKEND_DIR = Path(__file__).parent.parent
_FILE_CACHE_DIR = _BACKEND_DIR / "cached_responses"


def _file_cache_path(business_id: str, regulation_id: str) -> Path:
    """
    Construct the expected filename for a file-based cached response.
    Matches the naming convention used by prompts/test_prompts.py:
      {business_id_no_hyphens[:12]}_{regulation_id_underscored}.json
    """
    safe_biz = business_id.replace("-", "")[:12]
    safe_reg = regulation_id.replace("-", "_")
    return _FILE_CACHE_DIR / f"{safe_biz}_{safe_reg}.json"


def _load_file_cache(business_id: str, regulation_id: str) -> ComplianceGapAnalysis | None:
    """
    Check backend/cached_responses/ for a pre-generated analysis JSON.
    Returns a ComplianceGapAnalysis if found and valid, None otherwise.
    """
    path = _file_cache_path(business_id, regulation_id)
    if not path.exists():
        return None
    try:
        with open(path) as f:
            data = json.load(f)
        # The cached file has a 'gap_analysis' key (written by test_prompts.py)
        gap = data.get("gap_analysis") or data
        return ComplianceGapAnalysis(**gap)
    except Exception:
        return None


async def match_business_to_regulation(
    business_id: str,
    regulation_id: str,
    force_refresh: bool = False,
) -> tuple[ComplianceGapAnalysis, str]:
    """
    Run a full compliance analysis for a business against a regulation.

    Cache hierarchy (fastest → slowest):
      1. File cache  (backend/cached_responses/)
      2. SQLite cache (analyses table)
      3. Live Gemini two-pass analysis

    Args:
        business_id: The business ID to analyze.
        regulation_id: The regulation ID to analyze against.
        force_refresh: If True, bypass all caches and generate a fresh analysis.

    Returns:
        Tuple of (ComplianceGapAnalysis, analysis_id).

    Raises:
        ValueError: If business or regulation not found.
        RuntimeError: If Gemini API fails.
    """
    # 1. Fetch business from DB
    business = await fetch_one(
        "SELECT * FROM businesses WHERE id = ?", (business_id,)
    )
    if not business:
        raise ValueError(f"Business not found: {business_id}")

    # 2. Fetch regulation from DB
    regulation = await fetch_one(
        "SELECT * FROM regulations WHERE id = ?", (regulation_id,)
    )
    if not regulation:
        raise ValueError(f"Regulation not found: {regulation_id}")

    if not force_refresh:
        # 3. Check file-based cache first (pre-generated, no DB write needed)
        file_cached = _load_file_cache(business_id, regulation_id)
        if file_cached:
            return file_cached, "file-cache"

        # 4. Check SQLite cache
        sql_cached = await check_cache(business_id, regulation_id)
        if sql_cached:
            row = await fetch_one(
                "SELECT id FROM analyses "
                "WHERE business_id = ? AND regulation_id = ? "
                "ORDER BY created_at DESC LIMIT 1",
                (business_id, regulation_id),
            )
            analysis_id = row["id"] if row else "unknown"
            return sql_cached, analysis_id

    # 5. Query ChromaDB for relevant chunks (passed to analyze_compliance for compat)
    query_text = (
        f"Compliance requirements for {business.get('operation_type', 'hog farming')} "
        f"CAFO operations in {business.get('county', 'North Carolina')} county "
        f"with {business.get('head_count', 0)} animals "
        f"regarding {regulation.get('title', 'environmental regulation')}"
    )

    relevant_chunks = vector_search(
        query=query_text,
        top_k=10,
        metadata_filters={"doc_id": regulation_id},
    )

    if not relevant_chunks:
        relevant_chunks = vector_search(query=query_text, top_k=10)

    # 6. Run Gemini two-pass analysis
    analysis = await analyze_compliance(
        business=dict(business),
        regulation=dict(regulation),
        relevant_chunks=relevant_chunks,
    )

    # 7. Cache the result in SQLite
    analysis_id = await cache_analysis(analysis, business_id, regulation_id)

    return analysis, analysis_id
