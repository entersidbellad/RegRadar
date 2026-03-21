"""
Business-to-regulation matching orchestrator.
Coordinates the full compliance analysis pipeline:
  1. Fetch business and regulation from DB
  2. Query ChromaDB for relevant chunks
  3. Check cache for existing analysis
  4. Call Gemini for new analysis
  5. Cache the result
"""

from db.database import fetch_one
from core.indexing import search as vector_search
from core.gemini_client import (
    analyze_compliance,
    check_cache,
    cache_analysis,
    ComplianceGapAnalysis,
)


async def match_business_to_regulation(
    business_id: str,
    regulation_id: str,
    force_refresh: bool = False,
) -> tuple[ComplianceGapAnalysis, str]:
    """
    Run a full compliance analysis for a business against a regulation.

    Args:
        business_id: The business ID to analyze.
        regulation_id: The regulation ID to analyze against.
        force_refresh: If True, bypass cache and generate a fresh analysis.

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

    # 3. Check cache (unless force_refresh)
    if not force_refresh:
        cached = await check_cache(business_id, regulation_id)
        if cached:
            # Get the analysis_id from DB
            row = await fetch_one(
                "SELECT id FROM analyses WHERE business_id = ? AND regulation_id = ? ORDER BY created_at DESC LIMIT 1",
                (business_id, regulation_id),
            )
            analysis_id = row["id"] if row else "unknown"
            return cached, analysis_id

    # 4. Query ChromaDB for relevant chunks
    # Build a query combining business context with regulation focus
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

    # If no chunks found for this specific regulation, try broader search
    if not relevant_chunks:
        relevant_chunks = vector_search(
            query=query_text,
            top_k=10,
        )

    # 5. Call Gemini for analysis
    analysis = await analyze_compliance(
        business=dict(business),
        regulation=dict(regulation),
        relevant_chunks=relevant_chunks,
    )

    # 6. Cache the result in SQLite
    analysis_id = await cache_analysis(analysis, business_id, regulation_id)

    return analysis, analysis_id
