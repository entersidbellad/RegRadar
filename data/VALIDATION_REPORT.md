# RegRadar Data Validation Report

## 1. Regulations Data (`regulations_seed.json`)
- **Count**: 9
- **All Have Non-Empty Full Text**: Yes
- **Titles**: 
  - Revised National Pollutant Discharge Elimination System Permit Regulation and Effluent Limitations Guidelines for Concentrated Animal Feeding Operations in Response to the Waterkeeper Decision
  - National Pollutant Discharge Elimination System Permit Regulation and Effluent Limitation Guidelines and Standards for Concentrated Animal Feeding Operations (CAFOs)
  - National Pollutant Discharge Elimination System Permit Regulation for Concentrated Animal Feeding Operations: Removal of Vacated Elements in Response to 2011 Court Decision
  - Revised Compliance Dates Under the National Pollutant Discharge Elimination System Permit Regulations and Effluent Limitations Guidelines and Standards for Concentrated Animal Feeding Operations
  - Revised Compliance Dates for National Pollutant Discharge Elimination System Permit Regulation and Effluent Limitation Guidelines for Concentrated Animal Feeding Operations
  - CERCLA/EPCRA Administrative Reporting Exemption for Air Releases of Hazardous Substances From Animal Waste at Farms
  - Amendment to Emergency Release Notification Regulations on Reporting Exemption for Air Emissions From Animal Waste at Farms; Emergency Planning and Community Right-to-Know Act
  - Revised Definition of “Waters of the United States”
  - NPDES Electronic Reporting Rule-Phase 2 Extension

## 2. CAFO Facilities GeoJSON (`cafo_facilities.geojson`)
- **Total Features**: 2307
- **Top 5 Counties**:
  - Duplin: 489
  - Sampson: 447
  - Wayne: 146
  - Bladen: 132
  - Greene: 101

## 3. Business Profiles (`business_profiles.json`)
- **Count**: 15
- **Have Valid NC Lat/Lng**: Yes
- **County Distribution**:
  - Duplin: 6
  - Sampson: 5
  - Bladen: 2
  - Wayne: 1
  - Robeson: 1

## 4. Alerts Data (`alerts_seed.json`)
- **Count**: 4
- **All affected_business_ids exist in profiles**: Yes

## 5. File Sizes
- `data/regulations_seed.json`: 2.62 MB
- `data/cafo_facilities.geojson`: 1.86 MB
- `data/business_profiles.json`: 0.01 MB
- `data/alerts_seed.json`: 0.00 MB