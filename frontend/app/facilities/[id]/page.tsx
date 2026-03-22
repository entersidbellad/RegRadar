"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import type { Business, Alert as AlertType } from "@/lib/types";
import { fetchBusinessDetail, fetchAlerts } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  MapPin,
  Building2,
  FileText,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  ShieldQuestion,
} from "lucide-react";

const NCMap = dynamic(() => import("@/components/nc-map"), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full rounded-lg" />,
});

const STATUS_CONFIG = {
  compliant: {
    label: "Compliant",
    badge: "bg-green-100 dark:bg-green-950/40 text-green-800 dark:text-green-300 border-green-200 dark:border-green-900",
    icon: ShieldCheck,
    iconColor: "text-green-600 dark:text-green-400",
  },
  warning: {
    label: "Warning",
    badge: "bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-900",
    icon: ShieldAlert,
    iconColor: "text-amber-600 dark:text-amber-400",
  },
  non_compliant: {
    label: "Non-Compliant",
    badge: "bg-red-100 dark:bg-red-950/40 text-red-800 dark:text-red-300 border-red-200 dark:border-red-900",
    icon: ShieldAlert,
    iconColor: "text-red-600 dark:text-red-400",
  },
  unknown: {
    label: "Unknown",
    badge: "bg-gray-100 dark:bg-gray-900/40 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-800",
    icon: ShieldQuestion,
    iconColor: "text-gray-500 dark:text-gray-400",
  },
} as const;

export default function FacilityDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [business, setBusiness] = useState<Business | null>(null);
  const [alerts, setAlerts] = useState<AlertType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [biz, allAlerts] = await Promise.all([
          fetchBusinessDetail(id),
          fetchAlerts(),
        ]);
        setBusiness(biz);
        setAlerts(allAlerts.filter((a) => a.affected_business_ids.includes(id)));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load facility");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-48 rounded-lg" />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Skeleton className="h-64 rounded-lg" />
          <Skeleton className="h-64 rounded-lg" />
        </div>
      </div>
    );
  }

  if (error || !business) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="text-center">
          <p className="text-lg font-semibold text-foreground">{error || "Facility not found"}</p>
          <Button variant="outline" className="mt-4" asChild>
            <Link href="/facilities">Back to Facilities</Link>
          </Button>
        </div>
      </div>
    );
  }

  const status = STATUS_CONFIG[business.latest_status];
  const StatusIcon = status.icon;

  return (
    <div className="space-y-6 p-6">
      {/* Breadcrumb + Back */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" className="h-8 gap-1.5" asChild>
          <Link href="/facilities">
            <ArrowLeft className="h-4 w-4" />
            Facilities
          </Link>
        </Button>
      </div>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{business.name}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {business.county} County
            </span>
            <span className="flex items-center gap-1">
              <FileText className="h-3.5 w-3.5" />
              Permit {business.permit_number}
            </span>
            <span className="flex items-center gap-1">
              <Building2 className="h-3.5 w-3.5" />
              {business.head_count.toLocaleString()} head
            </span>
          </div>
        </div>
        <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${status.badge}`}>
          <StatusIcon className={`h-5 w-5 ${status.iconColor}`} />
          <span className="text-sm font-semibold">{status.label}</span>
        </div>
      </div>

      {/* Map + Info grid */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Location map */}
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Location</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="h-[280px] overflow-hidden rounded-b-lg">
              <NCMap
                businesses={[business]}
                onMarkerClick={() => {}}
              />
            </div>
          </CardContent>
        </Card>

        {/* Facility details */}
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Facility Details</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3">
              <DetailRow label="Operation Type" value={business.operation_type} />
              <DetailRow label="Permit Type" value={business.permit_type} />
              <DetailRow label="NAICS Code" value={business.naics_code || "N/A"} />
              <DetailRow label="Head Count" value={business.head_count.toLocaleString()} />
              <DetailRow label="County" value={business.county} />
              <DetailRow
                label="Coordinates"
                value={`${business.latitude.toFixed(4)}, ${business.longitude.toFixed(4)}`}
              />
            </dl>
          </CardContent>
        </Card>
      </div>

      {/* Active Alerts */}
      {alerts.length > 0 && (
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <AlertTriangle className="h-4 w-4 text-status-warning" />
              Active Alerts ({alerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {alerts.map((alert) => {
              const sevColors = {
                high: "bg-red-100 dark:bg-red-950/40 text-red-800 dark:text-red-300",
                medium: "bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300",
                low: "bg-blue-100 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300",
              };
              return (
                <div
                  key={alert.id}
                  className="rounded-lg border border-border/60 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">
                        {alert.regulation_title}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {alert.description}
                      </p>
                    </div>
                    <Badge className={sevColors[alert.severity]}>
                      {alert.severity}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Compliance History */}
      {business.analyses && business.analyses.length > 0 && (
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">
              Compliance Analysis History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-lg border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Date</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Regulation</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Status</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Confidence</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Summary</th>
                  </tr>
                </thead>
                <tbody>
                  {business.analyses.map((a) => {
                    const aStatus = STATUS_CONFIG[a.overall_status];
                    return (
                      <tr key={a.id} className="border-b border-border/40 last:border-b-0">
                        <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                          {new Date(a.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-3 py-2 font-medium">{a.regulation_id}</td>
                        <td className="px-3 py-2">
                          <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-semibold ${aStatus.badge}`}>
                            {aStatus.label}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {(a.confidence * 100).toFixed(0)}%
                        </td>
                        <td className="px-3 py-2 text-xs text-muted-foreground max-w-md truncate">
                          {a.summary}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* No analyses placeholder */}
      {(!business.analyses || business.analyses.length === 0) && (
        <Card className="border-border/60">
          <CardContent className="py-12 text-center">
            <ShieldQuestion className="mx-auto h-10 w-10 text-muted-foreground/40" />
            <p className="mt-3 text-sm font-medium text-muted-foreground">
              No compliance analyses yet
            </p>
            <p className="mt-1 text-xs text-muted-foreground/70">
              Run an analysis from the regulations page to check this facility.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between border-b border-border/40 pb-2 last:border-b-0 last:pb-0">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium text-foreground">{value}</dd>
    </div>
  );
}
