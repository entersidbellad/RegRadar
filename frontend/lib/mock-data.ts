import type { Business, Regulation, Alert, Analysis } from "./types";
import demoData from "./demo-data.json";

// demo-data.json is generated from data/ and backend/cached_responses/ by
// `bun run demo-data`; re-run it after changing the seed files.

export const mockBusinesses = demoData.businesses as Business[];

export const mockRegulations = demoData.regulations as Regulation[];

export const mockAlerts = demoData.alerts as Alert[];

const mockAnalyses = demoData.analyses as Analysis[];

export const mockCachedAnalyses = demoData.cachedAnalyses;

export function getMockCachedAnalysisPath(
  businessId: string,
  regulationId: string
): string | undefined {
  return mockCachedAnalyses.find(
    (c) => c.business_id === businessId && c.regulation_id === regulationId
  )?.path;
}

// Helper: get business by ID with analyses attached
export function getMockBusinessDetail(id: string): Business | undefined {
  const business = mockBusinesses.find((b) => b.id === id);
  if (!business) return undefined;
  return {
    ...business,
    analyses: mockAnalyses.filter((a) => a.business_id === id),
  };
}
