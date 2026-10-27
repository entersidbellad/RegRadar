"use client";

import { Building2, ShieldAlert, AlertTriangle, BookOpen } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { Business, Alert as AlertType } from "@/lib/types";

interface KpiCardsProps {
  businesses: Business[];
  alerts: AlertType[];
  regulationCount: number;
}

export default function KpiCards({ businesses, alerts, regulationCount }: KpiCardsProps) {
  const total = businesses.length;
  const analyzed = businesses.filter((b) => b.latest_status !== "unknown").length;
  const needsAttention = businesses.filter(
    (b) => b.latest_status === "warning" || b.latest_status === "non_compliant"
  ).length;
  const highAlerts = alerts.filter((a) => a.severity === "high").length;

  const cards = [
    {
      label: "Farms Monitored",
      value: total.toString(),
      icon: Building2,
      accent: "text-primary",
      bgAccent: "bg-primary/10",
      sub: `${analyzed} analyzed so far`,
    },
    {
      label: "Needs Attention",
      value: needsAttention.toString(),
      icon: ShieldAlert,
      accent: needsAttention > 0 ? "text-status-warning" : "text-status-compliant",
      bgAccent: needsAttention > 0 ? "bg-amber-50 dark:bg-amber-950/40" : "bg-green-50 dark:bg-green-950/40",
      sub: "Farms with gaps or items to review",
    },
    {
      label: "Active Alerts",
      value: alerts.length.toString(),
      icon: AlertTriangle,
      accent: highAlerts > 0 ? "text-status-noncompliant" : "text-status-warning",
      bgAccent: highAlerts > 0 ? "bg-red-50 dark:bg-red-950/40" : "bg-amber-50 dark:bg-amber-950/40",
      sub: highAlerts > 0 ? `${highAlerts} high severity` : "No high severity",
    },
    {
      label: "Rules Tracked",
      value: regulationCount.toString(),
      icon: BookOpen,
      accent: "text-terracotta",
      bgAccent: "bg-amber-50 dark:bg-amber-950/40",
      sub: "Federal EPA rules for hog farms",
    },
  ];

  return (
    <div data-tour="kpis" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((c, i) => (
        <Card key={c.label} className={`border-border/60 animate-fade-in-up stagger-${i + 1}`}>
          <CardContent className="flex items-start gap-4 p-5">
            <div className={`rounded-lg p-2.5 ${c.bgAccent}`}>
              <c.icon className={`h-5 w-5 ${c.accent}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {c.label}
              </p>
              <p className="mt-1 text-2xl font-bold text-foreground">{c.value}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{c.sub}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
