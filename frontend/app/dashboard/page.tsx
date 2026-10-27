"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import type { Business, Regulation, Alert as AlertType } from "@/lib/types";
import { fetchBusinesses, fetchRegulations, fetchAlerts } from "@/lib/api";
import { STATUS_COLORS, STATUS_LABELS, STATUS_ORDER } from "@/lib/status";
import KpiCards from "@/components/kpi-cards";
import { ComplianceDonut } from "@/components/compliance-charts";
import RegulationTimeline from "@/components/regulation-timeline";
import RecentAlerts from "@/components/recent-alerts";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, ArrowRight } from "lucide-react";

const NCMap = dynamic(() => import("@/components/nc-map"), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full rounded-lg" />,
});

export default function DashboardPage() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [regulations, setRegulations] = useState<Regulation[]>([]);
  const [alerts, setAlerts] = useState<AlertType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setError(null);
    setLoading(true);
    try {
      const [bizRes, regRes, alertsRes] = await Promise.all([
        fetchBusinesses(),
        fetchRegulations(),
        fetchAlerts(),
      ]);
      setBusinesses(bizRes.items);
      setRegulations(regRes.items);
      setAlerts(alertsRes);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <Alert variant="destructive" className="max-w-md">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
          <Button variant="outline" size="sm" className="mt-3" onClick={loadData}>
            Retry
          </Button>
        </Alert>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div>
          <Skeleton className="h-7 w-48" />
          <Skeleton className="mt-1 h-4 w-72" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-lg" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Skeleton className="h-72 rounded-lg" />
          <Skeleton className="h-72 rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Compliance overview for {businesses.length} hog farms in eastern North Carolina
        </p>
      </div>

      <KpiCards
        businesses={businesses}
        alerts={alerts}
        regulationCount={regulations.length}
      />

      <Card data-tour="dashboard-map" className="border-border/60 animate-fade-in-up stagger-5">
        <CardContent className="p-0">
          <div className="h-[320px] overflow-hidden rounded-t-lg">
            <NCMap
              businesses={businesses}
              onMarkerClick={() => {}}
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3">
            <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {STATUS_ORDER.map((s) => (
                <li key={s} className="flex items-center gap-1.5">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: STATUS_COLORS[s] }}
                  />
                  {STATUS_LABELS[s]}
                </li>
              ))}
            </ul>
            <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
              <Link href="/facilities">
                View all facilities <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 animate-fade-in-up stagger-6">
        <ComplianceDonut businesses={businesses} />
        <RegulationTimeline regulations={regulations} />
      </div>

      <div className="animate-fade-in-up stagger-6">
        <RecentAlerts alerts={alerts} />
      </div>
    </div>
  );
}
