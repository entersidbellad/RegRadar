# RegRadar Data Sources & Generation Process

This directory contains the seed data used for the RegRadar platform. The data collection process involved fetching publicly available regulatory and geographical data, cleaning it, and synthesizing business profiles and alerts for application demonstration.

## Data Sources

1. **EPA Regulations (`regulations_seed.json`)**
   - **Source:** [Federal Register API](https://www.federalregister.gov/developers/api/v1)
   - **Details:** We queried the Federal Register API for Environmental Protection Agency (EPA) rules relevant to Concentrated Animal Feeding Operations (CAFOs). Search terms included "CAFO", "animal feeding operation", "nutrient management", and tailored queries for "NPDES permit" targeting swine and livestock. 
   - **Data points:** Document titles, publication and effective dates, full textual content, and applicable CFR references.

2. **NC DEQ CAFO Facilities (`cafo_facilities.geojson`)**
   - **Source:** [NC DEQ ArcGIS REST API](https://services1.arcgis.com/jHkTcnMJhmHfGFNK/arcgis/rest/services/Animal_Operation_Permits/FeatureServer/0)
   - **Details:** We downloaded the complete GeoJSON export for the North Carolina Department of Environmental Quality's (NC DEQ) Animal Operation Permits. The dataset was filtered to remove any facilities without verifiable point geometries (Latitude/Longitude).

## Synthesized Demo Data

To provide a realistic demonstration of the platform's alerting and monitoring capabilities without relying solely on static or fragmented public datasets, we synthesized the following relational entities based on the real sources acquired above.

1. **Business Profiles (`business_profiles.json`)**
   - **Process:** We sampled 15 specific real-world facilities from the `cafo_facilities.geojson` dataset (with target densities representing actual industry hotspots like Duplin and Sampson Counties).
   - **Details:** Each profile maps to the real underlying facility name, permit type, and geographical coordinates. We supplemented these with synthetic attributes required for the RegRadar application logic: a newly generated UUID, realistic `head_count` ranges, and a standardized standard industrial classification (`naics_code: 112210`).

2. **Regulatory Alerts (`alerts_seed.json`)**
   - **Process:** Generated 4 deterministic alert events.
   - **Details:** Built to reflect realistic regulatory pressures (such as NC Supreme Court rulings on permit conditions, or EPA updates to Nutrient Management Plan reporting). Each alert maps its spatial and conceptual target to an array of specific `affected_business_ids` derived from the synthetic `business_profiles.json` dataset.

## Scripts

The `*.py` scripts located in this directory (`task1.py` through `task5.py`) were built to idempotently fetch, parse, structure, synthesize, and ultimately validate this data from scratch. `VALIDATION_REPORT.md` holds the final output invariants recorded at generation time.
