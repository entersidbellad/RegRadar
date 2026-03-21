# RegRadar Data Validation Report

## 1. Regulations Data (`regulations_seed.json`)
- **Count**: 20
- **All Have Non-Empty Full Text**: No
- **Titles**: 
  - Air Plan Approval; Colorado; Addressing Remanded Portions of the Previously Approved Infrastructure Requirements for the 2015 Ozone National Ambient Air Quality Standards
  - Air Plan Approval; Mississippi; Update to Materials Incorporated by Reference
  - NPDES Electronic Reporting Rule-Phase 2 Extension
  - Reconsideration of the National Ambient Air Quality Standards for Particulate Matter
  - Air Plan Approval; MS; Revisions to the State Implementation Plan Approved by EPA Through Letter
  - Approval and Promulgation of Implementation Plans; Arkansas; Approval of Regional Haze State Implementation Plan Revision for Electric Generating Units in Arkansas
  - Amendment to Emergency Release Notification Regulations on Reporting Exemption for Air Emissions From Animal Waste at Farms; Emergency Planning and Community Right-to-Know Act
  - Clean Water Act Section 401 Certification Rule
  - NPDES Electronic Reporting Rule Implementation Guidance
  - National Pollutant Discharge Elimination System (NPDES) Municipal Separate Storm Sewer System General Permit Remand Rule
  - Credit Assistance for Water Infrastructure Projects
  - National Pollutant Discharge Elimination System (NPDES) Electronic Reporting Rule
  - National Pollutant Discharge Elimination System (NPDES): Use of Sufficiently Sensitive Test Methods for Permit Applications and Reporting
  - Effluent Limitations Guidelines and Standards for the Construction and Development Point Source Category
  - Approval and Promulgation of Federal Implementation Plan for Oil and Natural Gas Well Production Facilities; Fort Berthold Indian Reservation (Mandan, Hidatsa, and Arikara Nation), North Dakota
  - National Pollutant Discharge Elimination System Permit Regulation for Concentrated Animal Feeding Operations: Removal of Vacated Elements in Response to 2011 Court Decision
  - Approval and Promulgation of Federal Implementation Plan for Oil and Natural Gas Well Production Facilities; Fort Berthold Indian Reservation (Mandan, Hidatsa, and Arikara Nations), ND
  - Identification of Non-Hazardous Secondary Materials That Are Solid Waste
  - Approval and Promulgation of Air Quality Implementation Plans; Mississippi; Update to Materials Incorporated by Reference
  - Approval and Promulgation of Implementation Plans: 1-Hour Ozone Extreme Area Plan for San Joaquin Valley, CA

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
- `data/regulations_seed.json`: 0.03 MB
- `data/cafo_facilities.geojson`: 1.46 MB
- `data/business_profiles.json`: 0.01 MB
- `data/alerts_seed.json`: 0.00 MB