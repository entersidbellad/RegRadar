"""
Analysis API route.
POST /api/analyze - Run a compliance gap analysis for a business against a regulation.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from core.matcher import match_business_to_regulation

router = APIRouter(prefix="/api", tags=["analyze"])


class AnalyzeRequest(BaseModel):
    """Request body for the analyze endpoint."""
    business_id: str
    regulation_id: str


@router.post("/analyze")
async def analyze(request: AnalyzeRequest):
    """
    Run a compliance gap analysis for a business against a regulation.

    This endpoint:
    1. Checks for a cached analysis first
    2. If not cached, queries ChromaDB for relevant regulation chunks
    3. Sends the business profile + chunks to Gemini for analysis
    4. Caches the result in SQLite
    5. Returns the structured ComplianceGapAnalysis

    Body:
        business_id: The UUID of the business to analyze
        regulation_id: The document number of the regulation
    """
    try:
        analysis, analysis_id = await match_business_to_regulation(
            business_id=request.business_id,
            regulation_id=request.regulation_id,
        )

        # Return the analysis with the analysis_id included
        result = analysis.model_dump()
        result["analysis_id"] = analysis_id
        return result

    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")
