# RegRadar
 
AI-powered environmental compliance monitoring for NC hog farm CAFOs. Scrapes federal/state regulations, matches against facility profiles, generates plain-language compliance gap analyses via Gemini, and attests findings on Solana devnet.
 
## Project Structure
 
```
regradar/
  backend/              # Python FastAPI backend (Agent 1)
    main.py             # FastAPI app entrypoint, CORS, route mounting
    pyproject.toml      # uv project config and dependencies
    api/                # Route handlers
      routes_regulations.py
      routes_businesses.py
      routes_analyze.py
      routes_attest.py
    core/               # Business logic
      federal_register.py   # Federal Register API client (httpx async)
      extraction.py         # Text extraction (raw text + pymupdf4llm)
      chunking.py           # LangChain RecursiveCharacterTextSplitter
      indexing.py           # ChromaDB embedding + search
      gemini_client.py      # Gemini 2.5 Flash structured output
      matcher.py            # Business-to-regulation matching orchestrator
      system_prompts.py     # Gemini prompt templates (copied from prompts/)
      prompt_builder.py     # Prompt assembly functions (copied from prompts/)
    db/
      database.py           # SQLite via aiosqlite
      seed.py               # Seed loader for data/ directory
    cached_responses/       # Pre-generated Gemini responses (copied from prompts/)
  frontend/             # Next.js 14 frontend (Agent 2)
    app/
      layout.tsx            # Sidebar nav + header shell
      page.tsx              # Dashboard: regulation feed + NC map
      alerts/page.tsx       # Alerts view with timer simulation
    components/
      nc-map.tsx            # React Leaflet map (MUST be "use client")
      reg-feed.tsx          # Regulation card list
      business-detail.tsx   # Slide-over Sheet with facility info
      analysis-result.tsx   # ComplianceGapAnalysis renderer
      attest-button.tsx     # Solana attestation trigger + confirmation
    lib/
      api.ts                # Fetch wrapper for backend API
      mock-data.ts          # Hardcoded mock data matching API shapes
      types.ts              # TypeScript interfaces for all API responses
  data/                 # Seed data (manually curated, checked in)
    regulations_seed.json
    business_profiles.json
    cafo_facilities.geojson
  prompts/              # Gemini prompt engineering workspace (Agent 3)
    system_prompts.py
    prompt_builder.py
    test_prompts.py
    generate_cache.py
    validate_cache.py
    cached_responses/
```
 
## Tech Stack
 
| Layer | Technology | Notes |
|-------|-----------|-------|
| Backend | Python 3.11+, FastAPI, httpx, Pydantic v2, aiosqlite | Async everywhere. CORS middleware allowing all origins. Managed with `uv`. |
| LLM | Google Gemini 2.5 Flash (`gemini-2.5-flash`) | SDK: `google-genai` (NOT `google-generativeai`). Structured JSON output via `response_schema`. Temperature 0.2. |
| Vector DB | ChromaDB embedded mode | Persistent storage. Collection: "regulations", cosine similarity. |
| Embeddings | `sentence-transformers/all-MiniLM-L6-v2` | 384 dimensions. Runs locally. |
| Database | SQLite | 4 tables: businesses, regulations, analyses, attestations. |
| Blockchain | Solana devnet, SPL Memo Program | Server-side keypair. No Phantom wallet. Memo program ID: `MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr`. |
| Frontend | Next.js 14, TypeScript, shadcn/ui, Tailwind CSS | App Router. All map components must be client components. Managed with `bun`. |
| Map | React Leaflet + OpenStreetMap | No API key needed. GeoJSON circle markers. |
| Charts | Recharts | For compliance trend visualizations. |
 
## Environment Variables
 
Backend (`.env` in `backend/`):
```
GEMINI_API_KEY=           # From ai.google.dev
SOLANA_KEYPAIR_PATH=./devnet-keypair.json
CHROMA_PERSIST_DIR=./chroma_data
SQLITE_DB_PATH=./regradar.db
```
 
Frontend (`.env.local` in `frontend/`):
```
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_USE_MOCKS=false    # Set true to use mock data without backend
```
 
## Package Managers
 
**This project uses `uv` for Python and `bun` for JavaScript/TypeScript. Do NOT use pip, npm, yarn, npx, or python -m venv anywhere.**
 
- Python: always `uv` (for venv creation, dependency install, running scripts, adding packages)
- JavaScript/TypeScript: always `bun` (for install, run, exec, package management)
- If a guide or README says `pip install`, translate to `uv pip install` or `uv add`
- If a guide says `npm install` or `npx`, translate to `bun install` or `bunx`
 
## Running Locally
 
```bash
# Backend
cd backend
uv venv                    # Create virtual environment
source .venv/bin/activate
uv pip install -e ".[dev]" # Install from pyproject.toml
# OR if using requirements.txt fallback:
uv pip install -r requirements.txt
uv run python -m db.seed   # Seed SQLite + ChromaDB from data/ directory
uv run uvicorn main:app --reload --port 8000
 
# Frontend
cd frontend
bun install
bun run dev                # Runs on localhost:3000
```
 
## API Contract
 
All endpoints return JSON. Errors return `{ "detail": "error message" }` with appropriate HTTP status codes.
 
