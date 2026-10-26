"use client";

import { useState, useEffect, useRef } from "react";
import type { Business, Regulation, ComplianceGapAnalysis } from "@/lib/types";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MapPin,
  Hash,
  Building2,
  Tractor,
  BarChart3,
  Loader2,
  Zap,
  Clock,
  Info,
} from "lucide-react";
import {
  runAnalysis,
  DEMO_MODE,
  DEMO_LIVE_ANALYSIS_NOTE,
  hasDemoAnalysis,
} from "@/lib/api";
import AnalysisResult from "./analysis-result";

const CORE_REG_ID = "E8-26620";

const STATUS_LABELS: Record<string, string> = {
  compliant: "Compliant",
  warning: "Warning",
  non_compliant: "Non-Compliant",
  unknown: "Unknown",
};

const STATUS_VARIANTS: Record<
  string,
  "default" | "destructive" | "secondary" | "outline"
> = {
  compliant: "default",
  warning: "secondary",
  non_compliant: "destructive",
  unknown: "outline",
};

function AnalysisProgress() {
  const [elapsed, setElapsed] = useState(0);
  const estimatedTotal = 180;

  useEffect(() => {
    const interval = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const pct = Math.min((elapsed / estimatedTotal) * 100, 95);
  const remaining = Math.max(estimatedTotal - elapsed, 5);

  const stage =
    elapsed < 30
      ? "Retrieving regulation text..."
      : elapsed < 90
        ? "Extracting compliance requirements..."
        : elapsed < 150
          ? "Analyzing facility against requirements..."
          : "Finalizing gap analysis...";

  return (
    <div className="rounded-lg border border-border/60 bg-muted/30 p-4 space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        AI Compliance Analysis Running
      </div>
      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all duration-1000 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{stage}</span>
        <span>~{remaining}s remaining</span>
      </div>
    </div>
  );
}

interface BusinessDetailProps {
  business: Business | null;
  regulations: Regulation[];
  open: boolean;
  onClose: () => void;
  onAnalysisComplete?: () => void;
}

export default function BusinessDetail({
  business,
  regulations,
  open,
  onClose,
  onAnalysisComplete,
}: BusinessDetailProps) {
  const [selectedRegId, setSelectedRegId] = useState<string>(CORE_REG_ID);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] =
    useState<ComplianceGapAnalysis | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [wasFast, setWasFast] = useState(false);

  const handleAnalyze = async () => {
    if (!business || !selectedRegId) return;

    setAnalyzing(true);
    setAnalysisError(null);
    setAnalysisResult(null);
    setWasFast(false);
    const start = Date.now();

    try {
      const result = await runAnalysis(business.id, selectedRegId);
      setAnalysisResult(result);
      setWasFast(Date.now() - start < 3000);
      onAnalysisComplete?.();
    } catch (err) {
      setAnalysisError(
        err instanceof Error ? err.message : "Analysis failed"
      );
    } finally {
      setAnalyzing(false);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      onClose();
      setSelectedRegId(CORE_REG_ID);
      setAnalysisResult(null);
      setAnalysisError(null);
      setWasFast(false);
    }
  };

  if (!business) return null;

  const isCached = (regId: string) =>
    DEMO_MODE ? hasDemoAnalysis(business.id, regId) : regId === CORE_REG_ID;
  const isCachedReg = isCached(selectedRegId);
  const liveAnalysisUnavailable = DEMO_MODE && !isCachedReg;

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-xl">{business.name}</SheetTitle>
          <SheetDescription>
            {business.county} County &middot; {business.operation_type}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <InfoRow
              icon={<Hash className="h-4 w-4" />}
              label="Permit"
              value={business.permit_number}
            />
            <InfoRow
              icon={<Building2 className="h-4 w-4" />}
              label="Type"
              value={business.permit_type}
            />
            <InfoRow
              icon={<Tractor className="h-4 w-4" />}
              label="Head Count"
              value={business.head_count.toLocaleString()}
            />
            <InfoRow
              icon={<MapPin className="h-4 w-4" />}
              label="Location"
              value={`${business.latitude.toFixed(3)}, ${business.longitude.toFixed(3)}`}
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Status:</span>
            <Badge variant={STATUS_VARIANTS[business.latest_status]}>
              {STATUS_LABELS[business.latest_status]}
            </Badge>
          </div>

          <Separator />

          {business.analyses && business.analyses.length > 0 && (
            <div>
              <h3 className="flex items-center gap-2 text-sm font-semibold mb-3">
                <BarChart3 className="h-4 w-4" />
                Compliance History
              </h3>
              <div className="space-y-2">
                {business.analyses.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center justify-between rounded-md border p-3"
                  >
                    <div className="flex-1">
                      <p className="text-sm line-clamp-1">{a.summary}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(a.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge
                      variant={STATUS_VARIANTS[a.overall_status]}
                      className="ml-2 shrink-0"
                    >
                      {STATUS_LABELS[a.overall_status]}
                    </Badge>
                  </div>
                ))}
              </div>
              <Separator className="mt-4" />
            </div>
          )}

          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Run Compliance Analysis</h3>
            <Select value={selectedRegId} onValueChange={setSelectedRegId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a regulation..." />
              </SelectTrigger>
              <SelectContent>
                {[...regulations]
                  .sort((a, b) => Number(isCached(b.id)) - Number(isCached(a.id)))
                  .map((reg) => (
                  <SelectItem key={reg.id} value={reg.id}>
                    <span className="flex items-center gap-1.5">
                      {isCached(reg.id) ? (
                        <Zap className="h-3 w-3 shrink-0 text-green-600" />
                      ) : (
                        <Clock className="h-3 w-3 shrink-0 text-muted-foreground" />
                      )}
                      <span className="line-clamp-1">{reg.title}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {liveAnalysisUnavailable ? (
              <p className="flex items-start gap-1.5 rounded-md border border-border/60 bg-muted/40 p-2.5 text-xs text-muted-foreground">
                <Info className="mt-0.5 h-3 w-3 shrink-0" />
                {DEMO_LIVE_ANALYSIS_NOTE}
              </p>
            ) : (
              !isCachedReg &&
              !analyzing && (
                <p className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                  <Clock className="h-3 w-3" />
                  This regulation is not pre-cached. Analysis may take 2-3 minutes.
                </p>
              )
            )}

            <Button
              className="w-full"
              disabled={!selectedRegId || analyzing || liveAnalysisUnavailable}
              onClick={handleAnalyze}
            >
              {analyzing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  {isCachedReg && <Zap className="mr-2 h-4 w-4" />}
                  Analyze Compliance
                </>
              )}
            </Button>

            {analysisError && (
              <div className="rounded-md border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 p-3">
                <p className="text-sm text-red-700 dark:text-red-400">{analysisError}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={handleAnalyze}
                >
                  Retry
                </Button>
              </div>
            )}
          </div>

          {analyzing && <AnalysisProgress />}

          {analysisResult && !analyzing && (
            <>
              {wasFast && (
                <div className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400">
                  <Zap className="h-3 w-3" />
                  Returned from cache — instant response
                </div>
              )}
              <AnalysisResult analysis={analysisResult} />
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 text-muted-foreground">{icon}</span>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}
