import type {
  Business,
  Regulation,
  Alert,
  ComplianceGapAnalysis,
  Analysis,
  ComplianceTrendPoint,
  UpcomingDeadline,
} from "./types";

// ─── Mock Businesses (10 NC CAFO facilities in Duplin / Sampson counties) ────

export const mockBusinesses: Business[] = [
  {
    id: "biz-001",
    name: "Murphy-Brown LLC - Duplin Unit 12",
    permit_number: "NCA082471",
    naics_code: "112210",
    county: "Duplin",
    latitude: 34.95,
    longitude: -78.05,
    operation_type: "swine, farrow-to-finish",
    head_count: 8500,
    permit_type: "individual",
    latest_status: "compliant",
  },
  {
    id: "biz-002",
    name: "Prestage Farms - Sampson East",
    permit_number: "NCA088234",
    naics_code: "112210",
    county: "Sampson",
    latitude: 35.02,
    longitude: -78.35,
    operation_type: "swine, farrow-to-finish",
    head_count: 12000,
    permit_type: "individual",
    latest_status: "non_compliant",
  },
  {
    id: "biz-003",
    name: "Smithfield Hog Production - Rose Hill",
    permit_number: "NCA076891",
    naics_code: "112210",
    county: "Duplin",
    latitude: 34.83,
    longitude: -78.02,
    operation_type: "swine, finishing",
    head_count: 6200,
    permit_type: "general",
    latest_status: "warning",
  },
  {
    id: "biz-004",
    name: "Carroll's Foods - Warsaw Facility",
    permit_number: "NCA091102",
    naics_code: "112210",
    county: "Duplin",
    latitude: 35.0,
    longitude: -78.1,
    operation_type: "swine, farrow-to-wean",
    head_count: 4800,
    permit_type: "general",
    latest_status: "compliant",
  },
  {
    id: "biz-005",
    name: "Maxwell Foods Inc - Clinton",
    permit_number: "NCA067443",
    naics_code: "112210",
    county: "Sampson",
    latitude: 35.0,
    longitude: -78.32,
    operation_type: "swine, finishing",
    head_count: 9100,
    permit_type: "individual",
    latest_status: "warning",
  },
  {
    id: "biz-006",
    name: "Goldsboro Hog Farm - Wayne",
    permit_number: "NCA054881",
    naics_code: "112210",
    county: "Duplin",
    latitude: 35.15,
    longitude: -78.15,
    operation_type: "swine, farrow-to-finish",
    head_count: 5600,
    permit_type: "general",
    latest_status: "unknown",
  },
  {
    id: "biz-007",
    name: "Coharie Hog Farms - Sampson West",
    permit_number: "NCA093217",
    naics_code: "112210",
    county: "Sampson",
    latitude: 34.88,
    longitude: -78.45,
    operation_type: "swine, finishing",
    head_count: 7200,
    permit_type: "individual",
    latest_status: "compliant",
  },
  {
    id: "biz-008",
    name: "Duplin County Swine Co-op",
    permit_number: "NCA081553",
    naics_code: "112210",
    county: "Duplin",
    latitude: 34.92,
    longitude: -77.95,
    operation_type: "swine, farrow-to-finish",
    head_count: 11000,
    permit_type: "individual",
    latest_status: "non_compliant",
  },
  {
    id: "biz-009",
    name: "Tarheel Pork Producers - Kenansville",
    permit_number: "NCA072664",
    naics_code: "112210",
    county: "Duplin",
    latitude: 34.97,
    longitude: -77.96,
    operation_type: "swine, finishing",
    head_count: 3400,
    permit_type: "general",
    latest_status: "compliant",
  },
  {
    id: "biz-010",
    name: "Sampson Ag Partners LLC",
    permit_number: "NCA095718",
    naics_code: "112210",
    county: "Sampson",
    latitude: 35.1,
    longitude: -78.4,
    operation_type: "swine, farrow-to-wean",
    head_count: 6800,
    permit_type: "individual",
    latest_status: "warning",
  },
];

// ─── Mock Regulations (5 EPA / NC DEQ rules) ────────────────────────────────

