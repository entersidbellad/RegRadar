"""
Business API routes.
GET /api/businesses       - List all businesses with computed latest_status
GET /api/businesses/{id}  - Single business with analyses array
"""

import json
from fastapi import APIRouter, HTTPException

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
async def list_businesses():
    """
    List all businesses with their computed latest_status.
    The latest_status is derived from the most recent compliance analysis.
    """
    businesses = await fetch_all(
        "SELECT * FROM businesses ORDER BY county, name"
    )

    # For each business, get the most recent analysis to compute latest_status
    result = []
    for biz in businesses:
        latest = await fetch_one(
            "SELECT overall_status FROM analyses WHERE business_id = ? ORDER BY created_at DESC LIMIT 1",
            (biz["id"],),
        )
        biz_dict = dict(biz)
        biz_dict["latest_status"] = latest["overall_status"] if latest else "unknown"
        result.append(biz_dict)

    return {
        "items": result,
        "total": len(result),
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
