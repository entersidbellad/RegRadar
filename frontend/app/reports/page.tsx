"use client";

import { useEffect, useState } from "react";
import type { Business, Alert as AlertType } from "@/lib/types";
import { fetchBusinesses, fetchAlerts } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { FileBarChart, Download, Building2, AlertTriangle, FileText, Printer } from "lucide-react";

function downloadCSV(filename: string, headers: string[], rows: string[][]) {
  const csv = [headers.join(","), ...rows.map((r) => r.map((c) => `"${c}"`).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const STATUS_LABELS: Record<string, string> = {
  compliant: "Compliant",
  warning: "Warning",
  non_compliant: "Non-Compliant",
  unknown: "Unknown",
};

export default function ReportsPage() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [alerts, setAlerts] = useState<AlertType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSummary, setShowSummary] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setError(null);
    setLoading(true);
    try {
      const [bizRes, alertsRes] = await Promise.all([
        fetchBusinesses(),
        fetchAlerts(),
      ]);
      setBusinesses(bizRes.items);
      setAlerts(alertsRes);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load report data");
    } finally {
      setLoading(false);
    }
  }

  function exportFacilities() {
    const headers = ["Name", "Permit Number", "County", "Head Count", "Permit Type", "Status", "Latitude", "Longitude"];
    const rows = businesses.map((b) => [
      b.name,
      b.permit_number,
      b.county,
      b.head_count.toString(),
      b.permit_type,
      STATUS_LABELS[b.latest_status] || b.latest_status,
      b.latitude.toString(),
      b.longitude.toString(),
    ]);
    downloadCSV("regradar_facilities.csv", headers, rows);
  }

  function exportAlerts() {
    const headers = ["Regulation", "Regulation ID", "Severity", "Affected Facilities", "Timestamp", "Description"];
    const rows = alerts.map((a) => [
      a.regulation_title,
      a.regulation_id,
      a.severity,
      a.affected_business_ids.length.toString(),
      a.timestamp,
      a.description,
    ]);
    downloadCSV("regradar_alerts.csv", headers, rows);
  }

  const statusCounts = businesses.reduce(
    (acc, b) => {
      acc[b.latest_status] = (acc[b.latest_status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b px-6 py-4 shrink-0 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reports</h1>
          <p className="text-sm text-muted-foreground">
            Export data and generate compliance summaries
          </p>
        </div>
        <Button
          onClick={() => window.print()}
          variant="outline"
          size="sm"
          className="no-print gap-2"
        >
          <Printer className="h-4 w-4" />
          Print Report
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-6 space-y-6">
        {error && (
          <Alert variant="destructive" className="max-w-md">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
            <Button variant="outline" size="sm" className="mt-3" onClick={loadData}>
              Retry
            </Button>
          </Alert>
        )}

        {loading ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-40 rounded-lg" />
            ))}
          </div>
        ) : (
          <>
            {/* Export cards */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Card className="border-border/60">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                    <Building2 className="h-4 w-4 text-primary" />
                    Facilities Export
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground mb-4">
                    Download all {businesses.length} facility records with permit details, location, and compliance status.
                  </p>
                  <Button
                    onClick={exportFacilities}
                    className="w-full gap-2 bg-primary hover:bg-primary/90"
                    size="sm"
                  >
                    <Download className="h-4 w-4" />
                    Export CSV
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-border/60">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                    <AlertTriangle className="h-4 w-4 text-status-warning" />
                    Alerts Export
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground mb-4">
                    Download all {alerts.length} compliance alerts with severity, affected facilities, and descriptions.
                  </p>
                  <Button
                    onClick={exportAlerts}
                    className="w-full gap-2 bg-primary hover:bg-primary/90"
                    size="sm"
                  >
                    <Download className="h-4 w-4" />
                    Export CSV
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-border/60">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                    <FileText className="h-4 w-4 text-terracotta" />
                    Compliance Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground mb-4">
                    Generate an at-a-glance compliance summary across all monitored facilities.
                  </p>
                  <Button
                    onClick={() => setShowSummary(!showSummary)}
                    variant={showSummary ? "secondary" : "default"}
                    className={showSummary ? "w-full gap-2" : "w-full gap-2 bg-primary hover:bg-primary/90"}
                    size="sm"
                  >
                    <FileBarChart className="h-4 w-4" />
                    {showSummary ? "Hide Summary" : "Generate Summary"}
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Compliance summary */}
            {showSummary && (
              <Card className="border-border/60">
                <CardHeader>
                  <CardTitle className="text-base font-semibold">
                    Compliance Summary Report
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Generated {new Date().toLocaleDateString()} &middot; {businesses.length} facilities
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Status breakdown */}
                  <div>
                    <p className="text-sm font-medium mb-2">Status Distribution</p>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {(["compliant", "warning", "non_compliant", "unknown"] as const).map((s) => {
                        const colors: Record<string, string> = {
                          compliant: "bg-green-100 dark:bg-green-950/40 text-green-800 dark:text-green-300 border-green-200 dark:border-green-900",
                          warning: "bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-900",
                          non_compliant: "bg-red-100 dark:bg-red-950/40 text-red-800 dark:text-red-300 border-red-200 dark:border-red-900",
                          unknown: "bg-gray-100 dark:bg-gray-900/40 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-800",
                        };
                        return (
                          <div
                            key={s}
                            className={`rounded-lg border p-3 text-center ${colors[s]}`}
                          >
                            <p className="text-2xl font-bold">{statusCounts[s] || 0}</p>
                            <p className="text-xs font-medium">{STATUS_LABELS[s]}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <Separator />

                  {/* Facility list */}
                  <div>
                    <p className="text-sm font-medium mb-2">All Facilities</p>
                    <div className="overflow-hidden rounded-lg border">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b bg-muted/40">
                            <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Facility</th>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">County</th>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Head Count</th>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {businesses.map((b) => (
                            <tr key={b.id} className="border-b border-border/40 last:border-b-0">
                              <td className="px-3 py-2 font-medium">{b.name}</td>
                              <td className="px-3 py-2 text-muted-foreground">{b.county}</td>
                              <td className="px-3 py-2 text-muted-foreground">{b.head_count.toLocaleString()}</td>
                              <td className="px-3 py-2">
                                <Badge variant={b.latest_status === "compliant" ? "default" : b.latest_status === "non_compliant" ? "destructive" : "secondary"}>
                                  {STATUS_LABELS[b.latest_status]}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}