export const mockRegulations: Regulation[] = [
  {
    id: "2024-00891",
    title:
      "National Emission Standards for Hazardous Air Pollutants: Swine and Poultry Waste Management",
    agency: "EPA",
    document_type: "RULE",
    publication_date: "2024-11-15",
    effective_date: "2025-03-01",
    abstract:
      "This final rule establishes emission standards for hazardous air pollutants from concentrated animal feeding operations (CAFOs), including ammonia and hydrogen sulfide limits for swine waste lagoons and spray fields in the southeastern United States.",
  },
  {
    id: "2024-01247",
    title:
      "Revised Effluent Limitations Guidelines for CAFOs Under Clean Water Act",
    agency: "EPA",
    document_type: "RULE",
    publication_date: "2024-10-22",
    effective_date: "2025-01-15",
    abstract:
      "EPA is revising the effluent limitations guidelines and standards for concentrated animal feeding operations to address nutrient runoff, particularly nitrogen and phosphorus, from waste storage lagoons and land application areas.",
  },
  {
    id: "2024-02103",
    title:
      "CERCLA Reporting Requirements for Air Emissions from Animal Waste at Large CAFOs",
    agency: "EPA",
    document_type: "RULE",
    publication_date: "2024-09-08",
    effective_date: null,
    abstract:
      "This rule reinstates and updates CERCLA and EPCRA reporting requirements for air emissions of hazardous substances from animal waste at large concentrated animal feeding operations following the Farm Act exemption sunset.",
  },
  {
    id: "NC-DEQ-2024-0045",
    title:
      "North Carolina Swine Waste Management System Performance Standards Update",
    agency: "NC_DEQ",
    document_type: "RULE",
    publication_date: "2024-12-01",
    effective_date: "2025-06-01",
    abstract:
      "NC DEQ updates performance standards for swine waste management systems, requiring enhanced lagoon liner integrity testing, setback distances from waterways, and updated nutrient management plans for operations exceeding 2,500 head.",
  },
  {
    id: "NC-DEQ-2024-0072",
    title: "General Permit Renewal Requirements for Swine Operations in NC",
    agency: "NC_DEQ",
    document_type: "PROPOSED_RULE",
    publication_date: "2025-01-10",
    effective_date: null,
    abstract:
      "Proposed rule updating general permit conditions for swine operations including increased groundwater monitoring frequency, updated waste analysis protocols, and requirements for emergency action plans addressing climate-related flooding events.",
  },
];

// ─── Mock Analyses ──────────────────────────────────────────────────────────

export const mockAnalyses: Analysis[] = [
  {
    id: "analysis-001",
    business_id: "biz-002",
    regulation_id: "2024-01247",
    overall_status: "non_compliant",
    confidence: 0.87,
    summary:
      "Facility exceeds revised nitrogen discharge limits. Current lagoon capacity insufficient for 12,000-head operation under new effluent guidelines. Immediate corrective action required for nutrient management plan.",
    created_at: "2025-01-20T14:30:00Z",
  },
  {
    id: "analysis-002",
    business_id: "biz-002",
    regulation_id: "2024-00891",
    overall_status: "warning",
    confidence: 0.72,
    summary:
      "Ammonia emission levels approaching new thresholds. Recommend installation of additional covers on secondary lagoon and updating spray field schedules to reduce atmospheric discharge.",
    created_at: "2025-01-18T09:15:00Z",
  },
  {
    id: "analysis-003",
    business_id: "biz-003",
    regulation_id: "NC-DEQ-2024-0045",
    overall_status: "warning",
    confidence: 0.79,
    summary:
      "Lagoon liner integrity test overdue by 6 months. Setback distances meet current requirements but new standards require 50ft additional buffer from unnamed tributaries adjacent to spray fields.",
    created_at: "2025-01-15T11:00:00Z",
  },
];

// ─── Mock Alerts ────────────────────────────────────────────────────────────

