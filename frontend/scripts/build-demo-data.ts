/**
 * Builds the static dataset used when NEXT_PUBLIC_USE_MOCKS=true (e.g. the
 * frontend-only Vercel demo) from the same seed files the backend loads.
 *
 *   ../data/business_profiles.json      -> lib/demo-data.json (businesses)
 *   ../data/regulations_seed.json       -> lib/demo-data.json (regulations, without full_text)
 *   ../data/alerts_seed.json            -> lib/demo-data.json (alerts)
 *   ../backend/cached_responses/*.json  -> public/demo/analyses/*.json + summary rows
 *
 * Usage (from frontend/):  bun run demo-data
 */

import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Alert, Analysis, Business, ComplianceGapAnalysis, Regulation } from "../lib/types";

const FRONTEND_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const REPO_DIR = resolve(FRONTEND_DIR, "..");
const DATA_DIR = join(REPO_DIR, "data");
const CACHE_DIR = join(REPO_DIR, "backend", "cached_responses");
const ANALYSES_OUT_DIR = join(FRONTEND_DIR, "public", "demo", "analyses");
const DATA_OUT_FILE = join(FRONTEND_DIR, "lib", "demo-data.json");

interface CachedResponseFile {
  business_id: string;
  regulation_id: string;
  gap_analysis: ComplianceGapAnalysis;
}

interface DemoCachedAnalysis {
  business_id: string;
  business_name: string;
  regulation_id: string;
  path: string;
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf-8")) as T;
}

function lastCommitDate(path: string): string | null {
  try {
    const out = execFileSync("git", ["log", "-1", "--format=%cI", "--", path], {
      cwd: REPO_DIR,
      encoding: "utf-8",
    }).trim();
    return out ? new Date(out).toISOString() : null;
  } catch {
    return null;
  }
}

const rawRegulations = readJson<(Regulation & { full_text?: string })[]>(
  join(DATA_DIR, "regulations_seed.json")
);
const regulations: Regulation[] = rawRegulations.map(({ full_text: _fullText, ...reg }) => reg);

const profiles = readJson<Omit<Business, "latest_status" | "analyses">[]>(
  join(DATA_DIR, "business_profiles.json")
);
const alerts = readJson<Alert[]>(join(DATA_DIR, "alerts_seed.json"));

rmSync(ANALYSES_OUT_DIR, { recursive: true, force: true });
mkdirSync(ANALYSES_OUT_DIR, { recursive: true });

const analyses: Analysis[] = [];
const cachedAnalyses: DemoCachedAnalysis[] = [];

for (const file of readdirSync(CACHE_DIR).filter((f) => f.endsWith(".json")).sort()) {
  const sourcePath = join(CACHE_DIR, file);
  const cached = readJson<CachedResponseFile>(sourcePath);
  const business = profiles.find((b) => b.id === cached.business_id);
  if (!business) {
    throw new Error(`${file}: business ${cached.business_id} is not in business_profiles.json`);
  }

  const createdAt = lastCommitDate(sourcePath) ?? new Date(cached.gap_analysis.analysis_date).toISOString();

  // The model echoes the permit number / CFR parts into these fields and makes
  // up analysis_date; use the real IDs and the date the response was produced.
  const analysis: ComplianceGapAnalysis = {
    ...cached.gap_analysis,
    business_id: cached.business_id,
    regulation_id: cached.regulation_id,
    analysis_date: createdAt,
    analysis_id: "file-cache",
  };
  writeFileSync(join(ANALYSES_OUT_DIR, file), JSON.stringify(analysis));

  analyses.push({
    id: `file-cache-${file.replace(/\.json$/, "")}`,
    business_id: cached.business_id,
    regulation_id: cached.regulation_id,
    overall_status: analysis.overall_status,
    confidence: analysis.confidence_score,
    summary: analysis.summary,
    created_at: createdAt,
  });
  cachedAnalyses.push({
    business_id: cached.business_id,
    business_name: business.name,
    regulation_id: cached.regulation_id,
    path: `/demo/analyses/${file}`,
  });
}

const businesses: Business[] = profiles.map((profile) => {
  const latest = analyses
    .filter((a) => a.business_id === profile.id)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
  return { ...profile, latest_status: latest?.overall_status ?? "unknown" };
});

writeFileSync(
  DATA_OUT_FILE,
  JSON.stringify({ businesses, regulations, alerts, analyses, cachedAnalyses }, null, 2) + "\n"
);

console.log(
  `Wrote ${businesses.length} businesses, ${regulations.length} regulations, ` +
    `${alerts.length} alerts, ${cachedAnalyses.length} cached analyses`
);
