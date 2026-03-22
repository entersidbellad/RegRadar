"""
Integration test for RegRadar Gemini prompt templates.

Tests three prompts in sequence:
  1. Extraction:       regulation text → list[ComplianceRequirement]
  2. Gap Analysis:     requirements + business profile → ComplianceGapAnalysis
  3. Alert Classification: regulation + all businesses → list[AlertClassification]

Data sources:
  - Regulation: regulations_seed.json index 6 (CWA Effluent Limitations for Meat/Poultry, id=2025-16868)
  - Business:   business_profiles.json index 0 (Calvin L. Rouse Farm)
  - All 15 business profiles used for alert classification

Cached responses saved to: cached_responses/{business_id}_{regulation_id}.json

Usage:
  uv run python test_prompts.py
"""

import json
import os
import sys
from datetime import date
from pathlib import Path
from typing import Literal, Optional

from dotenv import load_dotenv
from pydantic import BaseModel, Field, ValidationError

# ---------------------------------------------------------------------------
# Load environment — check ../backend/.env first, then local .env
# ---------------------------------------------------------------------------

_script_dir = Path(__file__).parent
load_dotenv(_script_dir / ".env")                    # prompts/.env (if exists)
load_dotenv(_script_dir / "../backend/.env")         # backend/.env fallback

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    print("ERROR: GEMINI_API_KEY not set. Add it to prompts/.env or backend/.env")
    sys.exit(1)

# ---------------------------------------------------------------------------
# Pydantic models — source of truth for structured output
# ---------------------------------------------------------------------------

class ComplianceRequirement(BaseModel):
    """A single compliance requirement extracted from a regulation."""
    requirement_id: str = Field(..., description="Unique identifier for this requirement (e.g. REQ-001)")
    regulation_section: str = Field(..., description="Regulatory section reference (e.g. '40 CFR § 122.23')")
    requirement_text: str = Field(..., description="Verbatim or near-verbatim requirement text from the source")
    plain_language_summary: str = Field(..., description="Plain-language explanation for a farm operator")
    obligation_type: Literal["mandatory", "recommended", "conditional"] = Field(
        ..., description="mandatory, recommended, or conditional"
    )
    applicable_industries: list[str] = Field(
        default_factory=list,
        description="NAICS codes or industry names this requirement applies to"
    )
    deadline: Optional[str] = Field(None, description="Compliance deadline if explicitly stated")
    penalty_info: Optional[str] = Field(None, description="Penalty information if explicitly stated")


class ComplianceGapAnalysis(BaseModel):
    """Full compliance gap analysis result for a facility against a regulation."""
    business_name: str = Field(..., description="Name of the facility analyzed")
    business_id: str = Field(..., description="ID of the business")
    regulation_name: str = Field(..., description="Title of the regulation")
    regulation_id: str = Field(..., description="ID/document number of the regulation")
    analysis_date: str = Field(..., description="ISO date of the analysis (YYYY-MM-DD)")
    overall_status: Literal["compliant", "non_compliant", "warning", "unknown"] = Field(
        ..., description="compliant, non_compliant, warning, or unknown"
    )
    confidence_score: float = Field(..., ge=0.0, le=1.0, description="Confidence score 0.0 to 1.0")
    requirements: list[ComplianceRequirement] = Field(
        default_factory=list, description="Requirements from the regulation applicable to this facility"
    )
    gaps: list[str] = Field(default_factory=list, description="Specific compliance gaps identified")
    recommended_actions: list[str] = Field(
        default_factory=list, description="Concrete recommended actions for the operator"
    )
    summary: str = Field(..., description="2-3 sentence plain-language summary of compliance posture")


class AlertClassification(BaseModel):
    """Whether a single facility is affected by a new regulation."""
    business_id: str = Field(..., description="The facility's ID")
    affected: bool = Field(..., description="True if this regulation creates new obligations for this facility")
    severity: Literal["high", "medium", "low"] = Field(
        ..., description="Severity level — only meaningful when affected=True"
    )
    reason: str = Field(..., description="One sentence explaining why affected or not affected")


