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
    title: "Finds the relevant passages",
    detail: "The parts of the rule that apply.",
  },
  {
    icon: ListChecks,
    title: "Pulls out each requirement",
    detail: "With citation, deadline and penalty.",
  },
  {
    icon: Building2,
    title: "Compares against each farm",
    detail: "Against its permit and herd size.",
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
        "flex h-full flex-col justify-center rounded-xl border border-border bg-card p-4 shadow-sm",
        className
      )}
    >
      <p className="text-xs font-semibold uppercase tracking-wider text-primary dark:text-green-400">
        {label}
      </p>
      <div className="mt-2 flex items-center gap-3">
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
            tone === "human"
              ? "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400"
              : "bg-primary text-primary-foreground"
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        <h3 className="text-base font-semibold leading-snug">{title}</h3>
      </div>
      <p className="mt-2 text-sm leading-snug text-muted-foreground">{detail}</p>
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
        // flex-col + max-h keeps the header/footer pinned and lets only the middle scroll as a
        // fallback on very short viewports, so the top (eyebrow, close, headline) is never clipped.
        className="animate-fade-in-up relative flex max-h-[90vh] w-full max-w-[1060px] flex-col overflow-hidden rounded-2xl border border-border bg-background text-foreground shadow-2xl"
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
        <div className="shrink-0 px-6 pb-3 pt-5 sm:px-8">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary dark:text-green-400">
            <span className="h-px w-6 bg-current" aria-hidden="true" />
            How RegRadar works
          </p>
          <h2
            id="how-it-works-title"
            className="mt-2 max-w-2xl pr-8 text-xl font-bold leading-tight tracking-tight sm:text-2xl"
          >
            An AI workflow that reads every rule, so people don&rsquo;t have to.
          </h2>
          <p id="how-it-works-sub" className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
            From a new federal rule to a plain-English to-do list for each farm.
          </p>
        </div>

        {/* ── Diagram (scrolls only as a fallback on tiny viewports) ─────── */}
        <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-4 pt-1 sm:px-8">
          <div className="grid grid-cols-1 items-stretch gap-2.5 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1.5fr)_auto_minmax(0,1fr)] lg:gap-2">
            {/* Source */}
            <div className="flex h-full flex-col rounded-xl border border-border bg-card p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-primary dark:text-green-400">
                Source
              </p>
              <div className="mt-2 flex flex-1 flex-col gap-2.5">
                <div className="flex flex-1 items-center gap-3 rounded-lg border border-border/70 bg-muted/40 px-3 py-2.5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[15px] font-semibold leading-snug">Federal rules</p>
                    <p className="text-sm leading-snug text-muted-foreground">From the Federal Register</p>
                  </div>
                </div>
                <div className="flex flex-1 items-center gap-3 rounded-lg border border-border/70 bg-muted/40 px-3 py-2.5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <Tractor className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[15px] font-semibold leading-snug">Farm profiles</p>
                    <p className="text-sm leading-snug text-muted-foreground">15 NC hog farms</p>
                  </div>
                </div>
              </div>
            </div>

            <Connector />

            {/* AI workflow — the heart of the diagram */}
            <div className="flex h-full flex-col rounded-xl border-2 border-green-400/70 bg-green-50 p-4 shadow-sm dark:bg-green-950/30">
              <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-primary px-2.5 py-1 text-xs font-semibold uppercase tracking-wider text-primary-foreground">
                <Sparkles className="h-3.5 w-3.5" />
                AI workflow
              </span>
              <ol className="mt-2.5 flex flex-1 flex-col justify-between gap-1.5">
                {AI_STEPS.map((step, i) => (
                  <li key={step.title}>
                    <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                        {i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[15px] font-semibold leading-snug">{step.title}</p>
                        <p className="text-sm leading-snug text-muted-foreground">{step.detail}</p>
                      </div>
                      <step.icon className="h-5 w-5 shrink-0 text-primary dark:text-green-400" />
                    </div>
                    {i < AI_STEPS.length - 1 && (
                      <div className="flex justify-center py-px" aria-hidden="true">
                        <ArrowDown className="h-4 w-4 text-green-500 dark:text-green-400" />
                      </div>
                    )}
                  </li>
                ))}
              </ol>
            </div>

            <Connector />

            {/* Output + person, stacked */}
            <div className="flex flex-col gap-2.5">
              <Stage
                label="Output"
                icon={Bell}
                title="A per-farm alert"
                detail="Gaps, actions and deadlines."
                className="flex-1"
              />
              <div className="flex justify-center" aria-hidden="true">
                <ArrowDown className="h-5 w-5 text-green-500 dark:text-green-400" />
              </div>
              <Stage
                label="Person"
                icon={UserCheck}
                title="A person reviews and acts"
                detail="Decides what to do next."
                tone="human"
                className="flex-1"
              />
            </div>
          </div>

          {/* ── What makes it an automation + trust ──────────────────────── */}
          <div className="mt-3 rounded-xl border border-green-400/50 bg-green-50/60 px-4 py-3 dark:bg-green-950/20">
            <p className="flex items-start gap-2.5 text-[15px] font-semibold leading-snug sm:items-center">
              <Zap className="mt-0.5 h-5 w-5 shrink-0 text-primary dark:text-green-400 sm:mt-0" />
              A new rule comes in and every farm gets checked automatically &mdash; nobody reads the ~300
              pages by hand.
            </p>
            <div className="mt-2.5 flex flex-col gap-2 border-t border-green-400/30 pt-2.5 text-sm font-medium sm:flex-row sm:items-center sm:gap-6">
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
        <div className="flex shrink-0 flex-col-reverse items-stretch justify-between gap-3 border-t border-border bg-muted/40 px-6 py-3 sm:flex-row sm:items-center sm:px-8">
          <p className="text-sm leading-snug text-muted-foreground">
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
