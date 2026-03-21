"use client";

import { useState } from "react";
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
import { Skeleton } from "@/components/ui/skeleton";
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
} from "lucide-react";
import { runAnalysis } from "@/lib/api";
import AnalysisResult from "./analysis-result";

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

interface BusinessDetailProps {
  business: Business | null;
  regulations: Regulation[];
  open: boolean;
  onClose: () => void;
}

export default function BusinessDetail({
  business,
  regulations,
  open,
  onClose,
}: BusinessDetailProps) {
  const [selectedRegId, setSelectedRegId] = useState<string>("");
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] =
    useState<ComplianceGapAnalysis | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!business || !selectedRegId) return;

    setAnalyzing(true);
    setAnalysisError(null);
    setAnalysisResult(null);

    try {
      const result = await runAnalysis(business.id, selectedRegId);
      setAnalysisResult(result);
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
      // Reset state when closing
      setSelectedRegId("");
      setAnalysisResult(null);
      setAnalysisError(null);
    }
  };

  if (!business) return null;

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
          {/* Facility Info */}
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

          {/* Compliance History */}
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

          {/* Analyze Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Run Compliance Analysis</h3>
            <Select value={selectedRegId} onValueChange={setSelectedRegId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a regulation..." />
              </SelectTrigger>
              <SelectContent>
                {regulations.map((reg) => (
                  <SelectItem key={reg.id} value={reg.id}>
                    <span className="line-clamp-1">{reg.title}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              className="w-full"
              disabled={!selectedRegId || analyzing}
              onClick={handleAnalyze}
            >
              {analyzing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                "Analyze Compliance"
              )}
            </Button>

            {analysisError && (
              <div className="rounded-md border border-red-200 bg-red-50 p-3">
                <p className="text-sm text-red-700">{analysisError}</p>
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

          {/* Analysis Result */}
          {analyzing && (
            <div className="space-y-3">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          )}

          {analysisResult && !analyzing && (
            <AnalysisResult analysis={analysisResult} />
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
