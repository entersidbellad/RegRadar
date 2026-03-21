import json
import os
from collections import Counter

def run_task5():
    print("=== TASK 5: Validation summary ===")
    
    report_lines = []
    report_lines.append("# RegRadar Data Validation Report")
    report_lines.append("")
    
    # 1. regulations_seed.json
    try:
        with open("data/regulations_seed.json", "r", encoding="utf-8") as f:
            regs = json.load(f)
            
        count = len(regs)
        has_full_text = all(bool(r.get("full_text") and r["full_text"].strip()) for r in regs)
        
        report_lines.append("## 1. Regulations Data (`regulations_seed.json`)")
        report_lines.append(f"- **Count**: {count}")
        report_lines.append(f"- **All Have Non-Empty Full Text**: {'Yes' if has_full_text else 'No'}")
        report_lines.append("- **Titles**: ")
        for r in regs:
            report_lines.append(f"  - {r.get('title')}")
        report_lines.append("")
        
        print(f"Regulations count: {count}, All have text: {has_full_text}")
    except Exception as e:
        print(f"Error validating regulations: {e}")
        
    # 2. cafo_facilities.geojson
    try:
        with open("data/cafo_facilities.geojson", "r", encoding="utf-8") as f:
            cafo = json.load(f)
            
        features = cafo.get("features", [])
        
        counties = []
        for feat in features:
            props = feat.get("properties", {})
            county = props.get("County") or props.get("COUNTY") or props.get("county") or "Unknown"
            counties.append(str(county).title())
            
        top_5_counties = Counter(counties).most_common(5)
        
        report_lines.append("## 2. CAFO Facilities GeoJSON (`cafo_facilities.geojson`)")
        report_lines.append(f"- **Total Features**: {len(features)}")
        report_lines.append("- **Top 5 Counties**:")
        for c, c_count in top_5_counties:
            report_lines.append(f"  - {c}: {c_count}")
        report_lines.append("")
        
        print(f"CAFO Features count: {len(features)}")
        print(f"Top 5 Counties: {top_5_counties}")
    except Exception as e:
        print(f"Error validating GeoJSON: {e}")
        
    # 3. business_profiles.json
    try:
        with open("data/business_profiles.json", "r", encoding="utf-8") as f:
            profiles = json.load(f)
            
        prof_counties = Counter([p.get("county", "Unknown") for p in profiles])
        valid_coords = True
        for p in profiles:
            lat = p.get("latitude")
            lng = p.get("longitude")
            if not lat or not lng or not (34.0 <= lat <= 36.5) or not (-80.5 <= lng <= -77.0):
                valid_coords = False
                break
                
        report_lines.append("## 3. Business Profiles (`business_profiles.json`)")
        report_lines.append(f"- **Count**: {len(profiles)}")
        report_lines.append(f"- **Have Valid NC Lat/Lng**: {'Yes' if valid_coords else 'No'}")
        report_lines.append("- **County Distribution**:")
        for c, c_count in prof_counties.items():
            report_lines.append(f"  - {c}: {c_count}")
        report_lines.append("")
        
        print(f"Business Profiles count: {len(profiles)}, Valid coords: {valid_coords}")
    except Exception as e:
        print(f"Error validating business profiles: {e}")
        
    # 4. alerts_seed.json
    try:
        with open("data/alerts_seed.json", "r", encoding="utf-8") as f:
            alerts = json.load(f)
            
        all_profile_ids = {p["id"] for p in profiles} if 'profiles' in locals() else set()
        
        valid_ids = True
        for a in alerts:
            for b_id in a.get("affected_business_ids", []):
                if b_id not in all_profile_ids:
                    valid_ids = False
                    break
                    
        report_lines.append("## 4. Alerts Data (`alerts_seed.json`)")
        report_lines.append(f"- **Count**: {len(alerts)}")
        report_lines.append(f"- **All affected_business_ids exist in profiles**: {'Yes' if valid_ids else 'No'}")
        report_lines.append("")
        
        print(f"Alerts count: {len(alerts)}, all IDs match existing profiles: {valid_ids}")
    except Exception as e:
        print(f"Error validating alerts: {e}")
        
    # 5. File Sizes
    report_lines.append("## 5. File Sizes")
    files = ["data/regulations_seed.json", "data/cafo_facilities.geojson", "data/business_profiles.json", "data/alerts_seed.json"]
    for file in files:
        if os.path.exists(file):
            size_mb = os.path.getsize(file) / (1024 * 1024)
            report_lines.append(f"- `{file}`: {size_mb:.2f} MB")
            print(f"Size of {file}: {size_mb:.2f} MB")
        else:
            report_lines.append(f"- `{file}`: Not Found")
            print(f"{file} missing.")
            
    # Save Report
    output_path = "data/VALIDATION_REPORT.md"
    with open(output_path, "w", encoding="utf-8") as f:
        f.write("\n".join(report_lines))
        
    print(f"\nValidation complete. Report saved to {output_path}.")
    print("TASK 5 COMPLETED.\n")

if __name__ == "__main__":
    run_task5()
