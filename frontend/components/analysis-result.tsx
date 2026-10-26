"use client";

import { useState } from "react";
import type { ComplianceGapAnalysis } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Target,
  Lightbulb,
  FileText,
  ClipboardList,
} from "lucide-react";

// ── Status config ────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  compliant: {
    label: "COMPLIANT",
    icon: CheckCircle2,
    badgeClass: "bg-green-700 text-white hover:bg-green-800 text-base px-4 py-1",
    cardClass: "border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950/30",
    iconClass: "text-green-700 dark:text-green-400",
  },
  warning: {
    label: "WARNING",
    icon: AlertTriangle,
    badgeClass: "bg-amber-600 text-white hover:bg-amber-700 text-base px-4 py-1",
    cardClass: "border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30",
    iconClass: "text-amber-600 dark:text-amber-400",
  },
  non_compliant: {
    label: "NON-COMPLIANT",
    icon: XCircle,
    badgeClass: "bg-red-700 text-white hover:bg-red-800 text-base px-4 py-1",
    cardClass: "border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30",
    iconClass: "text-red-700 dark:text-red-400",
  },
  unknown: {
    label: "UNKNOWN",
    icon: HelpCircle,
    badgeClass: "bg-stone-500 text-white hover:bg-stone-600 text-base px-4 py-1",
    cardClass: "border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950/30",
    iconClass: "text-stone-500 dark:text-stone-400",
  },
};

const OBLIGATION_CLASS: Record<string, string> = {
  mandatory: "border-red-200 dark:border-red-900 bg-red-100 dark:bg-red-950/40 text-red-800 dark:text-red-300",
  recommended: "border-green-200 dark:border-green-900 bg-green-100 dark:bg-green-950/40 text-green-800 dark:text-green-300",
  conditional: "border-amber-200 dark:border-amber-900 bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300",
};

// LLM output mixes ISO dates with free text like "180 days prior to commencing operation".
function formatDateOrText(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

// ── Component ────────────────────────────────────────────────────────────────

interface AnalysisResultProps {
  analysis: ComplianceGapAnalysis;
}

export default function AnalysisResult({ analysis }: AnalysisResultProps) {
  const status = STATUS_CONFIG[analysis.overall_status];
  const StatusIcon = status.icon;

  // Track checked state for recommended actions
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  const toggle = (i: number) =>
    setChecked((prev) => ({ ...prev, [i]: !prev[i] }));

  return (
    <div className="space-y-4">
      {/* ── Overall status ── */}
      <Card className={status.cardClass}>
        <CardContent className="flex flex-wrap items-center gap-3 p-4">
          <StatusIcon className={`h-6 w-6 shrink-0 ${status.iconClass}`} />
          <Badge className={status.badgeClass}>{status.label}</Badge>
          <span className="text-sm text-muted-foreground">
            {(analysis.confidence_score * 100).toFixed(0)}% confidence
          </span>
          <span className="ml-auto text-xs text-muted-foreground">
            {formatDateOrText(analysis.analysis_date)}
          </span>
        </CardContent>
      </Card>

      {/* ── Summary callout ── */}
      <Alert className="border-muted bg-muted/30">
        <ClipboardList className="h-4 w-4" />
        <AlertDescription className="text-sm leading-relaxed">
          {analysis.summary}
        </AlertDescription>
      </Alert>

      {/* ── Identified Gaps ── */}
      {analysis.gaps.length > 0 && (
        <Card className="border-red-200 dark:border-red-900">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="flex items-center gap-2 text-sm text-red-700 dark:text-red-400">
              <Target className="h-4 w-4" />
              Identified Gaps ({analysis.gaps.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <ul className="space-y-2">
              {analysis.gaps.map((gap, i) => (
                <li
                  key={i}
                  className="flex gap-2 rounded-md border border-red-100 dark:border-red-900 bg-red-50/60 dark:bg-red-950/30 p-2 text-sm"
                >
                  <span className="mt-0.5 shrink-0 text-red-500 dark:text-red-400">•</span>
                  <span>{gap}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* ── Recommended Actions (checklist) ── */}
      {analysis.recommended_actions.length > 0 && (
        <Card className="border-blue-200 dark:border-blue-900">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-400">
              <Lightbulb className="h-4 w-4" />
              Recommended Actions ({analysis.recommended_actions.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <ul className="space-y-2">
              {analysis.recommended_actions.map((action, i) => (
                <li key={i} className="flex items-start gap-3 rounded-md border border-blue-100 dark:border-blue-900 bg-blue-50/60 dark:bg-blue-950/30 p-2">
                  <Checkbox
                    id={`action-${i}`}
                    checked={!!checked[i]}
                    onCheckedChange={() => toggle(i)}
                    className="mt-0.5 shrink-0"
                  />
                  <label
                    htmlFor={`action-${i}`}
                    className={`cursor-pointer text-sm leading-relaxed ${
                      checked[i] ? "line-through text-muted-foreground" : ""
                    }`}
                  >
                    {action}
                  </label>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* ── Requirements ── */}
      {analysis.requirements.length > 0 && (
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="flex items-center gap-2 text-sm">
              <FileText className="h-4 w-4" />
              Requirements ({analysis.requirements.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 px-4 pb-4">
            {analysis.requirements.map((req) => (
              <div key={req.requirement_id} className="rounded-md border p-3 space-y-2">
                {/* Header row: section + obligation type */}
                <div className="flex flex-wrap items-center gap-2">
                  <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">
                    {req.regulation_section}
                  </code>
                  <span
                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${
                      OBLIGATION_CLASS[req.obligation_type] ??
                      "border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-gray-900/40 text-gray-700 dark:text-gray-400"
                    }`}
                  >
                    {req.obligation_type}
                  </span>
                </div>

                {/* Plain-language summary */}
                <p className="text-sm font-medium leading-snug">
                  {req.plain_language_summary}
                </p>

                <Separator />

                {/* Legal text */}
                <p className="text-xs italic text-muted-foreground leading-relaxed">
                  {req.requirement_text}
                </p>

                {/* Deadline + penalty */}
                {(req.deadline || req.penalty_info) && (
                  <div className="space-y-0.5">
                    {req.deadline && (
                      <p className="text-xs font-medium text-red-600 dark:text-red-400">
                        Deadline:{" "}
                        {formatDateOrText(req.deadline)}
                      </p>
                    )}
                    {req.penalty_info && (
                      <p className="text-xs text-orange-600 dark:text-orange-400">
                        Penalty: {req.penalty_info}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
