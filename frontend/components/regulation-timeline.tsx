"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookOpen, ArrowRight, Calendar } from "lucide-react";
import Link from "next/link";
import type { Regulation } from "@/lib/types";

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "TBD";
  return new Date(dateStr).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function daysFromNow(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const now = new Date();
  const date = new Date(dateStr);
  return Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function dateTagClass(days: number | null): string {
  if (days === null) return "text-muted-foreground bg-muted/30 border-border/50";
  if (days > 0) return "text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900";
  return "text-muted-foreground bg-muted/30 border-border/50";
}

interface RegulationTimelineProps {
  regulations: Regulation[];
}

export default function RegulationTimeline({ regulations }: RegulationTimelineProps) {
  const sorted = [...regulations].sort((a, b) => {
    const da = a.effective_date || a.publication_date;
    const db = b.effective_date || b.publication_date;
    return new Date(db).getTime() - new Date(da).getTime();
  });

  return (
    <Card className="border-border/60">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <BookOpen className="h-4 w-4" />
          Regulation Timeline
        </CardTitle>
        <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
          <Link href="/regulations">
            View all <ArrowRight className="ml-1 h-3 w-3" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {sorted.length === 0 ? (
          <p className="py-4 text-center text-xs text-muted-foreground">
            No regulations loaded
          </p>
        ) : (
          sorted.slice(0, 5).map((reg) => {
            const days = daysFromNow(reg.effective_date);
            const dateLabel = reg.effective_date
              ? days !== null && days > 0
                ? `Effective in ${days}d`
                : `Effective ${formatDate(reg.effective_date)}`
              : "No effective date";

            return (
              <div
                key={reg.id}
                className={`flex items-start justify-between gap-3 rounded-md border p-3 ${dateTagClass(days)}`}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium leading-tight line-clamp-1">
                    {reg.title}
                  </p>
                  <div className="mt-1 flex items-center gap-2 text-xs opacity-70">
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                      {reg.agency}
                    </Badge>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Published {formatDate(reg.publication_date)}
                    </span>
                  </div>
                </div>
                <span className="shrink-0 rounded-full border px-2 py-0.5 text-xs font-semibold whitespace-nowrap">
                  {dateLabel}
                </span>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
