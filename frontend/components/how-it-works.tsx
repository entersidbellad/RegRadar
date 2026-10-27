"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  ArrowDown,
  ArrowRight,
  Bell,
  Building2,
  FileText,
  ListChecks,
  Search,
  ShieldCheck,
  Sparkles,
  Tractor,
  UserCheck,
  X,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ── The three steps inside the AI workflow ──────────────────────────────────
const AI_STEPS: { icon: React.ComponentType<{ className?: string }>; title: string; detail: string }[] = [
  {
    icon: Search,
    title: "Finds the passages that matter",
    detail: "Zeroes in on the parts of the rule that apply to a hog farm.",
  },
  {
    icon: ListChecks,
    title: "Pulls out each requirement",
    detail: "With its legal citation, deadline and penalty.",
  },
  {
    icon: Building2,
    title: "Compares against each farm",
    detail: "Rule by rule, against that farm's permit and herd size.",
  },
];

// ── A labelled stage card in the flow ───────────────────────────────────────
function Stage({
  label,
  icon: Icon,
  title,
  detail,
  tone = "dark",
  className,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  detail: string;
  tone?: "dark" | "human";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex h-full flex-col rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5",
        className
      )}
    >
      <p className="text-[11px] font-semibold uppercase tracking-wider text-primary dark:text-green-400">
        {label}
      </p>
      <div
        className={cn(
          "mt-3 flex h-11 w-11 items-center justify-center rounded-lg",
          tone === "human"
            ? "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400"
            : "bg-primary text-primary-foreground"
        )}
      >
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="mt-3 text-base font-semibold leading-snug sm:text-lg">{title}</h3>
      <p className="mt-1.5 text-sm leading-snug text-muted-foreground">{detail}</p>
    </div>
  );
}

// Horizontal on desktop, pointing down when the flow stacks on small screens.
function Connector() {
  return (
    <div className="flex items-center justify-center py-0.5 lg:py-0" aria-hidden="true">
      <ArrowRight className="hidden h-6 w-6 text-green-500 dark:text-green-400 lg:block" />
      <ArrowDown className="h-5 w-5 text-green-500 dark:text-green-400 lg:hidden" />
    </div>
  );
}

interface HowItWorksProps {
  /** "tour": shown before the guided tour; "standalone": opened from the top bar. */
  mode: "tour" | "standalone";
  onStart: () => void;
  onClose: () => void;
}

