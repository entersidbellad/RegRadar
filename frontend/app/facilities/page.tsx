"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import type { Business, Regulation } from "@/lib/types";
import { fetchBusinesses, fetchRegulations } from "@/lib/api";
import { STATUS_COLORS, STATUS_LABELS, STATUS_ORDER } from "@/lib/status";
import FacilitiesTable from "@/components/facilities-table";
import BusinessDetail from "@/components/business-detail";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, TableProperties, Map as MapIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const NCMap = dynamic(() => import("@/components/nc-map"), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full rounded-lg" />,
});

function FacilitiesInner() {
  const searchParams = useSearchParams();
  const highlightParam = searchParams.get("highlight") ?? "";
  const highlightedIds = highlightParam
    ? highlightParam.split(",").filter(Boolean)
    : [];

  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [regulations, setRegulations] = useState<Regulation[]>([]);
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [view, setView] = useState<"table" | "map">("table");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (highlightedIds.length > 0) setView("map");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlightParam]);

  async function loadData() {
    setError(null);
    setLoading(true);
    try {
      const [bizRes, regRes] = await Promise.all([
        fetchBusinesses(),
        fetchRegulations(),
      ]);
      setBusinesses(bizRes.items);
      setRegulations(regRes.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }

  const handleSelect = (business: Business) => {
    setSelectedBusiness(business);
    setSheetOpen(true);
  };

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

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-6 py-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Facilities</h1>
          <p className="text-sm text-muted-foreground">
            {businesses.length} hog farms monitored in eastern North Carolina
          </p>
        </div>
        <div className="flex items-center rounded-lg border bg-muted/40 p-0.5">
          <button
            onClick={() => setView("table")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              view === "table"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <TableProperties className="h-3.5 w-3.5" />
            Table
          </button>
          <button
            onClick={() => setView("map")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              view === "map"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <MapIcon className="h-3.5 w-3.5" />
            Map
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="space-y-4 p-6">
            <div className="flex gap-3">
              <Skeleton className="h-10 flex-1 max-w-sm" />
              <Skeleton className="h-10 w-[160px]" />
              <Skeleton className="h-10 w-[160px]" />
            </div>
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-14" />
            ))}
          </div>
        ) : view === "table" ? (
          <div className="p-6">
            <FacilitiesTable businesses={businesses} onRowClick={handleSelect} />
          </div>
        ) : (
          <div data-tour="facilities-map" className="relative h-full">
            <NCMap
              businesses={businesses}
              onMarkerClick={handleSelect}
              highlightedIds={highlightedIds}
            />
            {/* Map legend */}
            <div className="absolute bottom-4 left-4 z-[1000] rounded-lg border bg-card/90 p-3 backdrop-blur-sm shadow">
              <p className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Facility Status
              </p>
              <div className="space-y-1">
                {STATUS_ORDER.map((s) => (
                  <div key={s} className="flex items-center gap-2">
                    <span
                      className="inline-block h-3 w-3 rounded-full"
                      style={{ backgroundColor: STATUS_COLORS[s] }}
                    />
                    <span className="text-xs">{STATUS_LABELS[s]}</span>
                  </div>
                ))}
              </div>
              {highlightedIds.length > 0 && (
                <>
                  <div className="my-2 border-t" />
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block h-3 w-3 rounded-full ring-2 ring-white"
                      style={{ backgroundColor: "#dc2626" }}
                    />
                    <span className="text-xs font-medium text-red-600">
                      Affected by alert ({highlightedIds.length})
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Business Detail Sheet */}
      <BusinessDetail
        business={selectedBusiness}
        regulations={regulations}
        open={sheetOpen}
        onClose={() => {
          setSheetOpen(false);
          setSelectedBusiness(null);
        }}
      />
    </div>
  );
}

export default function FacilitiesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-full items-center justify-center">
          <Skeleton className="h-[90%] w-[95%] rounded-lg" />
        </div>
      }
    >
      <FacilitiesInner />
    </Suspense>
  );
}
