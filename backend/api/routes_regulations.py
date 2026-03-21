"""
Regulation API routes.
GET /api/regulations       - Paginated list of regulations
GET /api/regulations/{id}  - Single regulation with full_text
"""

from fastapi import APIRouter, HTTPException, Query

from db.database import fetch_all, fetch_one

router = APIRouter(prefix="/api/regulations", tags=["regulations"])


@router.get("")
async def list_regulations(
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(20, ge=1, le=100, description="Items per page"),
    agency: str | None = Query(None, description="Filter by agency (e.g., EPA)"),
    document_type: str | None = Query(None, description="Filter by document type (e.g., RULE)"),
    date_from: str | None = Query(None, description="Filter by publication_date >= this ISO date (e.g., 2025-06-01)"),
    date_to: str | None = Query(None, description="Filter by publication_date <= this ISO date (e.g., 2025-12-31)"),
):
    """
    List regulations with pagination and optional filters.
    Returns items without full_text for efficiency.
    """
    # Build query with optional filters
    conditions = []
    params = []

    if agency:
        conditions.append("agency = ?")
        params.append(agency)
    if document_type:
        conditions.append("document_type = ?")
        params.append(document_type)
    if date_from:
        conditions.append("publication_date >= ?")
        params.append(date_from)
    if date_to:
        conditions.append("publication_date <= ?")
        params.append(date_to)

    where_clause = ""
    if conditions:
        where_clause = "WHERE " + " AND ".join(conditions)

    # Get total count
    count_row = await fetch_one(
        f"SELECT COUNT(*) as total FROM regulations {where_clause}",
        tuple(params),
    )
    total = count_row["total"] if count_row else 0

    # Get paginated results (exclude full_text for list view)
    offset = (page - 1) * per_page
    rows = await fetch_all(
        f"""SELECT id, title, agency, document_type, publication_date, 
                   effective_date, abstract, raw_text_url, cfr_references, ingested_at
            FROM regulations {where_clause}
            ORDER BY publication_date DESC
            LIMIT ? OFFSET ?""",
        tuple(params) + (per_page, offset),
    )

    return {
        "items": rows,
        "total": total,
        "page": page,
        "per_page": per_page,
    }


@router.get("/{regulation_id}")
async def get_regulation(regulation_id: str):
    """
    Get a single regulation by ID, including full_text.
    """
    row = await fetch_one(
        "SELECT * FROM regulations WHERE id = ?",
        (regulation_id,),
    )

    if not row:
        raise HTTPException(status_code=404, detail=f"Regulation not found: {regulation_id}")

    return row
