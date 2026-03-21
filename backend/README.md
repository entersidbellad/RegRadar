# RegRadar Backend

AI-powered environmental compliance monitoring backend for North Carolina hog farm CAFOs (Concentrated Animal Feeding Operations). Built with FastAPI, Gemini 2.5 Flash, and ChromaDB.

## What Was Built

This backend provides a complete API for:

- **Regulation ingestion and search** — EPA regulations from the Federal Register are stored, chunked, and vector-indexed for semantic search
- **Compliance gap analysis** — Gemini 2.5 Flash analyzes a business facility against regulations, producing structured compliance assessments
- **Business and alert management** — CRUD-style endpoints for facility profiles and compliance alerts

### Architecture

```
main.py                    FastAPI app entrypoint, CORS, lifespan, route mounting
├── api/
│   ├── routes_regulations.py   GET /api/regulations, GET /api/regulations/{id}
│   ├── routes_businesses.py    GET /api/businesses, GET /api/businesses/{id}
│   ├── routes_analyze.py       POST /api/analyze
│   └── routes_alerts.py        GET /api/alerts
├── core/
│   ├── federal_register.py     Async Federal Register API client (httpx)
│   ├── extraction.py           Text extraction from HTML, URLs, and PDFs
│   ├── chunking.py             LangChain RecursiveCharacterTextSplitter (800/150)
│   ├── indexing.py             ChromaDB embedding + semantic search
│   ├── gemini_client.py        Gemini 2.5 Flash structured JSON output
│   └── matcher.py              Orchestrates business-to-regulation analysis pipeline
├── db/
│   ├── database.py             SQLite schema, async helpers via aiosqlite
│   └── seed.py                 Loads seed data from ../data/ into SQLite + ChromaDB
├── pyproject.toml              uv project config with all dependencies
└── .env.example                Environment variable template
```

### Data Pipeline

1. **Ingestion** — Regulations (HTML full text from Federal Register) are stored in SQLite
2. **Extraction** — HTML is stripped to plaintext via BeautifulSoup
3. **Chunking** — Text is split into 800-char chunks with 150-char overlap using LangChain
4. **Indexing** — Chunks are embedded with `sentence-transformers/all-MiniLM-L6-v2` (384 dims) and stored in ChromaDB
5. **Search** — Semantic similarity search with metadata filtering (by regulation ID, agency)
6. **Analysis** — Gemini 2.5 Flash receives business profile + relevant chunks → structured `ComplianceGapAnalysis`
7. **Caching** — Every Gemini response is cached in SQLite before returning

### Database Schema

**3 SQLite tables:**

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `businesses` | NC hog farm facility profiles | id, name, permit_number, county, lat/lng, head_count |
| `regulations` | EPA Federal Register rules | id, title, agency, full_text, publication_date |
| `analyses` | Cached Gemini compliance analyses | business_id, regulation_id, overall_status, gaps_json |

### Seeded Data

After running the seed script, the database contains:
- **12 EPA regulations** from the Federal Register (real rules fetched from the FR API)
- **15 NC hog farm facilities** sampled from NC DEQ CAFO permit data (Duplin, Sampson, Bladen, Wayne, Robeson counties)
- **7,445 text chunks** indexed in ChromaDB for semantic search
- **4 demo alerts** covering NC Supreme Court rulings, EPA CAFO updates, lagoon setbacks, and inspection initiatives

---

## Setup Instructions

### Prerequisites

