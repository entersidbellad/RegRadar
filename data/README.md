# RegRadar Data Sources & Generation Process

This directory contains the seed data used for the RegRadar platform. The data collection process involved fetching publicly available regulatory and geographical data, cleaning it, and synthesizing business profiles and alerts for application demonstration.

## Data Sources

1. **EPA Regulations (`regulations_seed.json`)**
   - **Source:** [Federal Register API](https://www.federalregister.gov/developers/api/v1)
   - **Method:** Targeted fetch by document ID — NOT keyword search. `task1.py` defines a `TARGET_IDS` dict with 9 specific Federal Register document numbers known to be relevant to NC CAFO hog farming operations.
   - **Data points:** Document titles, publication and effective dates, full textual content (22K–1.1M chars each), and applicable CFR references.
   - **Total:** 9 regulations, 5 core CAFO rules (40 CFR 122/412) + 4 secondary rules affecting farms.

   ### Regulations included

   | ID | Title | CFR | Tier |
   |----|-------|-----|------|
   | `E8-26620` | Revised NPDES/ELG for CAFOs — Waterkeeper response (2008) | 40 CFR 122, 412 | Core |
   | `03-3074` | Original CAFO NPDES Rule (2003) | 40 CFR 122, 412 | Core |
   | `2012-18378` | CAFO NPDES: Removal of vacated elements (2012) | 40 CFR 122 | Core |
   | `E7-14258` | CAFO compliance date extensions (2007) | 40 CFR 122, 412 | Core |
   | `06-1240` | Revised compliance dates — Waterkeeper (2006) | 40 CFR 122, 412 | Core |
   | `E8-30003` | CERCLA/EPCRA air release exemption for farms (2008) | 40 CFR 302, 355 | Secondary |
   | `2019-12411` | EPCRA amendment — animal waste air emissions (2019) | 40 CFR 355 | Secondary |
   | `2022-28595` | WOTUS revised definition (2023) | 33 CFR 328, 40 CFR 120 | Secondary |
   | `2020-21446` | NPDES Electronic Reporting Rule Phase 2 (2020) | 40 CFR 122, 127 | Secondary |

   ### Adding new regulations

   Edit `task1.py` — add document IDs to the `TARGET_IDS` dict, then run:
   ```bash
   python3 data/task1.py    # Fetches from Federal Register API
   just seed                # Re-seeds SQLite + ChromaDB
   ```

2. **NC DEQ CAFO Facilities (`cafo_facilities.geojson`)**
   - **Source:** [NC DEQ ArcGIS REST API](https://services1.arcgis.com/jHkTcnMJhmHfGFNK/arcgis/rest/services/Animal_Operation_Permits/FeatureServer/0)
   - **Details:** Complete GeoJSON export for the NC DEQ Animal Operation Permits. 2,307 facilities after filtering for valid geometries. Top counties: Duplin (489), Sampson (447), Wayne (146), Bladen (132), Greene (101).

## Synthesized Demo Data

1. **Business Profiles (`business_profiles.json`)**
   - **Process:** 15 specific real-world facilities sampled from `cafo_facilities.geojson` (targeting Duplin 6, Sampson 5, Bladen 2, Wayne 1, Robeson 1).
   - **Details:** Each profile maps to a real facility name, permit type, and coordinates. Supplemented with synthetic `head_count` (1013–4965 range), UUID, and standardized NAICS code (`112210`). All have `permit_type: "general"` and `operation_type: "Swine State COC"`.

2. **Regulatory Alerts (`alerts_seed.json`)**
   - **Process:** 4 deterministic alert events.
   - **Details:** Reflects realistic regulatory pressures: NC Supreme Court ruling on CAFO permit conditions (high), EPA CAFO nutrient management updates (high), NC DEQ lagoon setback proposal (medium), and EPA Region 4 inspection initiative (low). Each alert references actual `business_id` values from `business_profiles.json`.

## Scripts

| Script | Purpose |
|--------|---------|
| `task1.py` | Fetch regulations from Federal Register API by targeted document ID |
| `task2.py` | Download NC DEQ CAFO facility GeoJSON from ArcGIS REST API |
| `task3.py` | Sample 15 business profiles from GeoJSON with county-weighted selection |
| `task4.py` | Generate 4 demo alerts referencing business IDs from profiles |
| `task5.py` | Validate all seed files and produce `VALIDATION_REPORT.md` |

## Validation

`VALIDATION_REPORT.md` confirms:
- 9 regulations, all with non-empty full text
- 2,307 CAFO facilities in GeoJSON
- 15 business profiles with valid NC lat/lng
- 4 alerts with all `affected_business_ids` matching existing profiles
