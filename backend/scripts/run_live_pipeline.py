"""
Run the RegRadar pipeline live against specific Federal Register documents.

For each document number:
  1. Fetch metadata + full text from the Federal Register API
  2. Pass 1: extract compliance requirements (one Gemini call per document)
  3. Alert classification: which of the farm profiles are affected (one call per document)
  4. Pass 2: gap analysis for the farms flagged as affected (one call per farm);
     the others are recorded as compliant / not applicable
Outputs go to backend/cached_responses/ (analyses), data/regulations_seed.json
and data/alerts_seed.json, so `bun run demo-data` can rebuild the demo dataset.

Usage (GEMINI_API_KEY in env, never written anywhere):
  cd backend && GEMINI_MODEL=gemini-3.1-pro-preview python scripts/run_live_pipeline.py 2026-20849 2026-18317 --baseline E8-26620
"""

import asyncio
import json
import re
import sys
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from core import gemini_client as gc  # noqa: E402
from core.prompt_builder import (  # noqa: E402
    build_alert_classification_prompt,
    build_extraction_prompt,
    build_gap_analysis_prompt,
)

DATA = ROOT.parent / "data"
CACHE = ROOT / "cached_responses"
FR = "https://www.federalregister.gov/api/v1/documents"
MAX_TEXT_CHARS = 600_000  # safety cap per document
CONCURRENCY = 5
# Documents whose full text is too large to store in the seed file keep only the abstract + URL.
STORE_FULL_TEXT_MAX = 100_000
MAX_STORED_REQS = 25  # keep demo files small; the gap analysis itself saw every extracted requirement


def fetch(url: str) -> bytes:
    return urllib.request.urlopen(url, timeout=60).read()


def load_doc(num: str) -> dict:
    meta = json.loads(fetch(f"{FR}/{num}.json"))
    text = fetch(meta["raw_text_url"]).decode("utf-8", "replace")
    agency = "EPA" if any("Environmental Protection" in a["name"] for a in meta["agencies"]) else (
        meta["agencies"][0]["name"] if meta["agencies"] else "UNKNOWN"
    )
    return {
        "id": num,
        "title": meta["title"],
        "agency": agency,
        "document_type": meta["type"],
        "publication_date": meta["publication_date"],
        "effective_date": meta.get("effective_on"),
        "abstract": re.sub(r"\s+", " ", meta.get("abstract") or "").strip(),
        "raw_text_url": meta["raw_text_url"],
        "html_url": meta["html_url"],
        "full_text": text[:MAX_TEXT_CHARS],
        "cfr_references": [f"{c['title']} CFR {c['part']}" for c in meta.get("cfr_references", [])],
    }


async def run_doc(client, doc: dict, farms: list[dict], now: str, baseline: bool = False) -> dict:
    sem = asyncio.Semaphore(CONCURRENCY)
    u0 = dict(gc.USAGE)
    sys_x, user_x = build_extraction_prompt(doc["full_text"])
    ext = await gc._call_gemini(client, sys_x, user_x, gc._ExtractionResult.model_json_schema())
    reqs = []
    for r in ext.get("requirements", []):
        try:
            reqs.append(gc.ComplianceRequirement(**r))
        except Exception:
            pass
    reqs_json = json.dumps([r.model_dump() for r in reqs], indent=2)
    print(f"[{doc['id']}] extracted {len(reqs)} requirements", flush=True)

    # Applicability triage: one call classifies all farms. Only farms flagged as
    # affected get the (expensive) per-farm gap analysis; the rest are recorded as
    # compliant / not applicable using the classifier's reason.
    # baseline=True: an existing foundational rule (already in regulations_seed.json) that applies
    # by size/permit rather than as "news" -> skip triage and gap-analyse every farm.
    sys_a, user_a = build_alert_classification_prompt(doc, farms)
    alert_schema = {
        "type": "array",
        "items": {
            "type": "object",
            "properties": {
                "business_id": {"type": "string"},
                "affected": {"type": "boolean"},
                "severity": {"type": "string", "enum": ["high", "medium", "low"]},
                "reason": {"type": "string"},
            },
            "required": ["business_id", "affected", "severity", "reason"],
        },
    }
    alerts = [] if baseline else await gc._call_gemini(client, sys_a, user_a, alert_schema)
    by_id = {a["business_id"]: a for a in alerts}
    if baseline:
        by_id = {f["id"]: {"affected": True} for f in farms}
    n_aff = sum(1 for f in farms if by_id.get(f["id"], {}).get("affected") and reqs)
    print(f"[{doc['id']}] classifier: {n_aff}/{len(farms)} farms affected", flush=True)

    def not_applicable(farm):
        a = by_id.get(farm["id"], {})
        reason = (a.get("reason") or "This regulation creates no new obligations for this facility.").strip()
        if not reason.lower().startswith("not applicable"):
            reason = "Not applicable: " + reason
        return gc.ComplianceGapAnalysis(
            business_name=farm["name"], business_id=farm["id"],
            regulation_name=doc["title"], regulation_id=doc["id"], analysis_date=now,
            overall_status="compliant", confidence_score=0.9, requirements=[],
            gaps=[], recommended_actions=[], summary=reason,
        )

    async def one(farm):
        a = by_id.get(farm["id"], {})
        if not (a.get("affected") and reqs):
            return not_applicable(farm)
        async with sem:
            sys_g, user_g = build_gap_analysis_prompt(reqs_json, farm)
            raw = await gc._call_gemini(client, sys_g, user_g, gc.ComplianceGapAnalysis.model_json_schema())
            raw["business_id"], raw["business_name"] = farm["id"], farm["name"]
            raw["regulation_id"], raw["regulation_name"] = doc["id"], doc["title"]
            raw["analysis_date"] = now
            raw["requirements"] = [r.model_dump() for r in reqs[:MAX_STORED_REQS]]  # pass-1 requirements verbatim
            return gc.ComplianceGapAnalysis(**raw)

    results = await asyncio.gather(*(one(f) for f in farms))
    for a in results:
        biz = a.business_id.replace("-", "")[:12]
        path = CACHE / f"{biz}_{doc['id'].replace('-', '_')}.json"
        path.write_text(json.dumps(
            {"business_id": a.business_id, "regulation_id": doc["id"], "gap_analysis": a.model_dump()},
            indent=1) + "\n")
    used = {k: gc.USAGE[k] - u0[k] for k in u0}
    print(f"[{doc['id']}] usage {used}", flush=True)
    return {"doc": doc, "n_reqs": len(reqs), "alerts": alerts if reqs else [], "results": results}


