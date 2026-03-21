"use client";

import type { Regulation } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface RegFeedProps {
  regulations: Regulation[];
  selectedId: string | null;
  onSelect: (reg: Regulation) => void;
  loading?: boolean;
}

function AgencyBadge({ agency }: { agency: string }) {
  if (agency === "EPA") {
    return (
      <Badge className="bg-blue-600 text-white hover:bg-blue-700">EPA</Badge>
    );
  }
  if (agency === "NC_DEQ") {
    return (
      <Badge className="bg-green-600 text-white hover:bg-green-700">
        NC DEQ
      </Badge>
    );
  }
  return <Badge variant="secondary">{agency}</Badge>;
}

function DocTypeBadge({ type }: { type: string }) {
  const label = type === "PROPOSED_RULE" ? "Proposed" : type === "RULE" ? "Final Rule" : type;
  return (
    <Badge variant="outline" className="text-xs">
      {label}
    </Badge>
  );
}

export default function RegFeed({
  regulations,
  selectedId,
  onSelect,
  loading,
}: RegFeedProps) {
  if (loading) {
    return (
      <div className="space-y-3 p-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-16 w-full" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-3 p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Regulation Feed
        </h2>
        {regulations.map((reg) => (
          <Card
            key={reg.id}
            className={cn(
              "cursor-pointer transition-colors hover:border-primary/50",
              selectedId === reg.id && "border-primary bg-primary/5"
            )}
            onClick={() => onSelect(reg)}
          >
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center gap-2 mb-1">
                <AgencyBadge agency={reg.agency} />
                <DocTypeBadge type={reg.document_type} />
              </div>
              <CardTitle className="text-sm font-medium leading-tight line-clamp-2">
                {reg.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0">
              <p className="text-xs text-muted-foreground line-clamp-2">
                {reg.abstract}
              </p>
              <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                <span>
                  Published:{" "}
                  {new Date(reg.publication_date).toLocaleDateString()}
                </span>
                {reg.effective_date && (
                  <span>
                    Effective:{" "}
                    {new Date(reg.effective_date).toLocaleDateString()}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </ScrollArea>
  );
}
