"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { fetchBusinesses, fetchRegulations, fetchAlerts } from "@/lib/api";
import type { Business, Regulation, Alert } from "@/lib/types";
import {
  Building2,
  BookOpen,
  AlertTriangle,
  Search,
  X,
  ArrowRight,
} from "lucide-react";

type SearchResult = {
  id: string;
  label: string;
  sublabel: string;
  href: string;
  type: "facility" | "regulation" | "alert";
};

const TYPE_CONFIG = {
  facility: { icon: Building2, color: "text-primary" },
  regulation: { icon: BookOpen, color: "text-terracotta" },
  alert: { icon: AlertTriangle, color: "text-status-warning" },
};

export default function CommandSearch() {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const [allData, setAllData] = useState<SearchResult[]>([]);

  useEffect(() => {
    async function loadAll() {
      try {
        const [bizRes, regRes, alerts] = await Promise.all([
          fetchBusinesses(),
          fetchRegulations(),
          fetchAlerts(),
        ]);
        const items: SearchResult[] = [
          ...bizRes.items.map((b: Business) => ({
            id: b.id,
            label: b.name,
            sublabel: `${b.county} County · ${b.permit_number}`,
            href: `/facilities/${b.id}`,
            type: "facility" as const,
          })),
          ...regRes.items.map((r: Regulation) => ({
            id: r.id,
            label: r.title,
            sublabel: `${r.agency} · ${r.document_type}`,
            href: "/regulations",
            type: "regulation" as const,
          })),
          ...alerts.map((a: Alert) => ({
            id: a.id,
            label: a.regulation_title,
            sublabel: `${a.severity} severity · ${a.affected_business_ids.length} affected`,
            href: "/alerts",
            type: "alert" as const,
          })),
        ];
        setAllData(items);
      } catch {
        // Non-critical: search just won't have data
      }
    }
    loadAll();
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setActiveIdx(0);
      return;
    }
    const q = query.toLowerCase();
    const filtered = allData.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.sublabel.toLowerCase().includes(q)
    );
    setResults(filtered.slice(0, 8));
    setActiveIdx(0);
  }, [query, allData]);

  const handleOpen = useCallback(() => {
    setOpen(true);
    setQuery("");
    setResults([]);
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  const handleClose = useCallback(() => {
    setOpen(false);
    setQuery("");
  }, []);

  const handleSelect = useCallback(
    (result: SearchResult) => {
      handleClose();
      router.push(result.href);
    },
    [router, handleClose]
  );

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (open) handleClose();
        else handleOpen();
      }
      if (!open) return;
      if (e.key === "Escape") {
        handleClose();
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIdx((i) => Math.min(i + 1, results.length - 1));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIdx((i) => Math.max(i - 1, 0));
      }
      if (e.key === "Enter" && results[activeIdx]) {
        handleSelect(results[activeIdx]);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, results, activeIdx, handleOpen, handleClose, handleSelect]);

  if (pathname === "/") return null;

  if (!open) {
    return (
      <button
        onClick={handleOpen}
        className="fixed right-6 top-5 z-30 flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm text-muted-foreground shadow-sm transition-colors hover:bg-muted/50"
      >
        <Search className="h-4 w-4" />
        <span className="hidden sm:inline">Search...</span>
        <kbd className="hidden rounded border bg-muted px-1.5 py-0.5 text-[10px] font-semibold sm:inline">
          ⌘K
        </kbd>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      <div className="fixed inset-0 bg-black/40" onClick={handleClose} />
      <div className="relative w-full max-w-lg rounded-xl border border-border bg-card shadow-2xl">
        {/* Search input */}
        <div className="flex items-center border-b px-4">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search facilities, regulations, alerts..."
            className="flex-1 bg-transparent px-3 py-3.5 text-sm outline-none placeholder:text-muted-foreground"
          />
          <button onClick={handleClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Results */}
        {results.length > 0 && (
          <ul className="max-h-[320px] overflow-auto py-2">
            {results.map((result, i) => {
              const cfg = TYPE_CONFIG[result.type];
              const Icon = cfg.icon;
              return (
                <li key={result.id}>
                  <button
                    onClick={() => handleSelect(result)}
                    onMouseEnter={() => setActiveIdx(i)}
                    className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                      i === activeIdx ? "bg-muted/60" : ""
                    }`}
                  >
                    <Icon className={`h-4 w-4 shrink-0 ${cfg.color}`} />
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {result.label}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {result.sublabel}
                      </p>
                    </div>
                    <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground/50" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {query && results.length === 0 && (
          <div className="py-8 text-center text-sm text-muted-foreground">
            No results found for &ldquo;{query}&rdquo;
          </div>
        )}

        {!query && (
          <div className="py-8 text-center text-sm text-muted-foreground">
            Start typing to search across all data...
          </div>
        )}
      </div>
    </div>
  );
}
