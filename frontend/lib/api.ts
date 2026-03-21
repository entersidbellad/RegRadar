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
  mockComplianceAnalysis,
  getMockBusinessDetail,
} from "./mock-data";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS === "true";

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
    // Simulate network delay
    await new Promise((r) => setTimeout(r, 1500));
    return {
      ...mockComplianceAnalysis,
      business_id: businessId,
      regulation_id: regulationId,
      analysis_date: new Date().toISOString(),
    };
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