export const mockAlerts: Alert[] = [
  {
    id: "alert-001",
    regulation_title:
      "Revised Effluent Limitations Guidelines for CAFOs Under Clean Water Act",
    regulation_id: "2024-01247",
    affected_business_ids: ["biz-002", "biz-005", "biz-008"],
    severity: "high",
    timestamp: "2025-01-22T08:00:00Z",
    description:
      "New effluent limitation guidelines take effect Jan 15, 2025. Three facilities have not updated their nutrient management plans to meet revised nitrogen and phosphorus discharge limits.",
  },
  {
    id: "alert-002",
    regulation_title:
      "CERCLA Reporting Requirements for Air Emissions from Animal Waste at Large CAFOs",
    regulation_id: "2024-02103",
    affected_business_ids: ["biz-001", "biz-002", "biz-008"],
    severity: "medium",
    timestamp: "2025-01-20T12:30:00Z",
    description:
      "CERCLA reporting exemption sunset approaching. Operations with >2,500 head must register for air emission reporting within 60 days of rule finalization.",
  },
  {
    id: "alert-003",
    regulation_title:
      "NC Swine Waste Management System Performance Standards Update",
    regulation_id: "NC-DEQ-2024-0045",
    affected_business_ids: ["biz-003", "biz-010"],
    severity: "medium",
    timestamp: "2025-01-18T15:00:00Z",
    description:
      "Updated performance standards require lagoon liner integrity testing. Two facilities have overdue inspections that must be completed before June 2025 effective date.",
  },
  {
    id: "alert-004",
    regulation_title:
      "General Permit Renewal Requirements for Swine Operations in NC",
    regulation_id: "NC-DEQ-2024-0072",
    affected_business_ids: [
      "biz-003",
      "biz-004",
      "biz-006",
      "biz-009",
    ],
    severity: "low",
    timestamp: "2025-01-15T09:00:00Z",
    description:
      "Comment period open for proposed general permit renewal requirements. Facilities with general permits should review proposed changes to groundwater monitoring and emergency action plan requirements.",
  },
];

// ─── Mock full compliance gap analysis (for POST /api/analyze) ──────────────

export const mockComplianceAnalysis: ComplianceGapAnalysis = {
  business_name: "Prestage Farms - Sampson East",
  business_id: "biz-002",
  regulation_name:
    "Revised Effluent Limitations Guidelines for CAFOs Under Clean Water Act",
  regulation_id: "2024-01247",
  analysis_date: "2025-01-22T10:00:00Z",
  overall_status: "non_compliant",
  confidence_score: 0.87,
  requirements: [
    {
      requirement_id: "req-001",
      regulation_section: "40 CFR 412.31(a)",
      requirement_text:
        "No discharge of process wastewater pollutants into waters of the United States from the production area.",
      plain_language_summary:
        "Your facility cannot release any wastewater containing pollutants from barns, lagoons, or feed areas into nearby streams, rivers, or wetlands.",
      obligation_type: "mandatory",
      applicable_industries: ["112210"],
      deadline: "2025-01-15",
      penalty_info:
        "Up to $25,000 per day per violation under CWA Section 309(d).",
    },
    {
      requirement_id: "req-002",
      regulation_section: "40 CFR 412.31(b)(1)",
      requirement_text:
        "Develop and implement a nutrient management plan (NMP) that ensures nitrogen and phosphorus application rates do not exceed crop uptake rates.",
      plain_language_summary:
        "You must have a written plan showing how much waste you spread on fields, making sure the nitrogen and phosphorus levels don't exceed what crops can absorb.",
      obligation_type: "mandatory",
      applicable_industries: ["112210"],
      deadline: "2025-01-15",
      penalty_info: "NMP deficiency may result in permit revocation.",
    },
    {
      requirement_id: "req-003",
      regulation_section: "40 CFR 412.37",
      requirement_text:
        "Conduct annual soil and manure nutrient analysis using EPA-approved methods.",
      plain_language_summary:
        "Once a year, test your soil and manure to measure nutrient levels, using testing methods approved by the EPA.",
      obligation_type: "mandatory",
      applicable_industries: ["112210"],
      deadline: null,
      penalty_info: null,
    },
    {
      requirement_id: "req-004",
      regulation_section: "40 CFR 412.4(c)",
      requirement_text:
        "Maintain records of waste generation, storage capacity, and land application events for a minimum of 5 years.",
      plain_language_summary:
        "Keep written records of how much waste your facility produces, lagoon levels, and when/where you apply waste to fields, for at least 5 years.",
      obligation_type: "mandatory",
      applicable_industries: ["112210"],
      deadline: null,
      penalty_info: null,
    },
  ],
  gaps: [
    "Current nutrient management plan was last updated in 2022 and does not reflect revised nitrogen limits effective January 2025.",
    "Annual soil nutrient analysis for 2024 has not been submitted to the permitting authority.",
    "Lagoon freeboard measurements indicate capacity may be insufficient for a 12,000-head operation under the new 25-year, 24-hour storm event standard.",
  ],
  recommended_actions: [
    "Immediately engage a certified nutrient management planner to update the NMP with revised nitrogen and phosphorus application rates.",
    "Complete and submit the 2024 annual soil and manure nutrient analysis within 30 days.",
    "Commission an engineering assessment of lagoon storage capacity relative to the updated storm event standard.",
    "Consider implementing a vegetated buffer strip (minimum 35 feet) along all waterways adjacent to spray fields to reduce nutrient runoff risk.",
  ],
  summary:
    "Prestage Farms - Sampson East is currently non-compliant with the revised effluent limitation guidelines. The primary gaps are an outdated nutrient management plan that does not account for lowered nitrogen discharge limits, a missing 2024 soil analysis, and potential lagoon capacity shortfalls. Immediate corrective action is needed to avoid enforcement action and potential penalties of up to $25,000 per day.",
};

