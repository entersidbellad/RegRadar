// ─── Business / Facility ─────────────────────────────────────────────────────

export interface Business {
  id: string;
  name: string;
  permit_number: string;
  naics_code?: string;
  county: string;
  latitude: number;
  longitude: number;
  operation_type: string;
  head_count: number;
  permit_type: string;
  latest_status: "compliant" | "non_compliant" | "warning" | "unknown";
  created_at?: string;
  analyses?: Analysis[];
}

export interface BusinessListResponse {
  items: Business[];
  total: number;
}

// ─── Regulation ──────────────────────────────────────────────────────────────

export interface Regulation {
  id: string;
  title: string;
  agency: string;
  document_type: string;
  publication_date: string;
  effective_date: string | null;
  abstract: string;
  raw_text_url?: string | null;
  full_text?: string;
}

export interface RegulationListResponse {
  items: Regulation[];
  total: number;
  page: number;
  per_page: number;
}

// ─── Analysis ────────────────────────────────────────────────────────────────

export interface ComplianceRequirement {
  requirement_id: string;
  regulation_section: string;
  requirement_text: string;
  plain_language_summary: string;
  obligation_type: "mandatory" | "recommended" | "conditional";
  applicable_industries?: string[];
  deadline: string | null;
  penalty_info: string | null;
}

export interface Analysis {
  id: string;
  business_id?: string;
  regulation_id: string;
  overall_status: "compliant" | "non_compliant" | "warning" | "unknown";
  confidence: number;
  gaps_json?: string;
  actions_json?: string;
  requirements_json?: string;
  summary: string;
  created_at: string;
}

export interface ComplianceGapAnalysis {
  business_name: string;
  business_id: string;
  regulation_name: string;
  regulation_id: string;
  analysis_date: string;
  overall_status: "compliant" | "non_compliant" | "warning" | "unknown";
  confidence_score: number;
  requirements: ComplianceRequirement[];
  gaps: string[];
  recommended_actions: string[];
  summary: string;
}

// ─── Alert ───────────────────────────────────────────────────────────────────

export interface Alert {
  id: string;
  regulation_title: string;
  regulation_id: string;
  affected_business_ids: string[];
  severity: "high" | "medium" | "low";
  timestamp: string;
  description: string;
}
