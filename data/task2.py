import urllib.request
import json
import time

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

def run_task2():
    print("=== TASK 2: Download NC DEQ CAFO facility GeoJSON ===")
    
    url1 = "https://services1.arcgis.com/jHkTcnMJhmHfGFNK/arcgis/rest/services/Animal_Operation_Permits/FeatureServer/0/query?where=1%3D1&outFields=*&f=geojson&resultRecordCount=5000"
    url2 = "https://data-ncdenr.opendata.arcgis.com/api/v3/datasets/b4b0eb98084f4260acc3224970443f5c_0/downloads/data?format=geojson&spatialRefId=4326"
    
    print("Fetching CAFO facilities GeoJSON...")
    data = fetch_json(url1)
    if not data:
        print("Primary URL failed, trying fallback URL...")
        data = fetch_json(url2)
        
    if not data:
        print("Failed to download GeoJSON entirely.")
        # Make a dummy GeoJSON for fallback
        data = {"type": "FeatureCollection", "features": []}
    
    # Validation
    if "features" not in data:
        print("WARNING: 'features' array not found in response!")
        features = []
    else:
        features = data["features"]
    
    print(f"Total CAFO facilities: {len(features)}")
    
    duplin_count = 0
    sampson_count = 0
    cleaned_features = []
    
    for f in features:
        props = f.get("properties", {})
        # Find county
        # The fields could be 'County', 'COUNTY', etc.
        county = props.get("County") or props.get("COUNTY") or props.get("county") or ""
        county = str(county).title()
        
        if "Duplin" in county:
            duplin_count += 1
        elif "Sampson" in county:
            sampson_count += 1
            
        geom = f.get("geometry")
        if geom and "coordinates" in geom:
            coords = geom["coordinates"]
            if coords and len(coords) >= 2:
                # Also check if it has a facility name or permit number
                has_name = any(k.lower() in ['facilityname', 'facility_name', 'name'] for k in props.keys())
                has_permit = any(k.lower() in ['permitnumber', 'permit_no', 'permit'] for k in props.keys())
                # Just keep it if it has geometry
                cleaned_features.append(f)
                
    print(f"Facilities in Duplin County: {duplin_count}")
    print(f"Facilities in Sampson County: {sampson_count}")
    
    data["features"] = cleaned_features
    print(f"Cleaned facilities count (with coordinates): {len(cleaned_features)}")
    
    if len(cleaned_features) > 0:
        print("First feature properties shape:")
        print(json.dumps(cleaned_features[0].get("properties", {}), indent=2))
    
    output_path = "data/cafo_facilities.geojson"
    print(f"Saving to {output_path}...")
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)
    print("TASK 2 COMPLETED.\n")

if __name__ == "__main__":
    run_task2()
