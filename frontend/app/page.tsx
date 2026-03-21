"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import type { Business, Regulation } from "@/lib/types";
import { fetchBusinesses, fetchRegulations } from "@/lib/api";
import RegFeed from "@/components/reg-feed";
import BusinessDetail from "@/components/business-detail";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle } from "lucide-react";

// Leaflet MUST be loaded client-side only
const NCMap = dynamic(() => import("@/components/nc-map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center bg-muted/20">
      <Skeleton className="h-full w-full" />
    </div>
  ),
});

// Inner component that reads search params (must be inside Suspense)
function DashboardInner() {
  const searchParams = useSearchParams();
  const highlightParam = searchParams.get("highlight") ?? "";
  const highlightedIds = highlightParam
    ? highlightParam.split(",").filter(Boolean)
    : [];

  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [regulations, setRegulations] = useState<Regulation[]>([]);
  const [selectedReg, setSelectedReg] = useState<string | null>(null);
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [loadingBiz, setLoadingBiz] = useState(true);
  const [loadingRegs, setLoadingRegs] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setError(null);
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
      setLoadingBiz(false);
      setLoadingRegs(false);
    }
  }

  const handleMarkerClick = (business: Business) => {
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
    <div className="flex h-full">
      {/* Left panel: Regulation Feed (35%) */}
      <div className="w-[35%] border-r overflow-hidden">
        <RegFeed
          regulations={regulations}
          selectedId={selectedReg}
          onSelect={(reg) => setSelectedReg(reg.id)}
          loading={loadingRegs}
        />
      </div>

      {/* Right panel: Map (65%) */}
      <div className="w-[65%] relative">
        {loadingBiz ? (
          <div className="flex h-full items-center justify-center">
            <Skeleton className="h-[90%] w-[95%] rounded-lg" />
          </div>
        ) : (
          <NCMap
            businesses={businesses}
            onMarkerClick={handleMarkerClick}
            highlightedIds={highlightedIds}
          />
        )}

        {/* Map legend */}
        <div className="absolute bottom-4 left-4 z-[1000] rounded-lg border bg-background/90 p-3 backdrop-blur-sm shadow">
          <p className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Facility Status
          </p>
          <div className="space-y-1">
            {[
              { color: "#22c55e", label: "Compliant" },
              { color: "#eab308", label: "Warning" },
              { color: "#ef4444", label: "Non-Compliant" },
              { color: "#9ca3af", label: "Unknown" },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-2">
                <span
                  className="inline-block h-3 w-3 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <span className="text-xs">{label}</span>
              </div>
            ))}
          </div>

          {highlightedIds.length > 0 && (
            <>
              <div className="my-2 border-t" />
              <div className="flex items-center gap-2">
                <span
                  className="inline-block h-3 w-3 rounded-full ring-2 ring-white"
                  style={{ backgroundColor: "#ef4444" }}
                />
                <span className="text-xs font-medium text-red-600">
                  Alert ({highlightedIds.length})
                </span>
              </div>
            </>
          )}
        </div>
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

// Outer wrapper with Suspense boundary required by useSearchParams
export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-full items-center justify-center">
          <Skeleton className="h-[90%] w-[95%] rounded-lg" />
        </div>
      }
    >
      <DashboardInner />
    </Suspense>
  );
}
