# RegRadar Prompts

Gemini prompt engineering workspace for RegRadar. This directory is the **source of truth** for all prompt templates. Files are copied into `backend/core/` for production use.

## Files

| File | Purpose |
|------|---------|
| `system_prompts.py` | Three system prompt constants: extraction, gap analysis, alert classification |
| `prompt_builder.py` | Functions that assemble (system_instruction, user_message) tuples for each Gemini call |
| `test_prompts.py` | Integration test script — calls live Gemini API, validates output via Pydantic |
| `pyproject.toml` | uv project config (google-genai, pydantic, python-dotenv) |
| `cached_responses/` | JSON files with validated Gemini output, copied to `backend/cached_responses/` |

## Quick start

```bash
cd prompts
uv run python test_prompts.py
```

Requires `GEMINI_API_KEY` set in `prompts/.env` or `backend/.env`. The test script loads both.

## What the test does

1. Loads regulation `E8-26620` (Revised NPDES/ELG for CAFOs) from `../data/regulations_seed.json`
2. Loads Calvin L. Rouse Farm from `../data/business_profiles.json`
3. **Pass 1 — Extraction:** Sends full regulation text to Gemini with `SYSTEM_PROMPT_EXTRACT`. Validates each requirement against `ComplianceRequirement` Pydantic model. Baseline: 76 requirements from E8-26620.
4. **Pass 2 — Gap Analysis:** Sends extracted requirements + business profile to Gemini with `SYSTEM_PROMPT_GAP_ANALYSIS`. Validates against `ComplianceGapAnalysis` model. Expected: `warning` status, 7 gaps, 0.75 confidence.
5. **Pass 3 — Alert Classification:** Sends regulation abstract + all 15 businesses to Gemini with `SYSTEM_PROMPT_ALERT_CLASSIFICATION`. Validates against `AlertClassification` model. Expected: 15/15 affected for E8-26620.
6. Saves results to `cached_responses/{business_id}_{regulation_id}.json`

## How to iterate

```bash
# 1. Edit system_prompts.py or prompt_builder.py
# 2. Run tests (3 Gemini API calls, ~nothing on free tier)
uv run python test_prompts.py
# 3. Review output — check requirement count, CFR citations, gap specificity
# 4. When satisfied, copy to backend:
cp system_prompts.py ../backend/core/system_prompts.py
cp prompt_builder.py ../backend/core/prompt_builder.py
cp cached_responses/*.json ../backend/cached_responses/
# 5. IMPORTANT: Fix import in backend copy of prompt_builder.py:
#    Change: from system_prompts import ...
#    To:     from core.system_prompts import ...
# 6. Test via API:
#    just backend
#    curl -X POST http://localhost:8000/api/analyze \
#      -H "Content-Type: application/json" \
#      -d '{"business_id":"e681a8a3-3ae5-4d4e-8fe7-4ff8d280dce2","regulation_id":"E8-26620"}'
```

## Prompt design decisions

- **Instructions AFTER context** — user message places regulation text first, instruction at the end. Gemini attends more to recently-read content.
- **HTML stripping** — `_strip_html()` removes tags but preserves paragraph breaks. Saves tokens, reduces noise.
- **Schema envelope** — Gemini `response_schema` requires a top-level object, not a bare array. Extraction wraps the list in `{"requirements": [...]}` via `_ExtractionResult`.
- **Temperature 0.2** — Higher values cause fabricated CFR section numbers. 0.2 balances accuracy and coverage.
- **Empty list = correct** — If a regulation has no CAFO requirements, the extraction prompt explicitly allows an empty list rather than fabricating irrelevant results.