class AlertClassificationList(BaseModel):
    """Wrapper so we can use response_schema for the list."""
    results: list[AlertClassification]


# ---------------------------------------------------------------------------
# Gemini client setup
# ---------------------------------------------------------------------------

from google import genai

_client = genai.Client()
GEMINI_MODEL = "gemini-2.5-flash"


def _call_gemini(
    system_instruction: str,
    user_message: str,
    response_schema: dict,
    label: str,
) -> dict:
    """
    Call Gemini with structured JSON output. Returns parsed dict.
    Prints token usage if available.
    """
    print(f"\n[Gemini] Calling model for: {label}")
    print(f"  User message length: {len(user_message):,} chars")

    response = _client.models.generate_content(
        model=GEMINI_MODEL,
        contents=user_message,
        config={
            "system_instruction": system_instruction,
            "response_mime_type": "application/json",
            "response_schema": response_schema,
            "temperature": 0.2,
        },
    )

    raw = response.text
    if not raw:
        raise RuntimeError(f"Gemini returned empty response for: {label}")

    print(f"  Response length: {len(raw):,} chars")
    return json.loads(raw)


# ---------------------------------------------------------------------------
# Load seed data
# ---------------------------------------------------------------------------

def load_data() -> tuple[dict, list[dict], list[dict]]:
    """
    Returns:
        (regulation, all_businesses, [first_business])
    """
    data_dir = _script_dir / "../data"

    with open(data_dir / "regulations_seed.json") as f:
        regulations = json.load(f)

    with open(data_dir / "business_profiles.json") as f:
        businesses = json.load(f)

    # Use the first regulation (index 0, id=E8-26620):
    # "Revised NPDES Permit Regulation & ELG for CAFOs" — the core governing rule
    # under 40 CFR 122 & 412, directly applicable to every NC hog farm in the dataset.
    regulation = regulations[0]
    first_business = businesses[0]

    print(f"\n[Data] Regulation: [{regulation['id']}] {regulation['title'][:80]}...")
    print(f"[Data] Business:   [{first_business['id'][:8]}...] {first_business['name']}")
    print(f"[Data] All businesses: {len(businesses)} profiles loaded")

    return regulation, businesses, first_business


# ---------------------------------------------------------------------------
# Test 1: Extraction
# ---------------------------------------------------------------------------

def test_extraction(regulation: dict) -> list[dict]:
    """
    Test SYSTEM_PROMPT_EXTRACT + build_extraction_prompt.
    Returns the raw list of requirement dicts.
    """
    print("\n" + "="*60)
    print("TEST 1: REQUIREMENT EXTRACTION")
    print("="*60)

    from prompt_builder import build_extraction_prompt

    system_instruction, user_message = build_extraction_prompt(
        regulation.get("full_text") or regulation.get("abstract", "")
    )

    # Schema: a list wrapped in an object so response_schema works cleanly
    schema = {
        "type": "object",
        "properties": {
            "requirements": {
                "type": "array",
                "items": ComplianceRequirement.model_json_schema(),
            }
        },
        "required": ["requirements"],
    }

    raw_response = _call_gemini(
        system_instruction=system_instruction,
        user_message=user_message,
        response_schema=schema,
        label=f"extraction [{regulation['id']}]",
    )

    requirements_list = raw_response.get("requirements", [])
    print(f"\n  Extracted {len(requirements_list)} requirements")

    if not requirements_list:
        print("\n  [WARNING] No requirements extracted — regulation may not be applicable to NC CAFO hog farms.")
        print(f"  Regulation: {regulation['title']}")
        print(f"  Abstract:   {regulation['abstract'][:300]}...")
        return []

    # Validate each requirement through Pydantic
    validated = []
    errors = []
    for i, req in enumerate(requirements_list):
        try:
            validated_req = ComplianceRequirement(**req)
            validated.append(validated_req.model_dump())
            print(f"  [OK] REQ {i+1}: {validated_req.requirement_id} | {validated_req.obligation_type} | section={validated_req.regulation_section[:50]}")
        except ValidationError as e:
            errors.append((i, str(e)))
            print(f"  [FAIL] REQ {i+1}: Validation error: {e}")

    if errors:
        print(f"\n  {len(errors)} validation error(s) out of {len(requirements_list)} requirements")
    else:
        print(f"\n  All {len(validated)} requirements passed Pydantic validation")

    return validated


