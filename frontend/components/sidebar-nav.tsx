"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  BookOpen,
  Bell,
  FileBarChart,
  Leaf,
  Menu,
  X,
  Moon,
  Sun,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchAlerts, DEMO_MODE } from "@/lib/api";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/facilities", label: "Facilities", icon: Building2 },
  { href: "/regulations", label: "Regulations", icon: BookOpen },
  { href: "/alerts", label: "Alerts", icon: Bell, hasBadge: true },
  { href: "/reports", label: "Reports", icon: FileBarChart },
];

export default function SidebarNav() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [alertCount, setAlertCount] = useState(0);
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("theme");
    const prefersDark = stored === "dark" || (!stored && window.matchMedia("(prefers-color-scheme: dark)").matches);
    setDark(prefersDark);
    document.documentElement.classList.toggle("dark", prefersDark);
  }, []);

  function toggleDark() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  }

  useEffect(() => {
    fetchAlerts()
      .then((a) => setAlertCount(a.filter((x) => x.severity === "high").length))
      .catch(() => {});
  }, []);

  if (pathname === "/") return null;

  const sidebarContent = (
    <>
      <div className="flex h-14 items-center justify-between border-b border-white/10 px-5">
        <Link href="/" className="flex items-center gap-2.5">
          <Leaf className="h-6 w-6 text-green-400" />
          <span className="text-lg font-bold tracking-tight text-white">
            RegRadar
          </span>
        </Link>
        <button
          onClick={() => setMobileOpen(false)}
          className="text-sidebar-foreground hover:text-white md:hidden"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {NAV_ITEMS.map(({ href, label, icon: Icon, hasBadge }) => {
          const isActive = pathname.startsWith(href);

          return (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-active text-white border-l-2 border-green-400"
                  : "text-sidebar-foreground hover:bg-white/[0.08] hover:text-white"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="flex-1">{label}</span>
              {hasBadge && alertCount > 0 && (
                <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                  {alertCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 px-4 py-3 space-y-3">
        <button
          onClick={toggleDark}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground hover:bg-white/[0.08] hover:text-white transition-colors"
        >
          {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          <span>{dark ? "Light Mode" : "Dark Mode"}</span>
        </button>
        <div className="px-3">
          <p className="text-xs text-sidebar-foreground/70">
            NC CAFO Compliance Monitor
          </p>
          <p className="mt-0.5 text-xs text-sidebar-foreground/50">
            Eastern North Carolina
          </p>
          {DEMO_MODE && (
            <p
              className="mt-2 inline-flex rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-green-300"
              title="Static seed data; no backend or live Gemini calls"
            >
              Demo mode &middot; seed data
            </p>
          )}
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        aria-label="Open navigation"
        className="fixed left-3 top-2.5 z-50 rounded-md bg-sidebar p-2 text-sidebar-foreground shadow-lg md:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-60 flex-col bg-sidebar text-sidebar-foreground transition-transform duration-200 md:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {sidebarContent}
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-60 flex-col bg-sidebar text-sidebar-foreground shrink-0">
        {sidebarContent}
      </aside>
    </>
  );
}
