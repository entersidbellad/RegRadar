"use client";

import { useState } from "react";
import type { ComplianceGapAnalysis } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Target,
  Lightbulb,
  FileText,
  ClipboardList,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

// ── Status config ────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  compliant: {
    label: "Compliant",
    verdict: "No gaps found. The farm appears to meet this rule's requirements.",
    icon: CheckCircle2,
    badgeClass: "bg-green-700 text-white hover:bg-green-800",
    cardClass: "border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950/30",
    iconClass: "text-green-700 dark:text-green-400",
    barClass: "bg-green-600",
  },
  warning: {
    label: "Needs review",
    verdict: "Mostly in line, but some requirements can't be confirmed from the farm's records.",
    icon: AlertTriangle,
    badgeClass: "bg-amber-600 text-white hover:bg-amber-700",
    cardClass: "border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30",
    iconClass: "text-amber-600 dark:text-amber-400",
    barClass: "bg-amber-500",
  },
  non_compliant: {
    label: "Non-compliant",
    verdict: "The farm appears to fall short of this rule in ways that need action.",
    icon: XCircle,
    badgeClass: "bg-red-700 text-white hover:bg-red-800",
    cardClass: "border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30",
    iconClass: "text-red-700 dark:text-red-400",
    barClass: "bg-red-600",
  },
  unknown: {
    label: "Undetermined",
    verdict: "The AI couldn't determine whether this rule applies to the farm.",
    icon: HelpCircle,
    badgeClass: "bg-stone-500 text-white hover:bg-stone-600",
    cardClass: "border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950/30",
    iconClass: "text-stone-500 dark:text-stone-400",
    barClass: "bg-stone-500",
  },
};

const OBLIGATION_CLASS: Record<string, string> = {
  mandatory: "border-red-200 dark:border-red-900 bg-red-100 dark:bg-red-950/40 text-red-800 dark:text-red-300",
  recommended: "border-green-200 dark:border-green-900 bg-green-100 dark:bg-green-950/40 text-green-800 dark:text-green-300",
  conditional: "border-amber-200 dark:border-amber-900 bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300",
};

const INITIAL_REQUIREMENTS = 5;

// LLM output mixes ISO dates with free text like "180 days prior to commencing operation".
function formatDateOrText(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

// ── Component ────────────────────────────────────────────────────────────────

interface AnalysisResultProps {
  analysis: ComplianceGapAnalysis;
}

export default function AnalysisResult({ analysis }: AnalysisResultProps) {
  const status = STATUS_CONFIG[analysis.overall_status];
  const StatusIcon = status.icon;
  const confidence = Math.round(analysis.confidence_score * 100);
  const deadlineCount = analysis.requirements.filter((r) => r.deadline).length;

  const [checked, setChecked] = useState<Record<number, boolean>>({});
  const toggle = (i: number) =>
    setChecked((prev) => ({ ...prev, [i]: !prev[i] }));
  const doneCount = Object.values(checked).filter(Boolean).length;

  const [showAllRequirements, setShowAllRequirements] = useState(false);
  const visibleRequirements = showAllRequirements
    ? analysis.requirements
    : analysis.requirements.slice(0, INITIAL_REQUIREMENTS);

  const glance = [
    { label: "Gaps to check", value: analysis.gaps.length },
    { label: "Actions", value: analysis.recommended_actions.length },
    { label: "Requirements", value: analysis.requirements.length },
    { label: "With deadlines", value: deadlineCount },
  ];

  return (
    <div className="space-y-4">
      {/* ── Verdict + at-a-glance counts ── */}
      <Card data-tour="analysis-overview" className={status.cardClass}>
        <CardContent className="space-y-4 p-4">
          <div className="flex flex-wrap items-center gap-2.5">
            <StatusIcon className={`h-6 w-6 shrink-0 ${status.iconClass}`} />
            <Badge className={`px-3 py-0.5 text-sm ${status.badgeClass}`}>{status.label}</Badge>
            <span className="ml-auto text-xs text-muted-foreground">
              Analyzed {formatDateOrText(analysis.analysis_date)}
            </span>
          </div>
          <p className="text-sm font-medium leading-snug text-foreground">{status.verdict}</p>

          <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {glance.map((g) => (
              <div
                key={g.label}
                className="flex flex-col-reverse rounded-md border border-border/60 bg-card px-2.5 py-2"
              >
                <dt className="mt-1 text-[11px] leading-tight text-muted-foreground">{g.label}</dt>
                <dd className="text-lg font-bold leading-none text-foreground">{g.value}</dd>
              </div>
            ))}
          </dl>

          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>AI confidence in this result</span>
              <span className="font-semibold text-foreground">{confidence}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-card">
              <div className={`h-full rounded-full ${status.barClass}`} style={{ width: `${confidence}%` }} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Summary ── */}
      <div className="rounded-lg border border-border/60 bg-muted/30 p-4">
        <h4 className="flex items-center gap-2 text-sm font-semibold">
          <ClipboardList className="h-4 w-4 text-muted-foreground" />
          Summary
        </h4>
        <p className="mt-2 text-sm leading-relaxed">{analysis.summary}</p>
      </div>

      {/* ── Identified Gaps ── */}
      {analysis.gaps.length > 0 && (
        <Card data-tour="analysis-gaps" className="border-red-200 dark:border-red-900">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="flex items-center gap-2 text-sm text-red-700 dark:text-red-400">
              <Target className="h-4 w-4" />
              Gaps to check ({analysis.gaps.length})
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
        <Card data-tour="analysis-actions" className="border-blue-200 dark:border-blue-900">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-400">
              <Lightbulb className="h-4 w-4" />
              Recommended actions
              <span className="ml-auto text-xs font-medium text-muted-foreground">
                {doneCount} of {analysis.recommended_actions.length} done
              </span>
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
        <Card data-tour="analysis-requirements">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="flex items-center gap-2 text-sm">
              <FileText className="h-4 w-4" />
              What the rule requires ({analysis.requirements.length})
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Each requirement the AI found, in plain English, with its legal citation and any
              deadline or penalty.
            </p>
          </CardHeader>
          <CardContent className="space-y-3 px-4 pb-4">
            {visibleRequirements.map((req) => (
              <div key={req.requirement_id} className="rounded-md border p-3 space-y-2">
                <p className="text-sm font-medium leading-snug">
                  {req.plain_language_summary}
                </p>

                <div className="flex flex-wrap items-center gap-2">
                  <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">
                    {req.regulation_section}
                  </code>
                  <span
                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold capitalize ${
                      OBLIGATION_CLASS[req.obligation_type] ??
                      "border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-gray-900/40 text-gray-700 dark:text-gray-400"
                    }`}
                  >
                    {req.obligation_type}
                  </span>
                </div>

                <Separator />

                <p className="text-xs italic text-muted-foreground leading-relaxed">
                  {req.requirement_text}
                </p>

                {(req.deadline || req.penalty_info) && (
                  <div className="space-y-0.5">
                    {req.deadline && (
                      <p className="text-xs font-medium text-red-600 dark:text-red-400">
                        Deadline: {formatDateOrText(req.deadline)}
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

            {analysis.requirements.length > INITIAL_REQUIREMENTS && (
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-1.5"
                onClick={() => setShowAllRequirements((v) => !v)}
              >
                {showAllRequirements ? (
                  <>
                    <ChevronUp className="h-3.5 w-3.5" />
                    Show fewer
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3.5 w-3.5" />
                    Show all {analysis.requirements.length} requirements
                  </>
                )}
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
