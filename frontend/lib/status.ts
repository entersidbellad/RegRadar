import type { Business } from "./types";

export type ComplianceStatus = Business["latest_status"];

export const STATUS_LABELS: Record<ComplianceStatus, string> = {
  compliant: "Compliant",
  warning: "Needs review",
  non_compliant: "Non-compliant",
  unknown: "Not analyzed",
};

export const STATUS_COLORS: Record<ComplianceStatus, string> = {
  compliant: "#16a34a",
  warning: "#d97706",
  non_compliant: "#dc2626",
  unknown: "#78716c",
};

export const STATUS_ORDER: ComplianceStatus[] = ["compliant", "warning", "non_compliant", "unknown"];