- **Python 3.13+**
- **[uv](https://docs.astral.sh/uv/)** — Python package manager (NEVER use pip/pip install)
- **Gemini API key** — Free tier from [ai.google.dev](https://ai.google.dev) (optional for read-only endpoints)

### Step 1: Install Dependencies

```bash
cd backend
uv venv
source .venv/bin/activate    # On macOS/Linux
# .venv\Scripts\activate     # On Windows
uv pip install -e .
```

This installs all dependencies from `pyproject.toml`:
- `fastapi` + `uvicorn[standard]` — Web framework and ASGI server
- `httpx` — Async HTTP client for Federal Register API
- `google-genai` — Google Gemini SDK (structured JSON output)
- `chromadb` — Vector database for semantic search
- `sentence-transformers` — Local embedding model (all-MiniLM-L6-v2)
- `aiosqlite` — Async SQLite driver
- `pymupdf4llm` — PDF text extraction
- `pydantic` — Data validation and serialization
- `python-dotenv` — .env file loading
- `langchain-text-splitters` — Text chunking
- `beautifulsoup4` — HTML text extraction

### Step 2: Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your values:

```env
# Required for compliance analysis (POST /api/analyze)
GEMINI_API_KEY=your-key-from-ai.google.dev

# Optional (defaults shown)
CHROMA_PERSIST_DIR=./chroma_data
SQLITE_DB_PATH=./regradar.db
```

**Minimum for basic operation:** No env vars are strictly required. The server starts and serves seeded data from SQLite/ChromaDB without any API keys. `GEMINI_API_KEY` is only needed for the `/api/analyze` endpoint.

### Step 3: Seed the Database

```bash
uv run python -m db.seed
```

This will:
1. Create SQLite tables (businesses, regulations, analyses)
2. Load 12 regulations from `../data/regulations_seed.json`
3. Load 15 business profiles from `../data/business_profiles.json`
4. Extract text from HTML, chunk into 800-char segments, and index 7,445 chunks into ChromaDB

The first run downloads the `all-MiniLM-L6-v2` embedding model (~90MB). Subsequent runs skip already-seeded records.

### Step 4: Start the Server

```bash
uv run uvicorn main:app --reload --port 8000
```

The server starts at `http://localhost:8000`. First startup takes ~30s while the embedding model loads.

### Step 5 (Optional): Set Up Gemini API

1. Go to [ai.google.dev](https://ai.google.dev)
2. Create an API key
3. Add to `.env`: `GEMINI_API_KEY=your-key`
4. Restart the server

Now `POST /api/analyze` will call Gemini 2.5 Flash for compliance analysis. Free tier allows ~250 requests/day.

---

## API Reference

All endpoints return JSON. Errors return `{"detail": "error message"}`.

### Health Check

```
GET /api/health
```

Returns status of all backend services (SQLite, ChromaDB, Gemini config).

**Example response:**
```json
{
  "status": "ok",
  "sqlite": "connected",
  "chromadb": { "status": "connected", "chunks": 7445 },
  "gemini_configured": true
}
```

### Regulations

```
GET /api/regulations?page=1&per_page=20&agency=EPA&document_type=RULE&date_from=2025-06-01&date_to=2025-12-31
```

Paginated list of regulations (without full_text for efficiency).

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | int | 1 | Page number |
| `per_page` | int | 20 | Items per page (max 100) |
| `agency` | string | — | Filter by agency (e.g., `EPA`) |
| `document_type` | string | — | Filter by type (e.g., `RULE`) |
| `date_from` | string | — | Filter by `publication_date >= date` (ISO format) |
| `date_to` | string | — | Filter by `publication_date <= date` (ISO format) |

```
GET /api/regulations/{regulation_id}
```

Single regulation with full_text included.

### Businesses

```
GET /api/businesses?county=Duplin&status=unknown&page=1&per_page=20
```

Business profiles with optional filtering and pagination. Each item includes a computed `latest_status` derived from the most recent compliance analysis (defaults to `"unknown"` if never analyzed).

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `county` | string | — | Filter by NC county name (e.g., `Duplin`, `Sampson`) |
| `status` | string | — | Filter by latest compliance status (`compliant`, `non_compliant`, `warning`, `unknown`) |
| `page` | int | 1 | Page number |
| `per_page` | int | 20 | Items per page (max 100) |

```
GET /api/businesses/{business_id}
```

Single business with all analyses attached.

### Compliance Analysis

```
POST /api/analyze
Content-Type: application/json

{ "business_id": "e681a8a3-...", "regulation_id": "2025-10542" }
```

Runs the full compliance pipeline:
1. Checks SQLite cache for existing analysis
2. Queries ChromaDB for relevant regulation chunks (filtered by regulation_id)
3. Sends business profile + chunks to Gemini 2.5 Flash
4. Caches result in SQLite
5. Returns structured `ComplianceGapAnalysis`

**Requires:** `GEMINI_API_KEY` environment variable.

### Alerts

```
GET /api/alerts?since=2026-01-01
```

Returns pre-loaded alert data from `../data/alerts_seed.json`. 4 demo alerts covering recent regulatory changes affecting NC CAFO facilities.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `since` | string | — | Filter alerts with `timestamp >= date` (ISO format) |

---

## Interactive API Docs

When the server is running, visit:
- **Swagger UI:** http://localhost:8000/docs
- **ReDoc:** http://localhost:8000/redoc

---

## Tech Stack

| Component | Technology | Details |
|-----------|-----------|---------|
| Framework | FastAPI 0.135+ | Async ASGI, auto-generated OpenAPI docs |
| Database | SQLite via aiosqlite | WAL mode, foreign keys enabled |
| Vector DB | ChromaDB 1.5+ | Persistent mode, cosine similarity |
| Embeddings | all-MiniLM-L6-v2 | 384-dim, runs locally via sentence-transformers |
| LLM | Gemini 2.5 Flash | Structured JSON output, temperature 0.2 |
| HTTP Client | httpx | Async with timeouts and redirect following |
| Text Processing | BeautifulSoup4, LangChain | HTML extraction, recursive text splitting |
| PDF Processing | pymupdf4llm | Markdown-optimized PDF extraction |

---

## File-by-File Documentation

### `main.py`
FastAPI application entrypoint. Configures CORS middleware (all origins allowed), sets up the lifespan handler that initializes SQLite and verifies ChromaDB on startup, and mounts all 4 route modules. Exposes the `/api/health` endpoint returning SQLite, ChromaDB, and Gemini status.

### `db/database.py`
Async SQLite module. Defines the 3-table schema (businesses, regulations, analyses). Provides `get_db()` for connections, `init_db()` for schema creation, and helper functions `fetch_one()`, `fetch_all()`, `execute()`, `execute_many()` for common query patterns. Uses WAL journal mode and foreign keys.

### `db/seed.py`
Database seeder. Reads JSON seed files from `../data/`, inserts records into SQLite (skipping duplicates), then runs the full text extraction → chunking → ChromaDB indexing pipeline on all regulations. Run with `uv run python -m db.seed`.

### `core/federal_register.py`
Async client for the Federal Register API (`federalregister.gov/api/v1`). Provides `search_regulations()` with agency/type filtering and `fetch_full_text()` for retrieving document content. Includes a `RegulationDocument` Pydantic model and `to_db_record()` converter.

### `core/extraction.py`
Text extraction utilities. `extract_text_from_html()` strips HTML tags using BeautifulSoup, `extract_text_from_url()` fetches plaintext via httpx, and `extract_text_from_pdf()` uses pymupdf4llm for Markdown-optimized PDF extraction.

### `core/chunking.py`
LangChain-based text chunking. Uses `RecursiveCharacterTextSplitter` with 800-char chunks and 150-char overlap. `chunk_document()` returns a list of chunks with metadata (doc_id, agency, pub_date, cfr_sections, chunk_index).

### `core/indexing.py`
ChromaDB vector indexing. Manages a persistent `"regulations"` collection with cosine similarity. `index_chunks()` upserts in batches of 100. `search()` accepts text queries with optional metadata filters. `delete_by_doc_id()` removes all chunks for a document.

### `core/gemini_client.py`
Gemini 2.5 Flash integration using the `google-genai` SDK. The client auto-reads `GEMINI_API_KEY` from the environment (no explicit `api_key=` parameter). Defines Pydantic models `ComplianceRequirement` and `ComplianceGapAnalysis` with `Literal` type constraints on `obligation_type` (`"mandatory"`, `"recommended"`, `"conditional"`) and `overall_status` (`"compliant"`, `"non_compliant"`, `"warning"`, `"unknown"`). Uses Gemini's native JSON mode via `response_mime_type="application/json"` and `response_schema` from `model_json_schema()`. Temperature is fixed at 0.2. Includes `check_cache()` and `cache_analysis()` to read/write the SQLite analyses table.

### `core/matcher.py`
Orchestration module. `match_business_to_regulation()` coordinates the full pipeline: fetch business from SQLite → fetch regulation → query ChromaDB for top 10 relevant chunks filtered by regulation_id → check cache for existing (business_id, regulation_id) pair → call Gemini → store result in analyses table → return. Falls back to a broader unfiltered search if no regulation-specific chunks are found.

### `api/routes_regulations.py`
`GET /api/regulations` (paginated, filterable by agency, document_type, date_from, date_to) and `GET /api/regulations/{id}` (includes full_text). Returns regulations ordered by publication date descending.

### `api/routes_businesses.py`
`GET /api/businesses` (paginated, filterable by county and compliance status) and `GET /api/businesses/{id}` (includes analyses array). The `latest_status` is dynamically computed from the most recent analysis record; status filtering is applied post-query since it's a derived field.

### `api/routes_analyze.py`
`POST /api/analyze` with body `{business_id, regulation_id}`. Delegates to the matcher pipeline. Returns 404 if business/regulation not found, 503 if Gemini is unavailable.

### `api/routes_alerts.py`
`GET /api/alerts` — serves pre-loaded alert data from `../data/alerts_seed.json` with optional `since` date filtering. Alerts are loaded once at first request and cached in memory.

---

## Troubleshooting

**Server startup is slow (~30-60s)**
The sentence-transformers model loads into memory on first startup. Subsequent requests are fast.

**"GEMINI_API_KEY is not configured" on /api/analyze**
Set `GEMINI_API_KEY` in your `.env` file. Get a free key from [ai.google.dev](https://ai.google.dev).

**ChromaDB "0 chunks in collection"**
Run the seed script: `uv run python -m db.seed`

**Port already in use**
Kill the existing process or use a different port: `uv run uvicorn main:app --reload --port 8001`