# ---------------------------------------------------------------------------
# Test 2: Gap Analysis
# ---------------------------------------------------------------------------

def test_gap_analysis(
    requirements: list[dict],
    regulation: dict,
    business: dict,
) -> Optional[dict]:
    """
    Test SYSTEM_PROMPT_GAP_ANALYSIS + build_gap_analysis_prompt.
    Returns the raw ComplianceGapAnalysis dict, or None on failure.
    """
    print("\n" + "="*60)
    print("TEST 2: COMPLIANCE GAP ANALYSIS")
    print("="*60)

    from prompt_builder import build_gap_analysis_prompt

    # If no requirements were extracted, we still run gap analysis
    # (the prompt handles the empty case by returning overall_status=unknown)
    requirements_json = json.dumps(requirements, indent=2)

    system_instruction, user_message = build_gap_analysis_prompt(
        requirements_json=requirements_json,
        business_profile=business,
    )

    schema = ComplianceGapAnalysis.model_json_schema()

    raw_response = _call_gemini(
        system_instruction=system_instruction,
        user_message=user_message,
        response_schema=schema,
        label=f"gap_analysis [{business['id'][:8]}] x [{regulation['id']}]",
    )

    # Inject known fields in case Gemini didn't fill them
    raw_response.setdefault("business_id", business["id"])
    raw_response.setdefault("regulation_id", regulation["id"])
    raw_response.setdefault("analysis_date", date.today().isoformat())

    try:
        analysis = ComplianceGapAnalysis(**raw_response)
        print(f"\n  [OK] Gap analysis passed Pydantic validation")
        print(f"  Overall Status:   {analysis.overall_status}")
        print(f"  Confidence Score: {analysis.confidence_score:.2f}")
        print(f"  Requirements:     {len(analysis.requirements)}")
        print(f"  Gaps:             {len(analysis.gaps)}")
        print(f"  Actions:          {len(analysis.recommended_actions)}")
        print(f"\n  Summary: {analysis.summary}")

        if analysis.overall_status == "unknown":
            print(f"\n  [FLAG] Regulation [{regulation['id']}] was determined NOT APPLICABLE to this facility.")
            print(f"  Title: {regulation['title']}")

        return analysis.model_dump()

    except ValidationError as e:
        print(f"\n  [FAIL] Gap analysis failed Pydantic validation: {e}")
        print(f"  Raw response keys: {list(raw_response.keys())}")
        return None


# ---------------------------------------------------------------------------
# Test 3: Alert Classification
# ---------------------------------------------------------------------------

def test_alert_classification(regulation: dict, businesses: list[dict]) -> list[dict]:
    """
    Test SYSTEM_PROMPT_ALERT_CLASSIFICATION + build_alert_classification_prompt.
    Returns the validated list of AlertClassification dicts.
    """
    print("\n" + "="*60)
    print("TEST 3: ALERT CLASSIFICATION (all 15 facilities)")
    print("="*60)

    from prompt_builder import build_alert_classification_prompt

    system_instruction, user_message = build_alert_classification_prompt(
        regulation=regulation,
        businesses=businesses,
    )

    schema = AlertClassificationList.model_json_schema()

    raw_response = _call_gemini(
        system_instruction=system_instruction,
        user_message=user_message,
        response_schema=schema,
        label=f"alert_classification [{regulation['id']}]",
    )

    results_list = raw_response.get("results", [])
    print(f"\n  Received {len(results_list)} classification(s)")

    validated = []
    errors = []
    for i, item in enumerate(results_list):
        try:
            cls = AlertClassification(**item)
            validated.append(cls.model_dump())
            affected_str = f"AFFECTED ({cls.severity})" if cls.affected else "not affected"
            biz_name = next((b["name"] for b in businesses if b["id"] == cls.business_id), cls.business_id[:8])
            print(f"  [{affected_str:20s}] {biz_name[:40]}")
            print(f"                          -> {cls.reason[:90]}")
        except ValidationError as e:
            errors.append((i, str(e)))
            print(f"  [FAIL] Item {i+1}: {e}")

    if errors:
        print(f"\n  {len(errors)} validation error(s)")
    else:
        print(f"\n  All {len(validated)} classifications passed Pydantic validation")

    affected_count = sum(1 for v in validated if v["affected"])
    print(f"\n  Summary: {affected_count}/{len(validated)} facilities flagged as affected by this regulation")

    return validated