export default function HowItWorks({ mode, onStart, onClose }: HowItWorksProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const startRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    startRef.current?.focus({ preventScroll: true });
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab" || !dialogRef.current) return;
      const focusable = dialogRef.current.querySelectorAll<HTMLElement>("button");
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
        aria-labelledby="how-it-works-title"
        aria-describedby="how-it-works-sub"
        // Live regions are exempt from the aria-hidden the analysis panel applies to the rest of the page.
        aria-live="polite"
        data-tour-overview=""
        className="animate-fade-in-up relative w-full max-w-[1080px] overflow-hidden rounded-2xl border border-border bg-background text-foreground shadow-2xl"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close overview"
          className="absolute right-4 top-4 z-10 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="h-5 w-5" />
        </button>

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="px-6 pt-6 sm:px-9 sm:pt-8">
          <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-primary dark:text-green-400">
            <span className="h-px w-6 bg-current" aria-hidden="true" />
            How RegRadar works
          </p>
          <h2
            id="how-it-works-title"
            className="mt-3 max-w-2xl text-2xl font-bold leading-tight tracking-tight sm:text-3xl"
          >
            An AI workflow that reads every rule, so people don&rsquo;t have to.
          </h2>
          <p id="how-it-works-sub" className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            From a new federal rule to a plain-English to-do list for each farm.
          </p>
        </div>

        {/* ── Diagram ────────────────────────────────────────────────────── */}
        <div className="px-6 py-6 sm:px-9 sm:py-7">
          <div className="grid grid-cols-1 items-stretch gap-3 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1.55fr)_auto_minmax(0,1.05fr)] lg:gap-2">
            {/* Source */}
            <div className="flex h-full flex-col rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-primary dark:text-green-400">
                Source
              </p>
              <div className="mt-3 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold leading-snug">Federal rules</p>
                    <p className="text-xs leading-snug text-muted-foreground">From the Federal Register</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <Tractor className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold leading-snug">Farm permit profiles</p>
                    <p className="text-xs leading-snug text-muted-foreground">15 NC hog farms</p>
                  </div>
                </div>
              </div>
            </div>

            <Connector />

            {/* AI workflow — the heart of the diagram */}
            <div className="flex h-full flex-col rounded-xl border-2 border-green-400/70 bg-green-50 p-4 shadow-sm dark:bg-green-950/30 sm:p-5">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary-foreground">
                  <Sparkles className="h-3.5 w-3.5" />
                  AI workflow
                </span>
              </div>
              <ol className="mt-3 flex flex-1 flex-col gap-2">
                {AI_STEPS.map((step, i) => (
                  <li key={step.title}>
                    <div className="flex items-start gap-3 rounded-lg border border-border bg-card px-3 py-2.5">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                        {i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold leading-snug">{step.title}</p>
                        <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{step.detail}</p>
                      </div>
                      <step.icon className="mt-0.5 h-4 w-4 shrink-0 text-primary dark:text-green-400" />
                    </div>
                    {i < AI_STEPS.length - 1 && (
                      <div className="flex justify-center py-0.5" aria-hidden="true">
                        <ArrowDown className="h-4 w-4 text-green-500 dark:text-green-400" />
                      </div>
                    )}
                  </li>
                ))}
              </ol>
            </div>

            <Connector />

            {/* Output + person, stacked */}
            <div className="flex flex-col gap-3">
              <Stage
                label="Output"
                icon={Bell}
                title="A per-farm alert"
                detail="Gaps, actions and deadlines, in plain English."
                className="flex-1"
              />
              <div className="flex justify-center" aria-hidden="true">
                <ArrowDown className="h-5 w-5 text-green-500 dark:text-green-400" />
              </div>
              <Stage
                label="Person in the loop"
                icon={UserCheck}
                title="A person reviews and acts"
                detail="Checks the alert and decides what to do next."
                tone="human"
                className="flex-1"
              />
            </div>
          </div>

          {/* ── What makes it an automation + trust ──────────────────────── */}
          <div className="mt-5 rounded-xl border border-green-400/50 bg-green-50/60 p-4 dark:bg-green-950/20 sm:p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Zap className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold leading-snug">What makes it an automation</p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  A rule changes, and RegRadar checks it against every farm on its own. The core rule alone
                  runs about 70,000 words &mdash; close to 300 pages &mdash; and nobody reads it by hand.
                </p>
              </div>
            </div>
            <div className="mt-3 flex flex-col gap-2 border-t border-green-400/30 pt-3 text-sm font-medium sm:flex-row sm:items-center sm:gap-6">
              <span className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 shrink-0 text-primary dark:text-green-400" />
                Every finding cites the rule it came from
              </span>
              <span className="flex items-center gap-2">
                <UserCheck className="h-4 w-4 shrink-0 text-primary dark:text-green-400" />
                A person makes the final call
              </span>
            </div>
          </div>
        </div>

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        <div className="flex flex-col-reverse items-stretch justify-between gap-3 border-t border-border bg-muted/40 px-6 py-4 sm:flex-row sm:items-center sm:px-9">
          <p className="text-xs leading-snug text-muted-foreground">
            This online demo shows saved results.
          </p>
          <div className="flex shrink-0 items-center justify-end gap-2">
            <Button type="button" variant="outline" size="sm" className="h-9" onClick={onClose}>
              {mode === "tour" ? "Skip" : "Close"}
            </Button>
            <Button ref={startRef} type="button" size="sm" className="h-9 gap-1.5" onClick={onStart}>
              Start the tour
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
