"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { ClipboardList, Download, Inbox, Radar, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const USE_CASES: { icon: React.ComponentType<{ className?: string }>; title: string }[] = [
  { icon: Radar, title: "Partner signal monitoring" },
  { icon: Inbox, title: "Inbound partner triage" },
  { icon: ClipboardList, title: "Follow-ups & status reporting" },
];

const FIRST_30_DAYS: { weeks: string; plan: string }[] = [
  { weeks: "Weeks 1–2", plan: "Profile 3–5 P1 partners with the partnerships team." },
  { weeks: "Weeks 2–3", plan: "Claude flags what changed and why it matters, with sources." },
  { weeks: "Weeks 3–4", plan: "Weekly brief in Slack with approve/dismiss, plus a runbook." },
];

const EXPERIENCE: { org: string; role: string }[] = [
  { org: "Retell AI", role: "first product intern (product UX & ops)" },
  { org: "Hatch", role: "project engineer for iron, steel & aluminum" },
  { org: "Zebra", role: "PM intern" },
  { org: "Duracell", role: "product strategy consultant" },
  { org: "t7-x", role: "co-founder (AI for automotive supply chain)" },
];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-wider text-primary dark:text-green-400">{children}</p>
  );
}

export default function IdcPlan({ onClose }: { onClose: () => void }) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const downloadRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    downloadRef.current?.focus({ preventScroll: true });
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab" || !dialogRef.current) return;
      const focusable = dialogRef.current.querySelectorAll<HTMLElement>("a[href], button");
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return createPortal(
    <div
      data-tour-ui=""
      className="pointer-events-auto fixed inset-0 z-[10002] flex items-start justify-center overflow-y-auto p-3 sm:items-center sm:p-4"
      style={{ backgroundColor: "rgba(12, 22, 8, 0.72)" }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="idc-plan-title"
        aria-describedby="idc-plan-sub"
        aria-live="polite"
        data-idc-plan=""
        className="animate-fade-in-up relative flex max-h-[90vh] w-full max-w-[1060px] flex-col overflow-hidden rounded-2xl border border-border bg-background text-foreground shadow-2xl"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 z-10 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="h-5 w-5" />
        </button>

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="shrink-0 px-6 pb-3 pt-5 sm:px-8">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary dark:text-green-400">
            <span className="h-px w-6 bg-current" aria-hidden="true" />
            For IDC
          </p>
          <h2 id="idc-plan-title" className="mt-2 max-w-2xl pr-8 text-xl font-bold leading-tight tracking-tight sm:text-2xl">
            How I&rsquo;d put this to work at IDC
          </h2>
          <p id="idc-plan-sub" className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
            The same pattern you just saw, pointed at partner work.
          </p>
        </div>

        {/* ── Body (scrolls only as a fallback on small viewports) ───────── */}
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 pb-4 pt-1 sm:px-8">
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            {USE_CASES.map(({ icon: Icon, title }) => (
              <div key={title} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3.5 shadow-sm">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-[15px] font-semibold leading-snug">{title}</h3>
              </div>
            ))}
          </div>

          <div className="rounded-xl border-2 border-green-400/70 bg-green-50 p-4 shadow-sm dark:bg-green-950/30">
            <SectionLabel>My first 30 days</SectionLabel>
            <ol className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-3">
              {FIRST_30_DAYS.map(({ weeks, plan }) => (
                <li key={weeks} className="rounded-lg border border-border bg-card px-3 py-2.5">
                  <p className="text-sm font-semibold text-primary dark:text-green-400">{weeks}</p>
                  <p className="mt-0.5 text-sm leading-snug">{plan}</p>
                </li>
              ))}
            </ol>
          </div>

          <div>
            <SectionLabel>What I&rsquo;ve done before</SectionLabel>
            <ul className="mt-2 flex flex-wrap gap-2">
              {EXPERIENCE.map(({ org, role }) => (
                <li key={org} className="rounded-full border border-border bg-muted/40 px-3 py-1 text-sm leading-snug">
                  <span className="font-semibold">{org}</span>
                  <span className="text-muted-foreground"> · {role}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        <div className="flex shrink-0 flex-col-reverse items-stretch justify-between gap-3 border-t border-border bg-muted/40 px-6 py-3 sm:flex-row sm:items-center sm:px-8">
          <p className="text-sm leading-snug text-muted-foreground">
            Built on Gemini today; the same pattern runs on Claude.
          </p>
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
            <Button asChild size="sm" className="h-9 gap-1.5">
              <a ref={downloadRef} href="/idc-30-day-plan.pdf" target="_blank" rel="noopener noreferrer">
                <Download className="h-4 w-4" />
                Download my 30-day plan (PDF)
              </a>
            </Button>
            <Button type="button" variant="outline" size="sm" className="h-9" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