// Helper: get business by ID with analyses attached
export function getMockBusinessDetail(id: string): Business | undefined {
  const business = mockBusinesses.find((b) => b.id === id);
  if (!business) return undefined;
  return {
    ...business,
    analyses: mockAnalyses.filter((a) => a.business_id === id),
  };
}

// ─── Mock compliance trend (6 months) ────────────────────────────────────────

export const mockComplianceTrend: ComplianceTrendPoint[] = [
  { month: "Aug 2025", compliant: 5, warning: 2, non_compliant: 1, unknown: 2 },
  { month: "Sep 2025", compliant: 5, warning: 3, non_compliant: 1, unknown: 1 },
  { month: "Oct 2025", compliant: 4, warning: 3, non_compliant: 2, unknown: 1 },
  { month: "Nov 2025", compliant: 4, warning: 2, non_compliant: 2, unknown: 2 },
  { month: "Dec 2025", compliant: 3, warning: 3, non_compliant: 2, unknown: 2 },
  { month: "Jan 2026", compliant: 3, warning: 3, non_compliant: 2, unknown: 2 },
];

// ─── Mock upcoming deadlines ────────────────────────────────────────────────

export const mockDeadlines: UpcomingDeadline[] = [
  {
    id: "dl-001",
    business_name: "Prestage Farms - Sampson East",
    business_id: "biz-002",
    regulation_section: "40 CFR 412.31(a)",
    description: "Update nutrient management plan to revised nitrogen limits",
    due_date: "2026-04-15",
  },
  {
    id: "dl-002",
    business_name: "Prestage Farms - Sampson East",
    business_id: "biz-002",
    regulation_section: "40 CFR 412.37",
    description: "Submit 2025 annual soil and manure nutrient analysis",
    due_date: "2026-04-30",
  },
  {
    id: "dl-003",
    business_name: "Smithfield Hog Production - Rose Hill",
    business_id: "biz-003",
    regulation_section: "NC DEQ 15A NCAC 02T",
    description: "Complete lagoon liner integrity test (6 months overdue)",
    due_date: "2026-05-01",
  },
  {
    id: "dl-004",
    business_name: "Duplin County Swine Co-op",
    business_id: "biz-008",
    regulation_section: "40 CFR 122.23(d)(1)",
    description: "File updated NPDES permit application for expanded capacity",
    due_date: "2026-06-15",
  },
  {
    id: "dl-005",
    business_name: "Maxwell Foods Inc - Clinton",
    business_id: "biz-005",
    regulation_section: "EPCRA §302",
    description: "Register for air emission reporting under CERCLA reinstatement",
    due_date: "2026-07-01",
  },
];

// ─── Timer-simulated alert (fires after 60s on the alerts page) ──────────────

export const mockTimerAlert: Alert = {
  id: "alert-timer-001",
  regulation_title:
    "EPA Proposed Rule: Enhanced Nutrient Reduction Requirements for Large Swine Operations",
  regulation_id: "2025-00341",
  affected_business_ids: ["biz-001", "biz-004", "biz-007", "biz-009"],
  severity: "high",
  timestamp: new Date().toISOString(),
  description:
    "NEW DETECTION: EPA published a proposed rule requiring large swine operations (>4,000 head) to implement enhanced nutrient reduction technology by 2027. Four facilities in the monitoring area meet the applicability threshold and must file comments within 60 days.",
};
