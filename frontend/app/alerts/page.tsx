"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import type { Alert as AlertType } from "@/lib/types";
import { fetchAlerts } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  Bell,
  AlertTriangle,
  Clock,
  Building2,
  ExternalLink,
  CheckCircle2,
} from "lucide-react";

const SEVERITY_CONFIG = {
  high: {
    label: "High",
    variant: "destructive" as const,
    border: "border-l-red-500",
    bg: "bg-red-50/40 dark:bg-red-950/30",
    dot: "bg-red-500",
  },
  medium: {
    label: "Medium",
    variant: "secondary" as const,
    border: "border-l-amber-500",
    bg: "bg-amber-50/40 dark:bg-amber-950/30",
    dot: "bg-amber-500",
  },
  low: {
    label: "Low",
    variant: "outline" as const,
    border: "border-l-blue-500",
    bg: "bg-blue-50/40 dark:bg-blue-950/30",
    dot: "bg-blue-500",
  },
};

type SeverityFilter = "all" | "high" | "medium" | "low";

function formatTimestamp(ts: string) {
  return new Date(ts).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<AlertType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<SeverityFilter>("all");
  const [acknowledged, setAcknowledged] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadAlerts();
  }, []);

  async function loadAlerts() {
    setError(null);
    setLoading(true);
    try {
      const data = await fetchAlerts();
      const sorted = [...data].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      setAlerts(sorted);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load alerts");
    } finally {
      setLoading(false);
    }
  }

  const counts = useMemo(() => {
    const c = { high: 0, medium: 0, low: 0 };
    alerts.forEach((a) => c[a.severity]++);
    return c;
  }, [alerts]);

  const filtered = useMemo(() => {
    if (filter === "all") return alerts;
    return alerts.filter((a) => a.severity === filter);
  }, [alerts, filter]);

  const tabs: { key: SeverityFilter; label: string }[] = [
    { key: "all", label: `All (${alerts.length})` },
    { key: "high", label: `High (${counts.high})` },
    { key: "medium", label: `Medium (${counts.medium})` },
    { key: "low", label: `Low (${counts.low})` },
  ];

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-6 py-4 shrink-0">
        <div className="flex items-center gap-3">
          <Bell className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Compliance Alerts</h1>
          {!loading && (
            <Badge variant="secondary">{alerts.length} active</Badge>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>Live monitoring active</span>
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
          </span>
        </div>
      </div>

      {/* Severity summary + filter tabs */}
      <div className="flex items-center gap-1 border-b px-6 py-2 shrink-0">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              filter === tab.key
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Error state */}
      {error && (
        <div className="px-6 pt-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
            <Button variant="outline" size="sm" className="mt-3" onClick={loadAlerts}>
              Retry
            </Button>
          </Alert>
        </div>
      )}

      {/* Alert list */}
      <ScrollArea className="flex-1">
        <div className="p-6 space-y-4">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-36 rounded-lg" />
            ))
          ) : filtered.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              No alerts match the selected filter
            </p>
          ) : (
            filtered.map((alert) => {
              const sev = SEVERITY_CONFIG[alert.severity];
              const isAcked = acknowledged.has(alert.id);

              return (
                <Card
                  key={alert.id}
                  className={cn(
                    "border-l-4 transition-all duration-300",
                    sev.border,
                    isAcked ? "opacity-60 bg-muted/20" : sev.bg
                  )}
                >
                  <CardHeader className="pb-2 pt-4 px-5">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <CardTitle className="text-base font-semibold leading-snug flex-1">
                        {alert.regulation_title}
                      </CardTitle>
                      <Badge variant={sev.variant} className="shrink-0">
                        {sev.label} Severity
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      ID: {alert.regulation_id} &middot; {formatTimestamp(alert.timestamp)}
                    </p>
                  </CardHeader>

                  <CardContent className="px-5 pb-4 space-y-3">
                    <p className="text-sm leading-relaxed">{alert.description}</p>

                    <Separator />

                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Building2 className="h-3.5 w-3.5" />
                        <span>
                          {alert.affected_business_ids.length}{" "}
                          {alert.affected_business_ids.length === 1 ? "facility" : "facilities"}{" "}
                          affected
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {!isAcked && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 gap-1.5 text-xs text-muted-foreground"
                            onClick={() =>
                              setAcknowledged((prev) => new Set(prev).add(alert.id))
                            }
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            Acknowledge
                          </Button>
                        )}

                        {alert.affected_business_ids.length > 0 && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 gap-1.5 text-xs"
                            asChild
                          >
                            <Link
                              href={`/facilities?highlight=${alert.affected_business_ids.join(",")}`}
                            >
                              <ExternalLink className="h-3 w-3" />
                              View Facilities
                            </Link>
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
