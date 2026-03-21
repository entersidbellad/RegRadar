# VALIDATION REPORT
Verdict: READY
Validation Run: 2026-03-21T16:48:19.418086

## CHECKS:
=== CHECK 1: FILE INVENTORY ===
PASS: data/regulations_seed.json exists, size 28392 bytes
PASS: data/business_profiles.json exists, size 5959 bytes
PASS: data/cafo_facilities.geojson exists, size 1526197 bytes
PASS: data/alerts_seed.json exists, size 2792 bytes

=== CHECK 2: REGULATIONS QUALITY ===
Total regulations: 12
Valid full_text count: 12
Average full_text length: 391630

=== CHECK 3: GEOJSON INTEGRITY ===
PASS: Valid FeatureCollection
Total features: 2307
Property fields available: ['FID', 'Permit', 'Permittee', 'Facility', 'Type', 'Region', 'County', 'FirstIssue', 'Issued', 'Expries', 'Status', 'Latitude', 'Longitude']
Top 10 counties: [('Duplin', 489), ('Sampson', 447), ('Wayne', 146), ('Bladen', 132), ('Greene', 101), ('Lenoir', 75), ('Pender', 60), ('Johnston', 58), ('Onslow', 56), ('Robeson', 51)]
Summary: total=2307, valid_coords=2307, top_5_counties=[('Duplin', 489), ('Sampson', 447), ('Wayne', 146), ('Bladen', 132), ('Greene', 101)]

=== CHECK 4: BUSINESS PROFILES ===
PASS: Business profiles >= 12 entries
MATCHED: Calvin L. Rouse Farm
MATCHED: Kornegay Farms
MATCHED: Waters Farm 1-5  M&M Rivenbark
MATCHED: Nobles Farm
MATCHED: W.D. Thigpen Farm
MATCHED: Sullivan Farm
MATCHED: Reeves & Reeves, Inc.
MATCHED: Ellwell Lake
MATCHED: Young Nursery #1 & #2
MATCHED: 3111
MATCHED: J. Sullivan & Son Farm
MATCHED: P-14C
MATCHED: Farm 91 / Farm 3091
MATCHED: Piggybank Sow
MATCHED: Farm 5579
Summary: total=15, counties=5 (dist: {'Duplin': 6, 'Sampson': 5, 'Bladen': 2, 'Wayne': 1, 'Robeson': 1}), coords in range, matched=15, unmatched=0

=== CHECK 5: ALERTS CROSS-REFERENCES ===
PASS: Alerts >= 3 entries
Summary: total=4, all_cross_refs_valid=Yes, severities={'high': 2, 'medium': 1, 'low': 1}

=== CHECK 6: SCHEMA COMPATIBILITY ===
PASS: Schema compatibility fixed for all datasets

=== CHECK 7: WRITE VALIDATION REPORT ===

## FIXES APPLIED:
- Removed UNUSABLE regulation 2022-21815 (no text/url)
- Removed UNUSABLE regulation 2023-07468 (no text/url)
- Removed UNUSABLE regulation 2020-21446 (no text/url)
- Removed UNUSABLE regulation 2024-02637 (no text/url)
- Removed UNUSABLE regulation 2020-02612 (no text/url)
- Removed UNUSABLE regulation 2019-19497 (no text/url)
- Removed UNUSABLE regulation 2019-12411 (no text/url)
- Removed UNUSABLE regulation 2020-12081 (no text/url)
- Removed UNUSABLE regulation 2016-21204 (no text/url)
- Removed UNUSABLE regulation 2016-28426 (no text/url)
- Removed UNUSABLE regulation 2016-30194 (no text/url)
- Removed UNUSABLE regulation 2015-24954 (no text/url)
- Removed UNUSABLE regulation 2014-19265 (no text/url)
- Removed UNUSABLE regulation 2014-04612 (no text/url)
- Removed UNUSABLE regulation 2013-05666 (no text/url)
- Removed UNUSABLE regulation 2012-18378 (no text/url)
- Removed UNUSABLE regulation 2012-19698 (no text/url)
- Removed UNUSABLE regulation 2011-4492 (no text/url)
- Removed UNUSABLE regulation 2010-348 (no text/url)
- Removed UNUSABLE regulation 2010-4752 (no text/url)
- Fetched additional regulation 2025-10542
- Fetched additional regulation 2026-04646
- Fetched additional regulation 2025-11446
- Fetched additional regulation 2024-26650
- Fetched additional regulation 2024-09157
- Fetched additional regulation 2023-15848
- Fetched additional regulation 2025-16868
- Fetched additional regulation 2023-17708
- Fetched additional regulation 2025-12602
- Fetched additional regulation 2024-08547
- Fetched additional regulation 2025-11573
- Fetched additional regulation 2025-15989
- Fixed schema compatibility for 12 regulation fields

## FINAL FILE SIZES:
- data/regulations_seed.json: 4793571 bytes
- data/business_profiles.json: 5959 bytes
- data/cafo_facilities.geojson: 1078601 bytes
- data/alerts_seed.json: 2792 bytes