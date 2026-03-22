import urllib.request
import json
import time
import os
from datetime import datetime, timezone


# ---------------------------------------------------------------------------
# Target regulations — all confirmed CAFO-relevant via Federal Register API
# ---------------------------------------------------------------------------
#
# Tier 1 (Core): Direct CAFO NPDES/ELG obligations under 40 CFR 122 & 412
# Tier 2 (Secondary): Reporting and jurisdictional rules that affect farms
#
TARGET_IDS = {
    # --- Tier 1: Core CAFO permit and effluent rules ---
    "E8-26620": {
        "desc": "Revised NPDES Permit Regulation & ELG for CAFOs — Waterkeeper response",
        "tier": "core",
        "cfr": ["40 CFR 122", "40 CFR 412"],
    },
    "03-3074": {
        "desc": "Original CAFO NPDES Rule — foundational permit and NMP requirements",
        "tier": "core",
        "cfr": ["40 CFR 122", "40 CFR 412"],
    },
    "2012-18378": {
        "desc": "CAFO NPDES: Removal of vacated 'propose to discharge' elements",
        "tier": "core",
        "cfr": ["40 CFR 122"],
    },
    "E7-14258": {
        "desc": "CAFO compliance date extensions — Waterkeeper litigation",
        "tier": "core",
        "cfr": ["40 CFR 122", "40 CFR 412"],
    },
    "06-1240": {
        "desc": "Revised compliance dates for CAFO NPDES/ELG — Waterkeeper (2006)",
        "tier": "core",
        "cfr": ["40 CFR 122", "40 CFR 412"],
    },
    # --- Tier 2: Secondary rules that apply to farms ---
    "E8-30003": {
        "desc": "CERCLA/EPCRA reporting exemption for air releases from animal waste at farms",
        "tier": "secondary",
        "cfr": ["40 CFR 302", "40 CFR 355"],
    },
    "2019-12411": {
        "desc": "EPCRA amendment: animal waste air emission reporting exemption codified",
        "tier": "secondary",
        "cfr": ["40 CFR 355"],
    },
    "2022-28595": {
        "desc": "Revised definition of 'Waters of the United States' (WOTUS 2023)",
        "tier": "secondary",
        "cfr": ["33 CFR 328", "40 CFR 120"],
    },
    "2020-21446": {
        "desc": "NPDES Electronic Reporting Rule — Phase 2 extension (eReporting for CAFOs)",
        "tier": "secondary",
        "cfr": ["40 CFR 122", "40 CFR 127"],
    },
}

FR_API_BASE = "https://www.federalregister.gov/api/v1"
FIELDS = [
    "document_number", "title", "agency_names", "type",
    "publication_date", "effective_on", "abstract",
    "raw_text_url", "cfr_references",
]


def fetch_json(url, retries=2, delay=5):
    for attempt in range(retries + 1):
        try:
            req = urllib.request.Request(
                url, headers={"User-Agent": "RegRadar Data Collection Agent"}
            )
            with urllib.request.urlopen(req, timeout=30) as response:
                return json.loads(response.read().decode())
        except Exception as e:
            if attempt < retries:
                print(f"  Retry {attempt+1}/{retries} for {url[:80]}... ({e})")
                time.sleep(delay)
            else:
                print(f"  FAILED after {retries} retries: {e}")
                return None


def fetch_text(url, retries=2, delay=5):
    if not url:
        return ""
    for attempt in range(retries + 1):
        try:
            req = urllib.request.Request(
                url, headers={"User-Agent": "RegRadar Data Collection Agent"}
            )
            with urllib.request.urlopen(req, timeout=120) as response:
                return response.read().decode("utf-8", errors="replace")
        except Exception as e:
            if attempt < retries:
                print(f"  Retry {attempt+1}/{retries} for text {url[:80]}... ({e})")
                time.sleep(delay)
            else:
                print(f"  FAILED fetching text after {retries} retries: {e}")
                return ""


def run_task1():
    print("=== TASK 1: Fetch CAFO-relevant EPA regulations from Federal Register ===")
    print(f"Targeting {len(TARGET_IDS)} known CAFO regulations by document ID.\n")

    final_regulations = []
    fields_param = "&".join(f"fields[]={f}" for f in FIELDS)

    for doc_id, meta in TARGET_IDS.items():
        print(f"[{meta['tier'].upper()}] Fetching {doc_id}: {meta['desc'][:60]}...")

        url = f"{FR_API_BASE}/documents/{doc_id}.json?{fields_param}"
        doc = fetch_json(url)

        if not doc or "document_number" not in doc:
            print(f"  SKIPPED — could not fetch metadata for {doc_id}\n")
            continue

        raw_text_url = doc.get("raw_text_url", "")
        print(f"  Fetching full text from {raw_text_url[:70]}...")
        full_text = fetch_text(raw_text_url)
        print(f"  Full text: {len(full_text):,} chars")

        # Build CFR references list from API response, fall back to our known list
        cfr_refs = []
        for c in doc.get("cfr_references", []):
            t = c.get("title")
            p = c.get("part")
            if t and p:
                cfr_refs.append(f"{t} CFR {p}")
        if not cfr_refs:
            cfr_refs = meta["cfr"]

        agency_names = doc.get("agency_names", [])
        if any("Environmental Protection" in a for a in agency_names):
            agency = "EPA"
        elif agency_names:
            agency = agency_names[0]
        else:
            agency = "EPA"

        reg = {
            "id": doc.get("document_number", doc_id),
            "title": doc.get("title", ""),
            "agency": agency,
            "document_type": doc.get("type", "RULE"),
            "publication_date": doc.get("publication_date", ""),
            "effective_date": doc.get("effective_on"),
            "abstract": doc.get("abstract", ""),
            "raw_text_url": raw_text_url,
            "full_text": full_text,
            "cfr_references": cfr_refs,
            "cafo_tier": meta["tier"],
            "ingested_at": datetime.now(timezone.utc).isoformat(),
        }
        final_regulations.append(reg)
        print(f"  OK\n")

    os.makedirs("data", exist_ok=True)
    output_path = "data/regulations_seed.json"
    print(f"Saving {len(final_regulations)} regulations to {output_path}...")
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(final_regulations, f, indent=2, ensure_ascii=False)

    # Summary
    print("\n=== SUMMARY ===")
    total_chars = 0
    for reg in final_regulations:
        ft_len = len(reg.get("full_text", ""))
        total_chars += ft_len
        tier = reg.get("cafo_tier", "?")
        print(f"  [{tier:9s}] {reg['id']:12s} | {ft_len:>9,} chars | {reg['title'][:65]}")
    print(f"\n  Total: {len(final_regulations)} regulations, {total_chars:,} chars of full text")
    file_size_mb = os.path.getsize(output_path) / (1024 * 1024)
    print(f"  File size: {file_size_mb:.2f} MB")
    print("\nTASK 1 COMPLETED.\n")


if __name__ == "__main__":
    run_task1()
