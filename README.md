# RegRadar

AI-powered environmental compliance monitoring for NC hog farm CAFOs. Scrapes federal regulations from the Federal Register, matches them against facility profiles, and generates plain-language compliance gap analyses using Google Gemini (the live demo's data is a real run with Gemini 3.1 Pro on Oct 26, 2026; re-checked Oct 28, 2026).

Built for **HackDuke: Code for Good**.

## What It Does

RegRadar helps environmental regulators, farm operators, and community advocates understand whether concentrated animal feeding operations (CAFOs) in North Carolina comply with federal clean water and air regulations.

- **Monitors 15 real NC hog farms** sourced from NC DEQ permit data
- **Tracks 9 CAFO-relevant EPA regulations** from the Federal Register
- **Runs AI-powered compliance analysis** using a two-pass Gemini pipeline that extracts requirements then evaluates each facility
- **Visualizes compliance gaps** on an interactive map, charts, and detailed facility pages
- **Generates alerts** when new regulations affect monitored facilities

## Features

| Feature | Description |
|---------|-------------|
| Landing Page | Mission-driven impact page explaining the problem and approach |
| Executive Dashboard | KPI cards, compliance donut chart, regulation timeline, NC facility map |
| Interactive Map | Leaflet map with color-coded markers, NC state boundary overlay, CartoDB basemap |
| Facility Browser | Searchable, sortable table of all facilities with compliance status |
| Facility Detail | Per-facility view with localized map, alerts, analysis history, and live AI analysis |
| Regulation Browser | Filterable list of tracked federal regulations with document type badges |
| Compliance Alerts | Severity-filtered alert feed with acknowledge actions |
| AI Gap Analysis | Two-pass Gemini analysis: requirement extraction then facility-specific gap identification |
| Reports & Export | CSV export for facilities and alerts, print-friendly compliance summary |
| Global Search | Cmd+K search palette across facilities, regulations, and alerts |
| Dark Mode | Full dark mode with neutral grays and green accents |

## Prerequisites

| Tool | Install |
|------|---------|
| [uv](https://docs.astral.sh/uv/) | `curl -LsSf https://astral.sh/uv/install.sh \| sh` |
| [bun](https://bun.sh) | `curl -fsSL https://bun.sh/install \| bash` |
| [just](https://github.com/casey/just) | `brew install just` (macOS) or see [other options](https://just.systems/man/en/packages.html) |
| Python 3.13+ | Managed automatically by `uv` |
| Node 18+ | Managed automatically by `bun` |

## Quick Start

```bash
# 1. Clone
git clone https://github.com/gssasank/RegRadar.git
cd RegRadar

# 2. Install dependencies
just setup

# 3. Add your Gemini API key (free at https://aistudio.google.com)
echo "GEMINI_API_KEY=your_key_here" > backend/.env
echo "CHROMA_PERSIST_DIR=./chroma_data" >> backend/.env
echo "SQLITE_DB_PATH=./regradar.db" >> backend/.env

# 4. Create frontend env
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > frontend/.env.local
echo "NEXT_PUBLIC_USE_MOCKS=false" >> frontend/.env.local

# 5. Seed the database
just seed

# 6. (Optional) Pre-generate compliance analyses for all facilities
cd backend && uv run python scripts/batch_analyze.py
cd ..

# 7. Start everything
just dev
```

Open [http://localhost:3000](http://localhost:3000). The landing page loads first; click "Go to Dashboard" to see the full app.

## Commands

```
just setup          # Install backend (uv) + frontend (bun) dependencies
just seed           # Wipe and re-seed SQLite + ChromaDB from data/
just dev            # Start backend (:8000) + frontend (:3000) in parallel
just backend        # Backend only
just frontend       # Frontend only
just build          # Production build
just health         # GET /api/health
just list-regs      # List seeded regulations
just chroma-count   # ChromaDB chunk count
just test-prompts   # Run Gemini prompt tests
```

## Environment Variables

**`backend/.env`**
```
GEMINI_API_KEY=              # Required for AI analysis (free at aistudio.google.com)
CHROMA_PERSIST_DIR=./chroma_data
SQLITE_DB_PATH=./regradar.db
```

**`frontend/.env.local`**
```
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_USE_MOCKS=false   # true = mock data, no backend needed
```

## Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Backend | Python 3.13, FastAPI, aiosqlite | Fully async, CORS enabled |
| LLM | Google Gemini (default `gemini-2.5-flash`, set `GEMINI_MODEL`; demo data from `gemini-3.1-pro-preview`) | Two-pass analysis, structured JSON output, temperature 0.2 |
| Vector DB | ChromaDB (embedded) | `all-MiniLM-L6-v2` embeddings, ~4,700 chunks |
| Database | SQLite | 3 tables: businesses, regulations, analyses |
| Frontend | Next.js 14, TypeScript, Tailwind CSS | App Router, shadcn/ui components |
| Map | React Leaflet | CartoDB Positron tiles, NC boundary overlay |
| Charts | Recharts | Donut charts with dark mode support |
| Package Managers | `uv` (Python), `bun` (JS) | **No pip/npm** |

## Project Structure

```
regradar/
  backend/                  # FastAPI backend
    api/                    #   Route handlers (regulations, businesses, analyze, alerts)
    core/                   #   Business logic (Gemini client, ChromaDB, matcher)
    db/                     #   SQLite database + seed script
    scripts/                #   Batch analysis script
    cached_responses/       #   Pre-generated Gemini responses
  frontend/                 # Next.js 14 frontend
    app/
      page.tsx              #   Landing / impact page
      dashboard/page.tsx    #   Executive dashboard
      facilities/page.tsx   #   Facility browser
      facilities/[id]/      #   Facility detail
      regulations/page.tsx  #   Regulation browser
      alerts/page.tsx       #   Alert feed
      reports/page.tsx      #   Reports & export
    components/             #   UI components (map, charts, tables, search)
    lib/                    #   API client, types, utilities
  prompts/                  # Gemini prompt engineering workspace
  data/                     # Seed data (regulations, businesses, alerts, GeoJSON)
  justfile                  # Task runner
```

## API Endpoints

```
GET  /api/regulations          List regulations (paginated)
GET  /api/regulations/{id}     Regulation detail with full text
GET  /api/businesses           List businesses (paginated)
GET  /api/businesses/{id}      Business detail with analysis history
POST /api/analyze              Run AI compliance analysis
     Body: { business_id, regulation_id }
GET  /api/alerts               List compliance alerts
GET  /api/health               System health check
```

## Batch Analysis

The first time you access a facility's compliance analysis, it calls Gemini (30-60s). To pre-cache all 15 facilities:

```bash
cd backend && uv run python scripts/batch_analyze.py
```

This runs the two-pass Gemini pipeline for each facility against the core CAFO regulation (E8-26620). Results are cached in SQLite -- subsequent requests return instantly.

## Seeded Data

| Store | Contents |
|-------|----------|
| SQLite `regulations` | 9 CAFO-relevant EPA rules (full text, 22K-1.1M chars each) |
| SQLite `businesses` | 15 NC hog farm profiles from NC DEQ (Duplin, Sampson, Bladen, Wayne, Robeson counties) |
| ChromaDB | ~4,700 regulation text chunks (800-char, 150-char overlap) |
| File cache | 1 pre-generated analysis (Calvin L. Rouse Farm x E8-26620) |
| Alerts | 4 curated compliance alerts referencing real business IDs |

## License

Built for HackDuke: Code for Good.
