"""
Batch-run compliance analysis for all businesses against the core CAFO regulation.
Results get cached in SQLite, making all subsequent requests instant.

Usage: cd backend && uv run python scripts/batch_analyze.py
"""

import asyncio
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from dotenv import load_dotenv
load_dotenv(Path(__file__).parent.parent / ".env")

from db.database import init_db
from core.matcher import match_business_to_regulation
from db.database import fetch_all


CORE_REGULATION = "E8-26620"


async def main():
    await init_db()

    rows = await fetch_all("SELECT id, name FROM businesses")

    print(f"Batch analyzing {len(rows)} businesses against {CORE_REGULATION}")
    print("=" * 60)

    succeeded = 0
    failed = 0

    for i, row in enumerate(rows, 1):
        bid = row["id"]
        name = row["name"]
        print(f"[{i}/{len(rows)}] {name}...", end=" ", flush=True)
        start = time.time()
        try:
            analysis, analysis_id = await match_business_to_regulation(bid, CORE_REGULATION)
            elapsed = time.time() - start
            status = analysis.overall_status if hasattr(analysis, "overall_status") else analysis.get("overall_status", "?")
            gaps_count = len(analysis.gaps) if hasattr(analysis, "gaps") else len(analysis.get("gaps", []))
            source = "file-cache" if analysis_id == "file-cache" else ("sqlite" if elapsed < 2 else "gemini")
            print(f"{status} (gaps: {gaps_count}, source: {source}) [{elapsed:.1f}s]")
            succeeded += 1
        except Exception as e:
            elapsed = time.time() - start
            print(f"ERROR: {e} [{elapsed:.1f}s]")
            failed += 1

    print("=" * 60)
    print(f"Done! {succeeded} succeeded, {failed} failed.")
    if succeeded > 0:
        print("All results are now cached — subsequent requests are instant.")


if __name__ == "__main__":
    asyncio.run(main())
