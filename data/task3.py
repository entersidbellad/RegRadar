import json
import uuid
import random
from datetime import datetime, timezone

def run_task3():
    print("=== TASK 3: Build business profiles from the CAFO GeoJSON ===")
    
    with open("data/cafo_facilities.geojson", "r", encoding="utf-8") as f:
        data = json.load(f)
        
    features = data.get("features", [])
    
    duplin_pool = []
    sampson_pool = []
    bladen_pool = []
    wayne_robeson_pool = []
    
    for f in features:
        props = f.get("properties", {})
        county = props.get("County") or props.get("COUNTY") or props.get("county") or ""
        county = str(county).title()
        
        if "Duplin" in county:
            duplin_pool.append(f)
        elif "Sampson" in county:
            sampson_pool.append(f)
        elif "Bladen" in county:
            bladen_pool.append(f)
        elif "Wayne" in county or "Robeson" in county:
            wayne_robeson_pool.append(f)
            
    # Select specific counts
    selected = []
    
    random.seed(42) # For reproducibility
    
    if len(duplin_pool) >= 6:
        selected.extend(random.sample(duplin_pool, 6))
    else:
        selected.extend(duplin_pool)
        
    if len(sampson_pool) >= 5:
        selected.extend(random.sample(sampson_pool, 5))
    else:
        selected.extend(sampson_pool)
        
    if len(bladen_pool) >= 2:
        selected.extend(random.sample(bladen_pool, 2))
    else:
        selected.extend(bladen_pool)
        
    if len(wayne_robeson_pool) >= 2:
        selected.extend(random.sample(wayne_robeson_pool, 2))
    else:
        selected.extend(wayne_robeson_pool)
        
    print(f"Selected {len(selected)} facilities for profiling.")
    
    profiles = []
    
    for f in selected:
        props = f.get("properties", {})
        geom = f.get("geometry", {})
        coords = geom.get("coordinates", [0, 0])
        lng = coords[0]
        lat = coords[1]
        
        county = props.get("County") or props.get("COUNTY") or props.get("county") or ""
        county = str(county).title()
        
        facility_name = props.get("Facility") or props.get("FacilityName") or props.get("Name") or f"Unknown Facility {str(uuid.uuid4())[:8]}"
        permit_num = props.get("Permit") or props.get("PermitNumber") or "NC-CAFO-XXXX"
        operation_type = props.get("Type") or "swine, farrow-to-finish"
        
        if "Duplin" in county or "Sampson" in county:
            head_count = random.randint(2500, 5000)
        else:
            head_count = random.randint(1000, 2500)
            
        profile = {
            "id": str(uuid.uuid4()),
            "name": facility_name,
            "permit_number": permit_num,
            "naics_code": "112210",
            "county": county,
            "latitude": lat,
            "longitude": lng,
            "operation_type": operation_type,
            "head_count": head_count,
            "permit_type": "general",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        profiles.append(profile)
        
    output_path = "data/business_profiles.json"
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(profiles, f, indent=2)
        
    print(f"Saved {len(profiles)} business profiles to {output_path}.")
    print("TASK 3 COMPLETED.\n")

if __name__ == "__main__":
    run_task3()