# ---------------------------------------------------------------------------
# Cache results
# ---------------------------------------------------------------------------

def save_cache(
    business_id: str,
    regulation_id: str,
    gap_analysis: dict,
    requirements: list[dict],
    alert_classifications: list[dict],
) -> Path:
    """Save all results to cached_responses/{business_id}_{regulation_id}.json"""
    cache_dir = _script_dir / "cached_responses"
    cache_dir.mkdir(exist_ok=True)

    # Sanitise IDs for use in filename
    safe_biz = business_id.replace("-", "")[:12]
    safe_reg = regulation_id.replace("-", "_")

    cache_path = cache_dir / f"{safe_biz}_{safe_reg}.json"

    payload = {
        "business_id": business_id,
        "regulation_id": regulation_id,
        "gap_analysis": gap_analysis,
        "requirements": requirements,
        "alert_classifications": alert_classifications,
    }

    with open(cache_path, "w") as f:
        json.dump(payload, f, indent=2)

    print(f"\n[Cache] Saved to: {cache_path.relative_to(_script_dir)}")
    return cache_path


# ---------------------------------------------------------------------------
# Regulation relevance assessment
# ---------------------------------------------------------------------------

def assess_all_regulation_relevance(regulations: list[dict], businesses: list[dict]) -> None:
    """
    Quick non-LLM relevance check: scan regulation titles/abstracts for
    CAFO-relevant keywords and flag anything that looks off.
    """
    print("\n" + "="*60)
    print("REGULATION RELEVANCE ASSESSMENT (keyword scan)")
    print("="*60)
    print("Checking all 12 regulations for NC CAFO / hog farm relevance...\n")

    cafo_keywords = [
        "cafo", "concentrated animal", "hog", "swine", "pork", "poultry",
        "animal feeding", "npdes", "effluent", "manure", "lagoon",
        "clean water act", "40 cfr 122", "40 cfr 412", "wastewater",
        "nutrient management", "nc deq", "north carolina",
    ]

    for i, reg in enumerate(regulations):
        searchable = (reg["title"] + " " + reg.get("abstract", "")).lower()
        hits = [kw for kw in cafo_keywords if kw in searchable]

        if hits:
            status = "LIKELY RELEVANT"
            marker = "+"
        else:
            status = "LIKELY NOT RELEVANT"
            marker = "-"

        print(f"  [{marker}] [{i:2d}] id={reg['id']} | {status}")
        print(f"         Title: {reg['title'][:80]}...")
        if hits:
            print(f"         Keywords matched: {', '.join(hits)}")
        print()


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    print("\n" + "#"*60)
    print("# RegRadar Gemini Prompt Integration Test")
    print("#"*60)

    regulation, all_businesses, first_business = load_data()

    # Run keyword relevance scan on all regulations first
    with open(_script_dir / "../data/regulations_seed.json") as f:
        all_regulations = json.load(f)
    assess_all_regulation_relevance(all_regulations, all_businesses)

    # Test 1: Extraction
    requirements = test_extraction(regulation)

    # Test 2: Gap Analysis
    gap_analysis = test_gap_analysis(requirements, regulation, first_business)

    # Test 3: Alert Classification
    alert_classifications = test_alert_classification(regulation, all_businesses)

    # Cache results
    if gap_analysis:
        save_cache(
            business_id=first_business["id"],
            regulation_id=regulation["id"],
            gap_analysis=gap_analysis,
            requirements=requirements,
            alert_classifications=alert_classifications,
        )

    print("\n" + "#"*60)
    print("# All tests complete")
    print("#"*60)


if __name__ == "__main__":
    main()
