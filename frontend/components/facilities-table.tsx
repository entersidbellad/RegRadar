"use client";

import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowUpDown, Search } from "lucide-react";
import Link from "next/link";
import type { Business } from "@/lib/types";
import { STATUS_LABELS, STATUS_ORDER } from "@/lib/status";

const STATUS_CLASSES: Record<string, string> = {
  compliant: "bg-green-100 dark:bg-green-950/40 text-green-800 dark:text-green-300 border-green-200 dark:border-green-900",
  warning: "bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-900",
  non_compliant: "bg-red-100 dark:bg-red-950/40 text-red-800 dark:text-red-300 border-red-200 dark:border-red-900",
  unknown: "bg-gray-100 dark:bg-gray-900/40 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-800",
};

type SortKey = "name" | "county" | "head_count" | "permit_type" | "latest_status";
type SortDir = "asc" | "desc";

interface FacilitiesTableProps {
  businesses: Business[];
  onRowClick: (business: Business) => void;
}

export default function FacilitiesTable({ businesses, onRowClick }: FacilitiesTableProps) {
  const [search, setSearch] = useState("");
  const [countyFilter, setCountyFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const counties = useMemo(
    () => Array.from(new Set(businesses.map((b) => b.county))).sort(),
    [businesses]
  );

  const filtered = useMemo(() => {
    let result = businesses;

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (b) =>
          b.name.toLowerCase().includes(q) ||
          b.permit_number.toLowerCase().includes(q)
      );
    }

    if (countyFilter !== "all") {
      result = result.filter((b) => b.county === countyFilter);
    }

    if (statusFilter !== "all") {
      result = result.filter((b) => b.latest_status === statusFilter);
    }

    result = [...result].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "head_count") {
        cmp = a.head_count - b.head_count;
      } else {
        cmp = String(a[sortKey]).localeCompare(String(b[sortKey]));
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return result;
  }, [businesses, search, countyFilter, statusFilter, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const columns: { key: SortKey; label: string; className?: string }[] = [
    { key: "name", label: "Facility Name", className: "w-[30%]" },
    { key: "county", label: "County" },
    { key: "head_count", label: "Head Count" },
    { key: "permit_type", label: "Permit" },
    { key: "latest_status", label: "Status" },
  ];

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name or permit..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={countyFilter} onValueChange={setCountyFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="County" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Counties</SelectItem>
            {counties.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {STATUS_ORDER.map((s) => (
              <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground">
          {filtered.length} of {businesses.length} facilities
        </span>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-border/60 bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground ${col.className || ""}`}
                >
                  <button
                    onClick={() => toggleSort(col.key)}
                    className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                  >
                    {col.label}
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  No facilities match your filters
                </td>
              </tr>
            ) : (
              filtered.map((biz) => (
                <tr
                  key={biz.id}
                  onClick={() => onRowClick(biz)}
                  className="cursor-pointer border-b border-border/40 transition-colors hover:bg-muted/30 last:border-b-0"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/facilities/${biz.id}`}
                      className="font-medium text-foreground hover:text-primary hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {biz.name}
                    </Link>
                    <p className="text-xs text-muted-foreground">{biz.permit_number}</p>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{biz.county}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {biz.head_count.toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <span className="capitalize text-muted-foreground">{biz.permit_type}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                        STATUS_CLASSES[biz.latest_status]
                      }`}
                    >
                      {STATUS_LABELS[biz.latest_status]}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
