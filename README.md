# RegRadar

AI-powered environmental compliance monitoring for NC hog farm CAFOs. Scrapes federal regulations, matches them against facility profiles, and generates plain-language compliance gap analyses using Gemini 2.5 Flash.

## Prerequisites

| Tool | Install |
|------|---------|
| [uv](https://docs.astral.sh/uv/) | `curl -LsSf https://astral.sh/uv/install.sh \| sh` |
| [bun](https://bun.sh) | `curl -fsSL https://bun.sh/install \| bash` |
| [just](https://github.com/casey/just) | `brew install just` — or see [other install options](https://just.systems/man/en/packages.html) |
| Python 3.13+ | Managed automatically by `uv` |
| Node 18+ | Managed automatically by `bun` |

## Quick start

```bash
# 1. Clone
git clone https://github.com/your-org/regradar.git
cd regradar

# 2. Install dependencies
just setup

# 3. Add your Gemini API key (get one free at https://aistudio.google.com)
echo "GEMINI_API_KEY=your_key_here" > backend/.env

# 4. Create frontend env file
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > frontend/.env.local
echo "NEXT_PUBLIC_USE_MOCKS=false" >> frontend/.env.local

# 5. Seed the database (SQLite + ChromaDB) from data/
just seed

# 6. Start everything
just dev
```

Then open [http://localhost:3000](http://localhost:3000).

## All commands

```
just setup          # Install all backend (uv) and frontend (bun) dependencies
just seed           # Wipe DB + ChromaDB and re-seed from data/ directory
just dev            # Start backend (port 8000) + frontend (port 3000) in parallel
just backend        # Start FastAPI backend only
just frontend       # Start Next.js frontend only
just build          # Production build of the frontend
just health         # Hit GET /api/health and print JSON
just list-regs      # List regulations currently in the database
just chroma-count   # Print number of chunks indexed in ChromaDB
just test-prompts   # Run Gemini prompt integration tests (prompts/ workstream)
```

## Environment variables

**`backend/.env`**
```
GEMINI_API_KEY=          # Required. Get free at https://aistudio.google.com
CHROMA_PERSIST_DIR=./chroma_data   # Default. ChromaDB storage path
SQLITE_DB_PATH=./regradar.db       # Default. SQLite database path
```

**`frontend/.env.local`**
```
NEXT_PUBLIC_API_URL=http://localhost:8000   # Backend URL
NEXT_PUBLIC_USE_MOCKS=false                 # Set true to run frontend without backend
```

## Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python 3.13, FastAPI, aiosqlite |
| LLM | Google Gemini 2.5 Flash (`google-genai` SDK) |
| Vector DB | ChromaDB (embedded) + `all-MiniLM-L6-v2` embeddings |
| Frontend | Next.js 14, TypeScript, shadcn/ui, Tailwind CSS |
| Map | React Leaflet + OpenStreetMap |
| Package managers | `uv` (Python), `bun` (JS) — no pip/npm |

## Project structure

```
backend/       FastAPI app, Gemini client, ChromaDB indexing, SQLite
frontend/      Next.js 14 app — dashboard, map, alerts
prompts/       Gemini prompt engineering — system prompts, builders, tests
data/          Seed data — regulations, business profiles, CAFO GeoJSON
justfile       Task runner (all commands above)
```
