# RegRadar

AI-powered environmental compliance monitoring for NC hog farm CAFOs. Scrapes federal regulations from the Federal Register, matches them against facility profiles, and generates plain-language compliance gap analyses via Gemini 2.5 Flash.

## Project Structure

```
regradar/
  justfile                  # Task runner — all dev/build/seed commands
  backend/                  # Python FastAPI backend
    main.py                 # FastAPI app entrypoint, CORS, route mounting
    pyproject.toml          # uv project config and dependencies
    api/                    # Route handlers
      routes_regulations.py   # GET /api/regulations, GET /api/regulations/{id}
      routes_businesses.py    # GET /api/businesses, GET /api/businesses/{id}
      routes_analyze.py       # POST /api/analyze
      routes_alerts.py        # GET /api/alerts
    core/                   # Business logic
      federal_register.py     # Federal Register API client (httpx async)
      extraction.py           # Text extraction (raw text + pymupdf4llm)
      chunking.py             # LangChain RecursiveCharacterTextSplitter (800/150)
      indexing.py             # ChromaDB embedding + search
      gemini_client.py        # Gemini 2.5 Flash — two-pass analysis pipeline
      matcher.py              # Orchestrator: file cache → SQLite cache → Gemini
      system_prompts.py       # Prompt templates (COPIED from prompts/)
      prompt_builder.py       # Prompt assembly functions (COPIED from prompts/)
    db/
      database.py             # SQLite via aiosqlite (3 tables)
      seed.py                 # Seed loader: data/ → SQLite + ChromaDB
    scripts/
      list_regs.py            # Helper for `just list-regs`
    cached_responses/         # Pre-generated Gemini responses (COPIED from prompts/)
      e681a8a33ae5_E8_26620.json  # Calvin L. Rouse Farm × E8-26620
  frontend/                 # Next.js 14 frontend
    app/
      layout.tsx              # Sidebar nav + header shell
      page.tsx                # Dashboard: regulation feed + NC map
      alerts/page.tsx         # Alerts view with timer simulation
    components/
      nc-map.tsx              # React Leaflet map (MUST be "use client")
      reg-feed.tsx            # Regulation card list
      business-detail.tsx     # Slide-over Sheet with facility info
      analysis-result.tsx     # ComplianceGapAnalysis renderer
    lib/
      api.ts                  # Fetch wrapper for backend API
      mock-data.ts            # Hardcoded mock data matching API shapes
      types.ts                # TypeScript interfaces for all API responses
  prompts/                  # Gemini prompt engineering workspace
    pyproject.toml            # uv project config (google-genai, pydantic)
    system_prompts.py         # Source of truth for prompt templates
    prompt_builder.py         # Prompt assembly functions
    test_prompts.py           # Integration tests against live Gemini API
    cached_responses/         # Test output cache
  data/                     # Seed data (checked in, curated)
    regulations_seed.json     # 9 CAFO-relevant EPA regulations with full text
    business_profiles.json    # 15 NC hog farm profiles from EPA ECHO / NC DEQ
    cafo_facilities.geojson   # 2,307 NC CAFO facilities from NC DEQ ArcGIS
    alerts_seed.json          # 4 demo alerts
    task1.py – task5.py       # Data collection and validation scripts
```

## Task Runner (justfile)

All common operations are available via `just`. Install: `brew install just` (macOS) or see https://just.systems/man/en/packages.html.

```
just setup          # Install backend (uv) + frontend (bun) dependencies
just seed           # Wipe DB + ChromaDB, re-seed from data/
just dev            # Start backend (8000) + frontend (3000) in parallel
just backend        # Start FastAPI backend only
just frontend       # Start Next.js frontend only
just build          # Production build of the frontend
just health         # curl /api/health
just list-regs      # List regulations in SQLite
just chroma-count   # Print ChromaDB chunk count
just test-prompts   # Run Gemini prompt integration tests
```

## Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Backend | Python 3.13+, FastAPI, httpx, Pydantic v2, aiosqlite | Async everywhere. CORS `allow_origins=["*"]`. Managed with `uv`. |
| LLM | Google Gemini 2.5 Flash (`gemini-2.5-flash`) | SDK: `google-genai` (NOT `google-generativeai`). Structured JSON output via `response_schema`. Temperature 0.2. |
| Vector DB | ChromaDB embedded mode | Persistent storage. Collection: `"regulations"`, cosine similarity. ~3,538 chunks after seeding. |
| Embeddings | `sentence-transformers/all-MiniLM-L6-v2` | 384 dimensions. Runs locally. First load ~30s. |
| Database | SQLite | 3 tables: `businesses`, `regulations`, `analyses`. |
| Frontend | Next.js 14, TypeScript, shadcn/ui, Tailwind CSS | App Router. All map components must be client components. Managed with `bun`. |
| Map | React Leaflet + OpenStreetMap | No API key needed. GeoJSON circle markers. |
| Charts | Recharts | For compliance trend visualizations. |
| Task Runner | [just](https://github.com/casey/just) | `justfile` at repo root. All commands listed above. |

## Package Managers

**This project uses `uv` for Python and `bun` for JavaScript/TypeScript. Do NOT use pip, npm, yarn, npx, or python -m venv anywhere.**

- Python: always `uv` (for venv creation, dependency install, running scripts, adding packages)
- JavaScript/TypeScript: always `bun` (for install, run, exec, package management)
- If a guide says `pip install`, translate to `uv pip install` or `uv add`
- If a guide says `npm install` or `npx`, translate to `bun install` or `bunx`
- Running the backend: `uv run uvicorn main:app --reload` (NOT bare uvicorn)
- Running the frontend: `bun run dev` (NOT npm run dev)

## Environment Variables

Backend (`.env` in `backend/`):
```
GEMINI_API_KEY=           # Required for /api/analyze. Free at https://aistudio.google.com
CHROMA_PERSIST_DIR=./chroma_data
SQLITE_DB_PATH=./regradar.db
```

Frontend (`.env.local` in `frontend/` — gitignored, create manually):
```
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_USE_MOCKS=false    # Set true to use mock data without backend
```

## Running Locally

```bash
# One-time setup
just setup                 # Installs backend + frontend deps
echo "GEMINI_API_KEY=your_key" > backend/.env
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > frontend/.env.local
echo "NEXT_PUBLIC_USE_MOCKS=false" >> frontend/.env.local
just seed                  # Wipe + re-seed SQLite and ChromaDB

# Run
just dev                   # Backend on :8000, frontend on :3000
```

## Regulation Data — What's In the Seed

`data/regulations_seed.json` contains **9 CAFO-relevant EPA regulations** fetched by targeted document ID from the Federal Register API. These replaced a previous set of 12 irrelevant regulations (hazardous waste, air plans, etc.) that had no applicability to NC hog farms.

### Tier 1 — Core CAFO rules (40 CFR 122 / 412)

| ID | Date | Title | CFR | Why it matters |
|----|------|-------|-----|----------------|
| `E8-26620` | 2008-11-20 | Revised NPDES/ELG for CAFOs (Waterkeeper response) | 40 CFR 122, 412 | **The current governing rule.** Defines CAFO thresholds, NPDES permit requirements, effluent limits. This is the primary regulation for compliance analysis. |
| `03-3074` | 2003-02-12 | Original CAFO NPDES Rule | 40 CFR 122, 412 | **Foundation rule.** Defines Large/Medium/Small CAFO thresholds, NMP requirements, land application standards. Many section refs in permits trace to this. |
| `2012-18378` | 2012-07-30 | Removal of vacated "propose to discharge" elements | 40 CFR 122 | Removes the requirement that CAFOs "proposing to discharge" must get permits. Changes permit triggers. |
| `E7-14258` | 2007-07-24 | CAFO compliance date extensions | 40 CFR 122, 412 | Extends compliance deadlines during Waterkeeper litigation. Good for tracking deadline changes. |
| `06-1240` | 2006-02-10 | Revised compliance dates (Waterkeeper 2006) | 40 CFR 122, 412 | Earlier round of deadline extensions. |

### Tier 2 — Secondary rules affecting farms

| ID | Date | Title | CFR | Why it matters |
|----|------|-------|-----|----------------|
| `E8-30003` | 2008-12-18 | CERCLA/EPCRA air release exemption for farms | 40 CFR 302, 355 | Exempts farms from reporting H2S/ammonia air releases from lagoons. Directly relevant to hog lagoon operations. |
| `2019-12411` | 2019-06-13 | EPCRA amendment — animal waste air emissions | 40 CFR 355 | Codifies the farm air release exemption. Adds definitions of "animal waste" and "farm." |
| `2022-28595` | 2023-01-18 | WOTUS revised definition | 33 CFR 328, 40 CFR 120 | Determines which waterbodies trigger CWA jurisdiction. Affects whether lagoon overflow / runoff is a regulated discharge. |
| `2020-21446` | 2020-11-02 | NPDES Electronic Reporting Rule Phase 2 | 40 CFR 122, 127 | Requires electronic submission of NPDES permit data. Touches all permittees including CAFOs. |

### What's NOT in the Federal Register (gaps)

- **NC General NPDES Permit AWG100000** — The actual permit most NC hog farms operate under. Issued by NC DEQ, not in Federal Register. Would need separate PDF ingestion.
- **15A NCAC 02T** — NC Administrative Code for animal waste management. State rules, not federal.
- **November 2025 NC Supreme Court ruling** — Struck down annual reporting, groundwater monitoring, and phosphorus testing requirements. Referenced in the system prompts but not in the regulation seed (it's a court decision, not a regulation).

### How to add more regulations

Edit `data/task1.py` — add document IDs to the `TARGET_IDS` dict, then run:
```bash
python3 data/task1.py   # Fetches from Federal Register API
just seed               # Re-seeds SQLite + ChromaDB
```

Search the Federal Register API at: `https://www.federalregister.gov/api/v1/documents.json?conditions[term]=CAFO&conditions[agencies][]=environmental-protection-agency`

## Gemini Analysis Pipeline

The backend uses a **two-pass** Gemini analysis that produces significantly better results than a single-pass approach:

### Pass 1: Requirement Extraction

**System prompt:** `SYSTEM_PROMPT_EXTRACT` in `core/system_prompts.py`

Input: Regulation full text (HTML-stripped)
Output: `list[ComplianceRequirement]` — each with `regulation_section`, `requirement_text`, `plain_language_summary`, `obligation_type`, etc.

This pass extracted **76 specific CFR-cited requirements** from the E8-26620 regulation in testing, compared to vague generic output from single-pass approaches.

### Pass 2: Gap Analysis

**System prompt:** `SYSTEM_PROMPT_GAP_ANALYSIS` in `core/system_prompts.py`

Input: Extracted requirements JSON + business profile
Output: `ComplianceGapAnalysis` — with `overall_status`, `confidence_score`, `gaps`, `recommended_actions`, `summary`

This pass produces facility-specific analysis referencing the actual head count, operation type, and permit type.

### Pass 3 (standalone): Alert Classification

**System prompt:** `SYSTEM_PROMPT_ALERT_CLASSIFICATION` in `core/system_prompts.py`

Input: Regulation abstract + list of business profiles
Output: `list[AlertClassification]` — each with `business_id`, `affected`, `severity`, `reason`

Not currently wired into the backend API. Available for future alert generation features.

### Cache Hierarchy

When `POST /api/analyze` is called, the matcher checks caches in this order:

1. **File cache** (`backend/cached_responses/`) — Pre-generated JSON files from `prompts/test_prompts.py`. Instant response, no DB or API calls. Returns `analysis_id: "file-cache"`.
2. **SQLite cache** (`analyses` table) — Previous Gemini results stored in DB. Fast, no API call.
3. **Live Gemini** — Two API calls (extract + gap analysis). Takes 30-60s. Result is cached in SQLite for next time.

File naming convention: `{business_id_no_hyphens[:12]}_{regulation_id_underscored}.json`

## Prompt Engineering Guide

### Three Prompt Templates

All prompts live in `prompts/system_prompts.py` (source of truth) and are copied to `backend/core/system_prompts.py` for backend use.

| Constant | Purpose | Key design decisions |
|----------|---------|---------------------|
| `SYSTEM_PROMPT_EXTRACT` | Extract requirements from regulation text | Instructs "only extract what's explicitly stated" to prevent hallucination. Tells LLM to return empty list if regulation is inapplicable rather than fabricating requirements. Uses "conditional" obligation_type as escape hatch for ambiguous text. |
| `SYSTEM_PROMPT_GAP_ANALYSIS` | Match requirements against a business | Requires facility-specific analysis ("do not give generic advice"). Includes the NC Supreme Court ruling context. Uses "warning" status as escape hatch when compliance can't be determined. For inapplicable regulations: `unknown` status, `1.0` confidence, empty gaps/actions. |
| `SYSTEM_PROMPT_ALERT_CLASSIFICATION` | Classify regulation impact on businesses | Conservative — only marks `affected=true` when regulation "clearly and directly creates new obligations." Prevents false positives on tangential rules. |

### Prompt Builder Functions

`prompts/prompt_builder.py` (source) / `backend/core/prompt_builder.py` (copy):

| Function | Takes | Returns |
|----------|-------|---------|
| `build_extraction_prompt(regulation_text)` | Raw HTML regulation text | `(system_instruction, user_message)` — HTML auto-stripped |
| `build_gap_analysis_prompt(requirements_json, business_profile)` | Extracted requirements as JSON + business dict | `(system_instruction, user_message)` |
| `build_alert_classification_prompt(regulation, businesses)` | Regulation dict + list of business dicts | `(system_instruction, user_message)` |

### Critical Prompt Rules

1. **Instructions AFTER context, not before.** The user message places the regulation text / requirements first, then the instruction ("Extract ALL compliance requirements...") at the end. This follows Gemini's documented best practice for grounded extraction — the model attends more to content it just read.

2. **HTML stripping.** Regulation `full_text` is often HTML from the Federal Register. `_strip_html()` in `prompt_builder.py` preserves paragraph structure while removing tags. This reduces noise and saves tokens.

3. **Schema envelope trick.** Gemini's `response_schema` requires an object at the top level, not a bare array. For extraction, we wrap the list in `{"requirements": [...]}` using an `_ExtractionResult` Pydantic model. Gap analysis already returns a single object so no wrapper is needed.

4. **Temperature 0.2 always.** Higher temperatures cause inconsistent regulatory citations and fabricated section numbers. 0.2 is the sweet spot for factual extraction.

5. **Pydantic `Literal` types enforce enums.** `obligation_type` uses `Literal["mandatory", "recommended", "conditional"]` and `overall_status` uses `Literal["compliant", "non_compliant", "warning", "unknown"]`. These are passed to Gemini via `model_json_schema()` and Gemini respects them in structured output mode.

### Common Failure Modes and Fixes

| Problem | Cause | Fix |
|---------|-------|-----|
| Empty requirements list | Regulation is genuinely inapplicable to CAFO hog farms | This is correct behavior. The prompt explicitly allows this. Check with a relevant regulation like `E8-26620`. |
| Generic advice ("ensure compliance with applicable regulations") | Gap analysis prompt too vague | The current prompt explicitly says "do not give generic advice." If it creeps back, add more specificity constraints. |
| Fabricated CFR sections (e.g., citing sections that don't exist) | Temperature too high, or regulation text too short | Keep temperature at 0.2. Ensure full regulation text is provided, not just the abstract. |
| Gemini returns malformed JSON | Schema mismatch | Ensure `response_schema` matches the Pydantic model exactly. Use `Model.model_json_schema()` — never hand-write the schema. |
| "requirements" key missing from extraction response | Top-level schema wasn't an object | Use the `_ExtractionResult` wrapper pattern (object with `requirements` array field). |
| All 15 facilities get identical alert classifications | Alert prompt only uses abstract, which is the same for all | This is expected when all facilities are the same NAICS code and permit type. Differentiation comes from head count thresholds and county. |

### How to Iterate on Prompts

```bash
# 1. Edit prompts in prompts/system_prompts.py or prompts/prompt_builder.py
# 2. Run the test suite (3 Gemini API calls — costs ~nothing on free tier)
cd prompts && uv run python test_prompts.py
# 3. Review output — look for:
#    - Requirement count (76 is the baseline for E8-26620)
#    - Specific CFR section citations (not vague references)
#    - Gap analysis that names the actual farm, head count, permit type
#    - Alert classifications that correctly identify applicability
# 4. When satisfied, copy into backend:
cp prompts/system_prompts.py backend/core/system_prompts.py
cp prompts/prompt_builder.py backend/core/prompt_builder.py
#    IMPORTANT: Fix the import in the backend copy:
#      prompts version:  from system_prompts import ...
#      backend version:  from core.system_prompts import ...
# 5. Copy cached responses:
cp prompts/cached_responses/*.json backend/cached_responses/
# 6. Re-test via the API:
just backend   # start server
curl -X POST http://localhost:8000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"business_id":"e681a8a3-3ae5-4d4e-8fe7-4ff8d280dce2","regulation_id":"E8-26620"}'
```

## API Contract

All endpoints return JSON. Errors return `{ "detail": "error message" }` with appropriate HTTP status codes.

```
GET  /api/regulations          -> { items: [Regulation], total, page, per_page }
GET  /api/regulations/{id}     -> Regulation (with full_text)
GET  /api/businesses           -> { items: [Business], total, page, per_page }
GET  /api/businesses/{id}      -> Business (with analyses array)
POST /api/analyze              -> ComplianceGapAnalysis
     Body: { business_id: str, regulation_id: str }
GET  /api/alerts               -> [Alert]
GET  /api/health               -> { status, chromadb, sqlite, gemini_configured }
```

## Key Type Definitions

```typescript
// Business
{
  id: string
  name: string
  permit_number: string
  naics_code: string          // "112210" for hog farms
  county: string              // "Duplin", "Sampson", etc.
  latitude: number
  longitude: number
  operation_type: string      // "Swine State COC"
  head_count: number          // 1013–4965 range in seed data
  permit_type: string         // "general" (all current profiles)
  latest_status: string       // "compliant" | "non_compliant" | "warning" | "unknown"
  analyses?: Analysis[]       // Only on detail endpoint
}

// Regulation
{
  id: string                  // Federal Register doc number (e.g., "E8-26620")
  title: string
  agency: string              // "EPA"
  document_type: string       // "RULE"
  publication_date: string    // ISO date
  effective_date: string | null
  abstract: string
  raw_text_url: string | null
  full_text?: string          // Only on detail endpoint. Large — 22K to 1.1M chars.
  cfr_references: string[]    // e.g., ["40 CFR 122", "40 CFR 412"]
  cafo_tier?: string          // "core" | "secondary" — added by task1.py
}

// ComplianceGapAnalysis (POST /api/analyze response)
{
  business_name: string
  business_id: string
  regulation_name: string
  regulation_id: string
  analysis_date: string
  overall_status: "compliant" | "non_compliant" | "warning" | "unknown"
  confidence_score: number    // 0.0 to 1.0
  requirements: ComplianceRequirement[]
  gaps: string[]
  recommended_actions: string[]
  summary: string
  analysis_id?: string        // "file-cache" or a UUID
}

// ComplianceRequirement
{
  requirement_id: string      // e.g., "REQ-001"
  regulation_section: string  // e.g., "40 CFR § 122.23(d)(1)"
  requirement_text: string
  plain_language_summary: string
  obligation_type: "mandatory" | "recommended" | "conditional"
  applicable_industries: string[]  // e.g., ["112210", "Hog and Pig Farming"]
  deadline: string | null
  penalty_info: string | null
}

// Alert
{
  id: string
  regulation_title: string
  regulation_id: string
  affected_business_ids: string[]
  severity: "high" | "medium" | "low"
  timestamp: string
  description: string
}
```

## Critical Implementation Rules

**Package Managers (NON-NEGOTIABLE):**
- NEVER use `pip`, `pip install`, `python -m venv`, `npm`, `npx`, `yarn`, or `pnpm`. These are banned.
- Python packages: `uv add <package>`, `uv pip install`, `uv run`.
- JavaScript packages: `bun add <package>`, `bun install`, `bun run`, `bunx`.

**Backend:**
- Two-pass Gemini analysis: extract requirements first, then gap analysis. Never combine into a single prompt.
- Three-tier cache: file cache → SQLite cache → live Gemini. Always check caches before calling Gemini.
- Every Gemini response MUST be cached in SQLite before returning.
- ChromaDB queries MUST use metadata filtering (`doc_id` = `regulation_id`) before semantic search.
- All async: use `httpx.AsyncClient`, `aiosqlite`, async FastAPI route handlers.
- CORS middleware must allow all origins (`allow_origins=["*"]`).
- Seed script loads from `../data/` relative to backend directory.

**Frontend:**
- ALL Leaflet/map components MUST have `"use client"` directive. Leaflet crashes on SSR.
- Mock data toggle via `NEXT_PUBLIC_USE_MOCKS` env var (`lib/api.ts` checks this).
- Every async operation needs a loading skeleton (shadcn Skeleton component).
- Failed API calls show shadcn Alert with error message and Retry button.
- Map markers are CircleMarker (SVG-based), NOT image icons. Colors: compliant=#22c55e, warning=#eab308, non_compliant=#ef4444, unknown=#9ca3af.
- Business detail panel is a shadcn Sheet (slide from right).

**Gemini:**
- SDK is `google-genai`, imported as `from google import genai`. NOT `google-generativeai`.
- Client auto-reads `GEMINI_API_KEY` from environment: `client = genai.Client()` — no explicit `api_key=` param.
- Use `response_mime_type="application/json"` and `response_schema=Model.model_json_schema()` for structured output.
- Place user instructions AFTER document context in prompts, not before.
- Temperature 0.2 for all compliance tasks.
- 250 requests/day limit on free tier. Cache aggressively.
- For lists, wrap in an object: `{"requirements": [...]}` — Gemini requires top-level object in `response_schema`.

**Data:**
- Regulations in `data/regulations_seed.json` are fetched by targeted Federal Register document ID (NOT by keyword search). See `data/task1.py` `TARGET_IDS` dict.
- Business profiles in `data/business_profiles.json` — 15 real NC hog farms from NC DEQ CAFO permit data (NAICS 112210).
- NC CAFO facilities in `data/cafo_facilities.geojson` — 2,307 facilities from NC DEQ ArcGIS portal.
- Alerts in `data/alerts_seed.json` — 4 curated demo alerts referencing actual business IDs.

## Directory Ownership & Integration

Four parallel workstreams. Agents should primarily work within their assigned directory.

| Directory | Owner | Notes |
|-----------|-------|-------|
| `backend/` | Backend developer | API routes, Gemini client, ChromaDB, SQLite |
| `frontend/` | Frontend developer | Next.js UI, map, components |
| `prompts/` | ML/NLP developer | Prompt templates, test harness, iteration |
| `data/` | Data collector | Seed data, collection scripts |

**Integration workflow (prompts → backend):**

The following files are copied from `prompts/` into `backend/`. They are NOT shared via imports — they are literal copies that must be kept in sync manually.

| Source (prompts/) | Destination (backend/) | Change needed |
|-------------------|----------------------|---------------|
| `system_prompts.py` | `core/system_prompts.py` | None — identical copy |
| `prompt_builder.py` | `core/prompt_builder.py` | Change `from system_prompts import` → `from core.system_prompts import` |
| `cached_responses/*.json` | `cached_responses/*.json` | None — identical copy |

After editing prompts, always: (1) test with `just test-prompts`, (2) copy to backend, (3) fix the import path, (4) verify with `just backend` + curl.

## Seeded Data Quantities

After running `just seed`:

| Store | Contents |
|-------|----------|
| SQLite `regulations` | 9 CAFO-relevant EPA rules (full text, 22K–1.1M chars each) |
| SQLite `businesses` | 15 NC hog farm profiles (Duplin 6, Sampson 5, Bladen 2, Wayne 1, Robeson 1) |
| SQLite `analyses` | 0 (populated on first `/api/analyze` call or from file cache) |
| ChromaDB | ~3,538 chunks across 9 regulations (800-char chunks, 150-char overlap) |
| File cache | 1 pre-generated analysis: Calvin L. Rouse Farm × E8-26620 (76 requirements, 7 gaps) |

## What Is Mocked vs Live

| Feature | Status | Notes |
|---------|--------|-------|
| Federal Register API fetch | LIVE | `data/task1.py` fetches real rules by document ID. No auth needed. |
| Gemini compliance analysis | LIVE | Two-pass (extract → gap analysis). Cached in SQLite + file cache. |
| ChromaDB semantic search | LIVE | Real `all-MiniLM-L6-v2` embeddings + vector search. |
| Dashboard + map UI | LIVE | Real data from backend API when `USE_MOCKS=false`. |
| Pre-generated analysis cache | FILE CACHE | `backend/cached_responses/` serves instantly, no Gemini call. |
| NC DEQ CAFO data | PRE-LOADED | Downloaded GeoJSON, not live API. |
| Business profiles | PRE-LOADED | 15 curated entries from NC DEQ permit data. |
| Alert "live monitoring" | SIMULATED | 60-second timer in frontend surfaces a pre-loaded alert. |
| Email/SMS notifications | UI ONLY | Toast in frontend, no actual delivery. |

## Known Test Data

For quick API testing, use these known-good IDs:

```
# Business: Calvin L. Rouse Farm (Duplin County, 2883 head, general permit)
business_id = "e681a8a3-3ae5-4d4e-8fe7-4ff8d280dce2"

# Regulation: Revised NPDES/ELG for CAFOs (the core CAFO rule)
regulation_id = "E8-26620"

# This pair has a file-cached response — instant, no Gemini call needed:
curl -X POST http://localhost:8000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"business_id":"e681a8a3-3ae5-4d4e-8fe7-4ff8d280dce2","regulation_id":"E8-26620"}'
# Returns: 76 requirements, 7 gaps, overall_status="warning", confidence=0.75
```
