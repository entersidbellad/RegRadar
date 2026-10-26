"""
Seed script for loading initial data into SQLite and ChromaDB.

Loads:
  - ../data/regulations_seed.json -> regulations table
  - ../data/business_profiles.json -> businesses table

Then runs the chunking + indexing pipeline on all seeded regulations.

Usage:
    uv run python -m db.seed
"""

import asyncio
import json
import sys
from pathlib import Path
from datetime import datetime, timezone

# Add the backend directory to Python path for imports
backend_dir = Path(__file__).parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from db.database import init_db, get_db, close_db
from core.extraction import extract_text_from_html
from core.chunking import chunk_document
from core.indexing import index_chunks, get_collection_count


DATA_DIR = Path(__file__).parent.parent.parent / "data"


async def seed_regulations():
    """Load regulations from seed file into SQLite."""
    regulations_path = DATA_DIR / "regulations_seed.json"

    if not regulations_path.exists():
        print(f"  [SKIP] Regulations seed file not found: {regulations_path}")
        return []

    with open(regulations_path) as f:
        regulations = json.load(f)

    print(f"  Found {len(regulations)} regulations in seed file")

    async with get_db() as db:
        inserted = 0
        skipped = 0
        for reg in regulations:
            # Check if already exists
            cursor = await db.execute(
                "SELECT id FROM regulations WHERE id = ?", (reg["id"],)
            )
            existing = await cursor.fetchone()
            if existing:
                skipped += 1
                continue

            # CFR references may be a list; store as JSON string
            cfr_refs = reg.get("cfr_references", [])
            if isinstance(cfr_refs, list):
                cfr_refs = json.dumps(cfr_refs)

            await db.execute(
                """INSERT INTO regulations 
                   (id, title, agency, document_type, publication_date, 
                    effective_date, abstract, raw_text_url, full_text, 
                    cfr_references, ingested_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    reg["id"],
                    reg["title"],
                    reg.get("agency", "EPA"),
                    reg.get("document_type", "RULE"),
                    reg["publication_date"],
                    reg.get("effective_date"),
                    reg.get("abstract", ""),
                    reg.get("raw_text_url", ""),
                    reg.get("full_text", ""),
                    cfr_refs,
                    reg.get("ingested_at", datetime.now(timezone.utc).isoformat()),
                ),
            )
            inserted += 1

        await db.commit()
        print(f"  Inserted {inserted} regulations ({skipped} already existed)")
        return regulations


async def seed_businesses():
    """Load business profiles from seed file into SQLite."""
    businesses_path = DATA_DIR / "business_profiles.json"

    if not businesses_path.exists():
        print(f"  [SKIP] Business profiles seed file not found: {businesses_path}")
        return

    with open(businesses_path) as f:
        businesses = json.load(f)

    print(f"  Found {len(businesses)} business profiles in seed file")

    async with get_db() as db:
        inserted = 0
        skipped = 0
        for biz in businesses:
            # Check if already exists
            cursor = await db.execute(
                "SELECT id FROM businesses WHERE id = ?", (biz["id"],)
            )
            existing = await cursor.fetchone()
            if existing:
                skipped += 1
                continue

            await db.execute(
                """INSERT INTO businesses 
                   (id, name, permit_number, naics_code, county, 
                    latitude, longitude, operation_type, head_count, 
                    permit_type, created_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    biz["id"],
                    biz["name"],
                    biz.get("permit_number", ""),
                    biz.get("naics_code", "112210"),
                    biz["county"],
                    biz["latitude"],
                    biz["longitude"],
                    biz.get("operation_type", ""),
                    biz.get("head_count", 0),
                    biz.get("permit_type", "general"),
                    biz.get("created_at", datetime.now(timezone.utc).isoformat()),
                ),
            )
            inserted += 1

        await db.commit()
        print(f"  Inserted {inserted} businesses ({skipped} already existed)")


def index_regulation_chunks(regulations: list[dict]):
    """
    Extract text, chunk, and index all regulations into ChromaDB.
    This is a synchronous operation since ChromaDB is synchronous.
    """
    total_chunks = 0

    for reg in regulations:
        doc_id = reg["id"]
        full_text = reg.get("full_text", "")

        if not full_text:
            print(f"  [SKIP] No full_text for regulation {doc_id}")
            continue

        # Extract clean text from HTML
        clean_text = extract_text_from_html(full_text)

        if not clean_text or len(clean_text) < 100:
            print(f"  [SKIP] Insufficient text for regulation {doc_id} ({len(clean_text)} chars)")
            continue

        # Chunk the document
        cfr_refs = reg.get("cfr_references", [])
        if isinstance(cfr_refs, list):
            cfr_str = json.dumps(cfr_refs)
        else:
            cfr_str = str(cfr_refs)

        chunks = chunk_document(
            doc_id=doc_id,
            text=clean_text,
            agency=reg.get("agency", "EPA"),
            pub_date=reg.get("publication_date", ""),
            cfr_sections=cfr_str,
        )

        if chunks:
            count = index_chunks(chunks)
            total_chunks += count
            print(f"  Indexed {count} chunks for regulation {doc_id}: {reg['title'][:60]}...")

    return total_chunks


async def run_seed():
    """Main seed function that runs all seeding steps."""
    print("=" * 60)
    print("RegRadar Database Seed Script")
    print("=" * 60)

    # 1. Initialize database schema
    print("\n[1/4] Initializing database schema...")
    await init_db()
    print("  Database schema created successfully")

    # 2. Seed regulations
    print("\n[2/4] Seeding regulations...")
    regulations = await seed_regulations()

    # 3. Seed businesses
    print("\n[3/4] Seeding business profiles...")
    await seed_businesses()

    # 4. Chunk and index regulations into ChromaDB
    print("\n[4/4] Chunking and indexing regulations into ChromaDB...")
    if regulations:
        total_chunks = index_regulation_chunks(regulations)
        print(f"  Total chunks indexed: {total_chunks}")
    else:
        print("  [SKIP] No regulations to index")

    total_in_collection = get_collection_count()
    print(f"\n  ChromaDB collection total: {total_in_collection} chunks")

    print("\n" + "=" * 60)
    print("Seed complete!")
    print("=" * 60)


async def main():
    try:
        await run_seed()
    finally:
        await close_db()


if __name__ == "__main__":
    asyncio.run(main())
