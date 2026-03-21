import urllib.request
import urllib.parse
import json
import time
import os
from datetime import datetime, timezone

def fetch_json(url, retries=1, delay=5):
    for attempt in range(retries + 1):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'RegRadar Data Collection Agent'})
            with urllib.request.urlopen(req) as response:
                return json.loads(response.read().decode())
        except Exception as e:
            if attempt < retries:
                print(f"Failed to fetch {url}. Retrying in {delay} seconds... ({e})")
                time.sleep(delay)
            else:
                print(f"Failed to fetch {url} after {retries} retries. Error: {e}")
                return None

def fetch_text(url, retries=1, delay=5):
    if not url:
        return ""
    for attempt in range(retries + 1):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'RegRadar Data Collection Agent'})
            with urllib.request.urlopen(req) as response:
                return response.read().decode('utf-8', errors='replace')
        except Exception as e:
            if attempt < retries:
                print(f"Failed to fetch text {url}. Retrying in {delay} seconds... ({e})")
                time.sleep(delay)
            else:
                print(f"Failed to fetch text {url} after {retries} retries. Error: {e}")
                return ""

def run_task1():
    print("=== TASK 1: Fetch EPA CAFO regulations from the Federal Register API ===")
    
    terms = [
        "CAFO",
        "animal feeding operation",
        "nutrient management",
        "NPDES permit"
    ]
    
    base_url = "https://www.federalregister.gov/api/v1/documents.json?conditions[agencies][]=environmental-protection-agency&conditions[type][]=RULE&per_page=20&conditions[term]="
    
    all_docs = {}
    
    for term in terms:
        print(f"Fetching regulations for term: '{term}'...")
        url = base_url + urllib.parse.quote(term)
        data = fetch_json(url)
        if not data or 'results' not in data:
            continue
            
        for doc in data['results']:
            doc_id = doc.get('document_number')
            title_lower = doc.get('title', '').lower()
            abstract_lower = doc.get('abstract', '').lower()
            
            # Filter NPDES permit term
            if term == "NPDES permit":
                if not any(k in title_lower or k in abstract_lower for k in ['animal', 'livestock', 'swine']):
                    continue
            
            if doc_id and doc_id not in all_docs:
                all_docs[doc_id] = doc

    docs_to_process = list(all_docs.values())[:20]
    print(f"Found {len(docs_to_process)} deduplicated relevant documents. Fetching full text...")
    
    final_regulations = []
    
    for doc in docs_to_process:
        doc_id = doc.get('document_number')
        print(f"Processing {doc_id}: {doc.get('title', '')[:50]}...")
        
        raw_text_url = doc.get('raw_text_url')
        full_text = fetch_text(raw_text_url) if raw_text_url else ""
            
        cfr = doc.get('cfr_references', [])
        cfr_refs = []
        if cfr:
            for c in cfr:
                title = c.get('title')
                part = c.get('part')
                if title and part:
                    cfr_refs.append(f"{title} CFR {part}")
                    
        reg = {
            "id": doc_id,
            "title": doc.get('title', ''),
            "agency": "EPA",
            "document_type": doc.get('type', 'RULE'),
            "publication_date": doc.get('publication_date', ''),
            "effective_date": doc.get('effective_on'),
            "abstract": doc.get('abstract', ''),
            "raw_text_url": raw_text_url,
            "full_text": full_text,
            "cfr_references": cfr_refs,
            "ingested_at": datetime.now(timezone.utc).isoformat()
        }
        final_regulations.append(reg)
    
    os.makedirs("data", exist_ok=True)
    output_path = "data/regulations_seed.json"
    print(f"Saving {len(final_regulations)} regulations to {output_path}...")
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(final_regulations, f, indent=2, ensure_ascii=False)
    print("TASK 1 COMPLETED.\n")

if __name__ == "__main__":
    run_task1()