async def main(nums: list[str], baseline_nums: list[str]):
    farms = json.loads((DATA / "business_profiles.json").read_text())
    now = datetime.now(timezone.utc).isoformat()
    client = gc._get_client()
    docs = [load_doc(n) for n in nums]
    outs = [await run_doc(client, d, farms, now) for d in docs]
    for n in baseline_nums:  # baseline docs: analyses only, seeds/alerts untouched
        await run_doc(client, load_doc(n), farms, now, baseline=True)

    # Regulations seed: add/replace entries (full_text only kept for small documents)
    regs_path = DATA / "regulations_seed.json"
    regs = json.loads(regs_path.read_text())
    for o in outs:
        d = o["doc"]
        entry = {
            "id": d["id"], "title": d["title"], "agency": d["agency"],
            "document_type": d["document_type"], "publication_date": d["publication_date"],
            "effective_date": d["effective_date"], "abstract": d["abstract"],
            "raw_text_url": d["raw_text_url"],
            "full_text": d["full_text"] if len(d["full_text"]) <= STORE_FULL_TEXT_MAX else "",
            "cfr_references": d["cfr_references"], "cafo_tier": "live-2026-10-26",
            "ingested_at": now,
        }
        regs = [r for r in regs if r["id"] != d["id"]]
        regs.insert(0, entry)
    regs_path.write_text(json.dumps(regs, indent=2, ensure_ascii=False))

    # Alerts seed: one alert per document that affects >=1 farm
    alerts_path = DATA / "alerts_seed.json"
    alerts = json.loads(alerts_path.read_text())
    sev_rank = {"low": 0, "medium": 1, "high": 2}
    for o in outs:
        d = o["doc"]
        aff = [a for a in o["alerts"] if a["affected"]]
        alerts = [a for a in alerts if a["regulation_id"] != d["id"]]
        if not aff:
            continue
        sev = max((a["severity"] for a in aff), key=lambda s: sev_rank[s])
        alerts.insert(0, {
            "id": f"alert-live-{d['id']}",
            "regulation_title": d["title"],
            "regulation_id": d["id"],
            "affected_business_ids": [a["business_id"] for a in aff],
            "severity": sev,
            "timestamp": now,
            "description": f"{d['agency']} {d['document_type']} published {d['publication_date']}: {aff[0]['reason']}",
        })
    alerts_path.write_text(json.dumps(alerts, indent=2, ensure_ascii=False))

    print(f"model={gc.GEMINI_MODEL} usage={gc.USAGE}")
    for o in outs:
        c = {}
        for a in o["results"]:
            c[a.overall_status] = c.get(a.overall_status, 0) + 1
        print(o["doc"]["id"], "reqs", o["n_reqs"], "status", c, "alert-affected", sum(a["affected"] for a in o["alerts"]))


if __name__ == "__main__":
    args = sys.argv[1:]
    base = args[args.index("--baseline") + 1:] if "--baseline" in args else []
    asyncio.run(main([a for a in args if a != "--baseline" and a not in base], base))