```
GET  /api/regulations          -> { items: [Regulation], total, page, per_page }
GET  /api/regulations/{id}     -> Regulation (with full_text)
GET  /api/businesses           -> { items: [Business], total }
GET  /api/businesses/{id}      -> Business (with analyses array)
POST /api/analyze              -> ComplianceGapAnalysis
     Body: { business_id: str, regulation_id: str }
POST /api/attest               -> { tx_signature, explorer_url, sha256_hash, timestamp }
     Body: { analysis_id: str }
GET  /api/alerts               -> [Alert]
GET  /api/health               -> { status, chromadb, sqlite, gemini_configured, solana_configured }
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
  operation_type: string      // "swine, farrow-to-finish"
  head_count: number
  permit_type: string         // "general" | "individual"
  latest_status: string       // "compliant" | "non_compliant" | "warning" | "unknown"
  analyses?: Analysis[]       // Only on detail endpoint
}
 
// Regulation
{
  id: string                  // Federal Register doc number
  title: string
  agency: string              // "EPA" | "NC_DEQ"
  document_type: string       // "RULE" | "PROPOSED_RULE" | "NOTICE"
  publication_date: string    // ISO date
  effective_date: string | null
  abstract: string
  raw_text_url: string | null
  full_text?: string          // Only on detail endpoint
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
}
 
// ComplianceRequirement
{
  requirement_id: string
  regulation_section: string
  requirement_text: string
  plain_language_summary: string
  obligation_type: "mandatory" | "recommended" | "conditional"
  applicable_industries: string[]
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
 
// Attestation (POST /api/attest response)
{
  tx_signature: string
  explorer_url: string        // https://explorer.solana.com/tx/{sig}?cluster=devnet
  sha256_hash: string
  timestamp: string
}
```
 
## Critical Implementation Rules
 
**Package Managers (NON-NEGOTIABLE):**
- NEVER use `pip`, `pip install`, `python -m venv`, `npm`, `npx`, `yarn`, or `pnpm`. These are banned.
- Python packages: `uv add <package>` to add to pyproject.toml, `uv pip install` for one-off installs, `uv run` to execute scripts.
- JavaScript packages: `bun add <package>`, `bun install`, `bun run <script>`, `bunx <command>` (replaces npx).
- Frontend scaffold: `bunx create-next-app@latest` (NOT npx).
- shadcn/ui init: `bunx shadcn@latest init` (NOT npx).
- Running the backend: `uv run uvicorn main:app --reload` (NOT bare uvicorn).
- Running the frontend: `bun run dev` (NOT npm run dev).
 
**Backend:**
- Every Gemini response MUST be cached in SQLite before returning. Check cache before calling Gemini.
- ChromaDB queries MUST use metadata filtering (at minimum `regulation_id`) before semantic search.
- Solana attestation uses SPL Memo Program, NOT a custom Anchor program. Server-side keypair, no wallet adapter.
- All async: use `httpx.AsyncClient`, `aiosqlite`, async FastAPI route handlers.
- CORS middleware must allow all origins (`allow_origins=["*"]`).
- Seed script loads from `../data/` relative to backend directory.
 
**Frontend:**
- ALL Leaflet/map components MUST have `"use client"` directive. Leaflet crashes on server-side render.
- Build against mock data first (lib/mock-data.ts), toggle with `NEXT_PUBLIC_USE_MOCKS` env var.
- Every async operation needs a loading skeleton (shadcn Skeleton component).
- Failed API calls show shadcn Alert with error message and Retry button.
- Map markers are CircleMarker (SVG-based), NOT image icons. Colors: compliant=#22c55e, warning=#eab308, non_compliant=#ef4444, unknown=#9ca3af.
- Business detail panel is a shadcn Sheet (slide from right).
- Attestation Explorer URL opens in new tab (`target="_blank"`).
 
**Gemini:**
- SDK is `google-genai`, imported as `from google import genai`. NOT `google-generativeai`.
- Use `response_mime_type="application/json"` and `response_schema=Model.model_json_schema()` for structured output.
- Place user instructions AFTER document context in prompts, not before.
- Temperature 0.2 for all compliance tasks.
- 250 requests/day limit on free tier. Cache aggressively.
 
**Data:**
- NC CAFO facilities are in `data/cafo_facilities.geojson` (downloaded from NC DEQ ArcGIS portal).
- Business profiles in `data/business_profiles.json` are manually curated from EPA ECHO (NAICS 112210, state NC).
- Regulations in `data/regulations_seed.json` are fetched from the Federal Register API filtered by EPA + RULE type.
 
## Directory Ownership
 
Three parallel workstreams. No two agents/developers touch the same directory.
 
- `backend/` -- Backend developer only
- `frontend/` -- Frontend developer only
- `prompts/` -- ML/NLP developer only
- `data/` -- Data collector only
 
Integration: copy `prompts/system_prompts.py` and `prompts/prompt_builder.py` into `backend/core/`, and copy `prompts/cached_responses/` into `backend/cached_responses/`.
 
## What Is Mocked vs Live
 
| Feature | Status | Notes |
|---------|--------|-------|
| Federal Register API calls | LIVE | Real API, no auth needed |
| Gemini compliance analysis | LIVE | Real API calls, cached in SQLite |
| ChromaDB semantic search | LIVE | Real embeddings + vector search |
| Solana devnet attestation | LIVE | Real on-chain transactions |
| Dashboard + map UI | LIVE | Real GeoJSON markers |
| NC DEQ CAFO data | PRE-LOADED | Downloaded GeoJSON, not live API |
| Business profiles | PRE-LOADED | 10-15 curated entries seeded into SQLite |
| NC DEQ proposed rules | PRE-LOADED | Pre-downloaded PDFs |
| Alert "live monitoring" | SIMULATED | 60-second timer surfaces pre-loaded alert |
| Email/SMS notifications | UI ONLY | Toast in frontend, no actual delivery |
