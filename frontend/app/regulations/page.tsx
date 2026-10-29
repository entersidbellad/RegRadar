"use client";

import { useEffect, useState, useMemo } from "react";
import type { Regulation } from "@/lib/types";
import { fetchRegulations } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertTriangle, BookOpen, Calendar, CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";
import { SNAPSHOT_NOTE, WEEKLY_CHECK_NOTE } from "@/lib/data-snapshot";

function AgencyBadge({ agency }: { agency: string }) {
  if (agency === "EPA") {
    return <Badge className="bg-blue-600 text-white hover:bg-blue-700 text-xs">EPA</Badge>;
  }
  if (agency === "NC_DEQ") {
    return <Badge className="bg-green-700 text-white hover:bg-green-800 text-xs">NC DEQ</Badge>;
  }
  return <Badge variant="secondary" className="text-xs">{agency}</Badge>;
}

// Federal Register seed data uses "Rule"; older fixtures used "RULE".
function normalizeDocType(type: string) {
  return type.toUpperCase().replace(/\s+/g, "_");
}

function DocTypeBadge({ type: rawType }: { type: string }) {
  const type = normalizeDocType(rawType);
  const label = type === "PROPOSED_RULE" ? "Proposed" : type === "RULE" ? "Final Rule" : rawType;
  const cls = type === "PROPOSED_RULE"
    ? "border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400"
    : "border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950/30 text-green-800 dark:text-green-400";
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${cls}`}>
      {label}
    </span>
  );
}

export default function RegulationsPage() {
  const [regulations, setRegulations] = useState<Regulation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [agencyFilter, setAgencyFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetchRegulations();
      setRegulations(res.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load regulations");
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    let result = regulations;
    if (agencyFilter !== "all") {
      result = result.filter((r) => r.agency === agencyFilter);
    }
    if (typeFilter !== "all") {
      result = result.filter((r) => normalizeDocType(r.document_type) === typeFilter);
    }
    return result.sort(
      (a, b) => new Date(b.publication_date).getTime() - new Date(a.publication_date).getTime()
    );
  }, [regulations, agencyFilter, typeFilter]);

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
          <h1 className="text-2xl font-bold text-foreground">Regulations</h1>
          <p className="text-sm text-muted-foreground">
            Federal EPA rules that affect hog farms and other animal feeding operations
          </p>
          <p
            data-testid="weekly-check-note"
            className="mt-2 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-sm text-muted-foreground"
          >
            <CheckCircle2 className="h-4 w-4 shrink-0 text-primary dark:text-green-400" aria-hidden="true" />
            <span className="font-medium text-foreground">{WEEKLY_CHECK_NOTE}</span>
            <span>{SNAPSHOT_NOTE}</span>
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 border-b px-6 py-3 shrink-0">
        <Select value={agencyFilter} onValueChange={setAgencyFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Agency" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Agencies</SelectItem>
            <SelectItem value="EPA">EPA</SelectItem>
            <SelectItem value="NC_DEQ">NC DEQ</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[170px]">
            <SelectValue placeholder="Document Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="RULE">Final Rule</SelectItem>
            <SelectItem value="PROPOSED_RULE">Proposed Rule</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground">
          {filtered.length} of {regulations.length} regulations
        </span>
      </div>

      {/* Regulation list */}
      <ScrollArea className="flex-1">
        <div className="p-6 space-y-4">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-36 rounded-lg" />
            ))
          ) : filtered.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              No regulations match your filters
            </p>
          ) : (
            filtered.map((reg) => {
              const isExpanded = expandedId === reg.id;
              return (
                <Card key={reg.id} className="border-border/60 transition-all">
                  <CardHeader className="p-5 pb-3">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <AgencyBadge agency={reg.agency} />
                      <DocTypeBadge type={reg.document_type} />
                      <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {new Date(reg.publication_date).toLocaleDateString(undefined, { timeZone: "UTC" })}
                      </span>
                    </div>
                    <CardTitle className="text-base font-semibold leading-snug text-foreground">
                      {reg.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-5 pb-4 pt-0">
                    <p className={`text-sm leading-relaxed text-muted-foreground ${isExpanded ? "" : "line-clamp-3"}`}>
                      {reg.abstract}
                    </p>

                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <span>ID: {reg.id}</span>
                        {reg.effective_date && (
                          <span>
                            Effective: {new Date(reg.effective_date).toLocaleDateString(undefined, { timeZone: "UTC" })}
                          </span>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs gap-1"
                        onClick={() => setExpandedId(isExpanded ? null : reg.id)}
                      >
                        {isExpanded ? (
                          <>Less <ChevronUp className="h-3 w-3" /></>
                        ) : (
                          <>More <ChevronDown className="h-3 w-3" /></>
                        )}
                      </Button>
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
