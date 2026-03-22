"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, ArrowRight } from "lucide-react";
import type { Alert as AlertType } from "@/lib/types";

const SEVERITY_VARIANT: Record<string, "destructive" | "secondary" | "outline"> = {
  high: "destructive",
  medium: "secondary",
  low: "outline",
};

interface RecentAlertsProps {
  alerts: AlertType[];
}

export default function RecentAlerts({ alerts }: RecentAlertsProps) {
  const recent = alerts
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 5);

  return (
    <Card className="border-border/60">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Bell className="h-4 w-4" />
          Recent Alerts
        </CardTitle>
        <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
          <Link href="/alerts">
            View all <ArrowRight className="ml-1 h-3 w-3" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {recent.length === 0 ? (
          <p className="py-4 text-center text-xs text-muted-foreground">
            No recent alerts
          </p>
        ) : (
          recent.map((alert) => (
            <div
              key={alert.id}
              className="flex items-start justify-between gap-3 rounded-md border border-border/50 bg-muted/30 p-3"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium leading-tight line-clamp-1">
                  {alert.regulation_title}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {alert.affected_business_ids.length}{" "}
                  {alert.affected_business_ids.length === 1 ? "facility" : "facilities"}{" "}
                  affected
                </p>
              </div>
              <Badge variant={SEVERITY_VARIANT[alert.severity]} className="shrink-0 text-xs">
                {alert.severity}
              </Badge>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
