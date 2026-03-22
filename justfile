# RegRadar — project task runner
# Usage: just <recipe>
# Requires: just (https://github.com/casey/just), uv, bun

# ── Setup ─────────────────────────────────────────────────────────────────────

# Install all backend Python dependencies
backend-setup:
    cd backend && uv pip install -e ".[dev]"

# Install all frontend JS dependencies
frontend-setup:
    cd frontend && bun install

# Install everything
setup: backend-setup frontend-setup

# ── Database ──────────────────────────────────────────────────────────────────

# Wipe SQLite DB and ChromaDB, then re-seed from data/ directory
seed:
    #!/usr/bin/env bash
    set -euo pipefail
    echo "Wiping old database and vector store..."
    rm -f backend/regradar.db
    rm -rf backend/chroma_data
    echo "Re-seeding from data/..."
    cd backend && uv run python -m db.seed

# ── Run ───────────────────────────────────────────────────────────────────────

# Start the FastAPI backend on port 8000
backend:
    cd backend && uv run uvicorn main:app --reload --port 8000

# Start the Next.js frontend on port 3000
frontend:
    cd frontend && bun run dev

# Start backend and frontend in parallel (both stream to terminal)
dev:
    #!/usr/bin/env bash
    set -euo pipefail
    trap 'kill 0' EXIT
    (cd backend && uv run uvicorn main:app --reload --port 8000) &
    (cd frontend && bun run dev) &
    wait

# ── Prompts ───────────────────────────────────────────────────────────────────

# Run Gemini prompt integration tests against live API
test-prompts:
    cd prompts && uv run python test_prompts.py

# ── Health & Debug ────────────────────────────────────────────────────────────

# Hit the backend health endpoint
health:
    curl -s http://localhost:8000/api/health | python3 -m json.tool

# List regulations currently seeded in SQLite
list-regs:
    python3 backend/scripts/list_regs.py

# Show count of chunks in ChromaDB
chroma-count:
    cd backend && uv run python -c "
    from core.indexing import get_collection_count
    print(f'ChromaDB chunks: {get_collection_count()}')
    "

# ── Build ─────────────────────────────────────────────────────────────────────

# Build the Next.js frontend for production
build:
    cd frontend && bun run build
