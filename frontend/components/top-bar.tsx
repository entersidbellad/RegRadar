"use client";

import { usePathname } from "next/navigation";
import { Compass, Workflow } from "lucide-react";
import { Button } from "@/components/ui/button";
import CommandSearch from "@/components/command-search";
import { useTour } from "@/components/tour";

export default function TopBar() {
  const pathname = usePathname();
  const { start, showOverview } = useTour();

  if (pathname === "/") return null;

  return (
    <header className="no-print flex h-14 shrink-0 items-center justify-end gap-2 border-b border-border/60 bg-background pl-16 pr-4 md:px-6">
      <Button
        variant="outline"
        size="sm"
        className="h-9 gap-1.5"
        onClick={showOverview}
        aria-label="How it works"
      >
        <Workflow className="h-4 w-4 text-primary" />
        <span className="hidden sm:inline">How it works</span>
      </Button>
      <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={start}>
        <Compass className="h-4 w-4 text-primary" />
        Take the tour
      </Button>
      <CommandSearch />
    </header>
  );
}
