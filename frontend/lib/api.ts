import type {
  Business,
  BusinessListResponse,
  RegulationListResponse,
  ComplianceGapAnalysis,
  Alert,
} from "./types";
import {
  mockBusinesses,
  mockRegulations,
  mockAlerts,
  mockCachedAnalyses,
  getMockBusinessDetail,
  getMockCachedAnalysisPath,
} from "./mock-data";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS === "true";

// ─── Demo mode (NEXT_PUBLIC_USE_MOCKS=true, no backend) ─────────────────────

export const DEMO_MODE = USE_MOCKS;

export const DEMO_LIVE_ANALYSIS_NOTE =
  "Live AI analysis runs in the full local version of RegRadar. This demo includes saved results (real run, Oct 26, 2026) for every farm against rules " +
  Array.from(new Set(mockCachedAnalyses.map((c) => c.regulation_id))).join(", ") +
  ".";

export function hasDemoAnalysis(businessId: string, regulationId: string): boolean {
  return getMockCachedAnalysisPath(businessId, regulationId) !== undefined;
}

// ─── Base fetch wrapper ─────────────────────────────────────────────────────

async function apiFetch<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
    ...options,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(body.detail || `API error: ${res.status}`);
  }

  return res.json();
}

// ─── Regulations ────────────────────────────────────────────────────────────

export async function fetchRegulations(
  page = 1,
  perPage = 20
): Promise<RegulationListResponse> {
  if (USE_MOCKS) {
    return {
      items: mockRegulations,
      total: mockRegulations.length,
      page,
      per_page: perPage,
    };
  }
  return apiFetch<RegulationListResponse>(
    `/api/regulations?page=${page}&per_page=${perPage}`
  );
}

// ─── Businesses ─────────────────────────────────────────────────────────────

export async function fetchBusinesses(): Promise<BusinessListResponse> {
  if (USE_MOCKS) {
    return { items: mockBusinesses, total: mockBusinesses.length };
  }
  return apiFetch<BusinessListResponse>("/api/businesses");
}

export async function fetchBusinessDetail(
  id: string
): Promise<Business> {
  if (USE_MOCKS) {
    const biz = getMockBusinessDetail(id);
    if (!biz) throw new Error("Business not found");
    return biz;
  }
  return apiFetch<Business>(`/api/businesses/${id}`);
}

// ─── Analyze ────────────────────────────────────────────────────────────────

export async function runAnalysis(
  businessId: string,
  regulationId: string
): Promise<ComplianceGapAnalysis> {
  if (USE_MOCKS) {
    const cachedPath = getMockCachedAnalysisPath(businessId, regulationId);
    if (!cachedPath) throw new Error(DEMO_LIVE_ANALYSIS_NOTE);
    const res = await fetch(cachedPath);
    if (!res.ok) throw new Error(`Failed to load cached analysis: ${res.status}`);
    return res.json();
  }
  return apiFetch<ComplianceGapAnalysis>("/api/analyze", {
    method: "POST",
    body: JSON.stringify({
      business_id: businessId,
      regulation_id: regulationId,
    }),
  });
}

// ─── Alerts ─────────────────────────────────────────────────────────────────

export async function fetchAlerts(): Promise<Alert[]> {
  if (USE_MOCKS) {
    return mockAlerts;
  }
  return apiFetch<Alert[]>("/api/alerts");
}
