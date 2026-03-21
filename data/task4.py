import json
from datetime import datetime, timezone, timedelta

def run_task4():
    print("=== TASK 4: Create demo alerts data ===")
    
    with open("data/business_profiles.json", "r", encoding="utf-8") as f:
        profiles = json.load(f)
        
    duplin_ids = [p["id"] for p in profiles if "Duplin" in p["county"]]
    sampson_ids = [p["id"] for p in profiles if "Sampson" in p["county"]]
    bladen_ids = [p["id"] for p in profiles if "Bladen" in p["county"]]
    robeson_ids = [p["id"] for p in profiles if "Robeson" in p["county"]]
    wayne_ids = [p["id"] for p in profiles if "Wayne" in p["county"]]
    
    all_counties_ids = [p["id"] for p in profiles]
    
    # Try find an actual EPA NMP regulation from our seed
    try:
        with open("data/regulations_seed.json", "r", encoding="utf-8") as f:
            regs = json.load(f)
            # Find one matching nutrient management or CAFO
            nmp_regs = [r for r in regs if "nutrient" in r["title"].lower() or "cafo" in r["title"].lower()]
            epa_reg_id = nmp_regs[0]["id"] if nmp_regs else "epa-cafo-nmp-2025"
    except Exception:
        epa_reg_id = "epa-cafo-nmp-2025"
        
    now = datetime.now(timezone.utc)
    
    # Alert 1: 3 businesses from Duplin County
    alert1_ids = duplin_ids[:3] if len(duplin_ids) >= 3 else duplin_ids
    
    # Alert 2: 4 businesses, mix of Duplin and Sampson
    alert2_ids = duplin_ids[-2:] + sampson_ids[:2]
    
    # Alert 3: 2 businesses from Bladen or Robeson
    bladen_robeson = bladen_ids + robeson_ids
    alert3_ids = bladen_robeson[:2]
    
    # Alert 4: 5 businesses, spread
    alert4_ids = duplin_ids[:1] + sampson_ids[-1:] + bladen_ids[:1] + robeson_ids[:1] + wayne_ids[:1]
    if len(alert4_ids) < 5:
        # Just grab from all to fill 5
        alert4_ids.extend([i for i in all_counties_ids if i not in alert4_ids][:5 - len(alert4_ids)])
    
    alerts = [
        {
            "id": "alert-001",
            "regulation_title": "NC Supreme Court Strikes Down Three CAFO Permit Conditions",
            "regulation_id": "nc-supreme-court-cafo-2025",
            "affected_business_ids": alert1_ids,
            "severity": "high",
            "timestamp": "2025-11-15T14:30:00Z",
            "description": "The NC Supreme Court ruled that three permit conditions for hog farm CAFOs are unenforceable: annual facility reporting, groundwater monitoring, and phosphorus testing requirements. Affected facilities should review their compliance obligations under the remaining permit conditions."
        },
        {
            "id": "alert-002",
            "regulation_title": "EPA Updates CAFO Nutrient Management Plan Reporting Requirements",
            "regulation_id": epa_reg_id,
            "affected_business_ids": alert2_ids,
            "severity": "high",
            "timestamp": now.isoformat(),
            "description": "EPA has updated nutrient management plan documentation and reporting requirements for Large CAFOs under 40 CFR 122.42. Facilities with more than 2,500 swine must submit updated NMPs within 180 days of the effective date."
        },
        {
            "id": "alert-003",
            "regulation_title": "NC DEQ Proposes Revised Setback Requirements for Waste Lagoons",
            "regulation_id": "nc-deq-setback-2026",
            "affected_business_ids": alert3_ids,
            "severity": "medium",
            "timestamp": (now - timedelta(days=2)).isoformat(),
            "description": "NC DEQ has proposed amendments to 15A NCAC 02T .1307 increasing minimum setback distances for new and expanded animal waste lagoons from 500 feet to 750 feet from property lines and occupied residences."
        },
        {
            "id": "alert-004",
            "regulation_title": "EPA Announces Enhanced CAFO Inspection Initiative for Southeast Region",
            "regulation_id": "epa-cafo-inspection-2026",
            "affected_business_ids": alert4_ids,
            "severity": "low",
            "timestamp": (now - timedelta(days=5)).isoformat(),
            "description": "EPA Region 4 has announced an expanded inspection initiative targeting CAFO facilities in NC, SC, and GA. Facilities should ensure all permits, waste management plans, and discharge monitoring reports are current and accessible."
        }
    ]
    
    with open("data/alerts_seed.json", "w", encoding="utf-8") as f:
        json.dump(alerts, f, indent=2)
        
    print("Saved 4 alerts to data/alerts_seed.json.")
    print("TASK 4 COMPLETED.\n")

if __name__ == "__main__":
    run_task4()
