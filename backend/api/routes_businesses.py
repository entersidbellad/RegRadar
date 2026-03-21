"""
Business API routes.
GET /api/businesses       - List all businesses with computed latest_status
GET /api/businesses/{id}  - Single business with analyses array
"""

import json
from fastapi import APIRouter, HTTPException, Query

from db.database import fetch_all, fetch_one

router = APIRouter(prefix="/api/businesses", tags=["businesses"])


def _compute_latest_status(analyses: list[dict]) -> str:
    """
    Compute the latest_status for a business based on its most recent analysis.
    Returns 'unknown' if no analyses exist.
    """
    if not analyses:
        return "unknown"
    # analyses should already be sorted by created_at DESC
    return analyses[0].get("overall_status", "unknown")


def _parse_analysis(row: dict) -> dict:
    """Parse JSON fields in an analysis row."""
    result = dict(row)
    for json_field in ("gaps_json", "actions_json", "requirements_json"):
        if result.get(json_field):
            try:
                result[json_field] = json.loads(result[json_field])
            except json.JSONDecodeError:
                pass
    return result


@router.get("")
async def list_businesses(
    county: str | None = Query(None, description="Filter by county name (e.g., Duplin)"),
    status: str | None = Query(None, description="Filter by latest compliance status (compliant, non_compliant, warning, unknown)"),
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(20, ge=1, le=100, description="Items per page"),
):
    """
    List businesses with optional county/status filtering and pagination.
    The latest_status is derived from the most recent compliance analysis.
    """
    # Build query with optional county filter
    conditions = []
    params: list = []

    if county:
        conditions.append("county = ?")
        params.append(county)

    where_clause = ""
    if conditions:
        where_clause = "WHERE " + " AND ".join(conditions)

    businesses = await fetch_all(
        f"SELECT * FROM businesses {where_clause} ORDER BY county, name",
        tuple(params),
    )

    # For each business, get the most recent analysis to compute latest_status
    enriched = []
    for biz in businesses:
        latest = await fetch_one(
            "SELECT overall_status FROM analyses WHERE business_id = ? ORDER BY created_at DESC LIMIT 1",
            (biz["id"],),
        )
        biz_dict = dict(biz)
        biz_dict["latest_status"] = latest["overall_status"] if latest else "unknown"
        enriched.append(biz_dict)

    # Apply status filter (post-query since latest_status is computed)
    if status:
        enriched = [b for b in enriched if b["latest_status"] == status]

    # Pagination
    total = len(enriched)
    offset = (page - 1) * per_page
    page_items = enriched[offset : offset + per_page]

    return {
        "items": page_items,
        "total": total,
        "page": page,
        "per_page": per_page,
    }


@router.get("/{business_id}")
async def get_business(business_id: str):
    """
    Get a single business by ID, including all analyses.
    """
    business = await fetch_one(
        "SELECT * FROM businesses WHERE id = ?",
        (business_id,),
    )

    if not business:
        raise HTTPException(status_code=404, detail=f"Business not found: {business_id}")

    # Fetch all analyses for this business
    analyses_rows = await fetch_all(
        "SELECT * FROM analyses WHERE business_id = ? ORDER BY created_at DESC",
        (business_id,),
    )

    analyses = [_parse_analysis(row) for row in analyses_rows]

    result = dict(business)
    result["latest_status"] = _compute_latest_status(analyses_rows)
    result["analyses"] = analyses

    return result
