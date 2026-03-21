"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Alert as AlertType } from "@/lib/types";
import { fetchAlerts } from "@/lib/api";
import { mockTimerAlert } from "@/lib/mock-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/lib/use-toast";
import {
  Bell,
  AlertTriangle,
  Clock,
  Building2,
  ExternalLink,
} from "lucide-react";

// ── Constants ────────────────────────────────────────────────────────────────

const SEVERITY_CONFIG = {
  high: {
    label: "High",
    variant: "destructive" as const,
    border: "border-l-red-500",
    bg: "bg-red-50/40",
  },
  medium: {
    label: "Medium",
    variant: "secondary" as const,
    border: "border-l-yellow-500",
    bg: "bg-yellow-50/40",
  },
  low: {
    label: "Low",
    variant: "outline" as const,
    border: "border-l-blue-500",
    bg: "bg-blue-50/40",
  },
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function buildHighlightUrl(ids: string[]) {
  return `/?highlight=${ids.join(",")}`;
}

function formatTimestamp(ts: string) {
  return new Date(ts).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<AlertType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Initial load
  useEffect(() => {
    loadAlerts();
  }, []);

  // 60-second interval simulating live regulation detection
  useEffect(() => {
    const interval = setInterval(() => {
      const newAlert: AlertType = {
        ...mockTimerAlert,
        timestamp: new Date().toISOString(),
      };

      setAlerts((prev) => {
        // Don't add duplicate if already present
        if (prev.some((a) => a.id === newAlert.id)) return prev;
        return [newAlert, ...prev];
      });

      toast({
        title: "New Regulation Alert",
        description:
          "EPA proposed rule detected affecting 4 facilities in the monitoring area.",
        variant: "default",
      });
    }, 60000);

    return () => clearInterval(interval);
  }, [toast]);

  async function loadAlerts() {
    setError(null);
    setLoading(true);
    try {
      const data = await fetchAlerts();
      // Sort descending by timestamp
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

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-6 py-4 shrink-0">
        <div className="flex items-center gap-3">
          <Bell className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-semibold">Compliance Alerts</h1>
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

      {/* Error state */}
      {error && (
        <div className="px-6 pt-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={loadAlerts}
            >
              Retry
            </Button>
          </Alert>
        </div>
      )}

      {/* Alert list */}
      <ScrollArea className="flex-1">
        <div className="p-6 space-y-4">
          {loading ? (
            // Skeletons
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-2 rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-5 w-1/4" />
                  <Skeleton className="h-5 w-20" />
                </div>
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-4 w-1/3" />
              </div>
            ))
          ) : (
            alerts.map((alert) => {
              const sev = SEVERITY_CONFIG[alert.severity];
              return (
                <Card
                  key={alert.id}
                  className={`border-l-4 ${sev.border} ${sev.bg} transition-all duration-300`}
                >
                  <CardHeader className="pb-2 pt-4 px-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <CardTitle className="text-base font-medium leading-snug flex-1">
                        {alert.regulation_title}
                      </CardTitle>
                      <Badge variant={sev.variant} className="shrink-0">
                        {sev.label} Severity
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      ID: {alert.regulation_id} &middot;{" "}
                      {formatTimestamp(alert.timestamp)}
                    </p>
                  </CardHeader>

                  <CardContent className="px-4 pb-4 space-y-3">
                    <p className="text-sm leading-relaxed">{alert.description}</p>

                    <Separator />

                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Building2 className="h-3.5 w-3.5" />
                        <span>
                          {alert.affected_business_ids.length}{" "}
                          {alert.affected_business_ids.length === 1
                            ? "facility"
                            : "facilities"}{" "}
                          affected
                        </span>
                      </div>

                      {alert.affected_business_ids.length > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 gap-1.5 text-xs"
                          asChild
                        >
                          <Link href={buildHighlightUrl(alert.affected_business_ids)}>
                            <ExternalLink className="h-3 w-3" />
                            View Affected Facilities
                          </Link>
                        </Button>
                      )}
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
