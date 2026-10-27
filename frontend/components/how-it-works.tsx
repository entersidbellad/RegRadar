"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  ArrowRight,
  BadgeCheck,
  Bell,
  BookOpen,
  Brain,
  ClipboardCheck,
  Database,
  Gauge,
  ListChecks,
  Newspaper,
  Scissors,
  Search,
  Tractor,
  CalendarClock,
  Users,
  X,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type TagKind = "local" | "curated" | "next" | "partial";

const TAGS: Record<TagKind, { label: string; className: string }> = {
  local: {
    label: "Full local version",
    className:
      "border-amber-300 bg-amber-100 text-amber-900 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200",
  },
  curated: {
    label: "Curated examples",
    className:
      "border-stone-300 bg-stone-100 text-stone-700 dark:border-stone-700 dark:bg-stone-900/60 dark:text-stone-300",
  },
  partial: {
    label: "Partly built",
    className:
      "border-sky-300 bg-sky-100 text-sky-900 dark:border-sky-800 dark:bg-sky-950/50 dark:text-sky-200",
  },
  next: {
    label: "Next step",
    className:
      "border-stone-300 bg-white text-stone-600 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300",
  },
};

interface Item {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
  tag?: TagKind;
}

interface Column {
  heading: string;
  sub: string;
  tag?: TagKind;
  items: Item[];
}

const COLUMNS: Column[] = [
  {
    heading: "Where the information comes from",
    sub: "Three inputs",
    items: [
      {
        icon: BookOpen,
        title: "Federal rules",
        body: "9 EPA rules that affect hog farms, from the Federal Register, the official record of U.S. rules.",
      },
      {
        icon: Tractor,
        title: "Farm profiles",
        body: "15 North Carolina hog farms from state permit records: herd size, county, permit type.",
      },
      {
        icon: Newspaper,
        title: "News and alerts",
        body: "Rule changes and court rulings, each rated high, medium or low.",
        tag: "curated",
      },
    ],
  },
  {
    heading: "How it's processed",
    sub: "The AI does the reading",
    tag: "local",
    items: [
      {
        icon: Scissors,
        title: "Rules split into searchable pieces",
        body: "Each rule is cut into short passages, indexed so it can be searched by meaning.",
      },
      {
        icon: Brain,
        title: "AI pass 1: what does the rule require?",
        body: "It reads the whole rule and lists each requirement, with its citation, deadline and penalty.",
      },
      {
        icon: Search,
        title: "AI pass 2: where does this farm fall short?",
        body: "It checks those requirements against one farm's details and flags what's missing.",
      },
      {
        icon: Database,
        title: "Saved for reuse",
        body: "Each result is stored, so a farm and rule are never analyzed twice.",
      },
    ],
  },
  {
    heading: "What comes out",
    sub: "For each farm and rule",
    items: [
      { icon: Gauge, title: "Risk level", body: "Compliant, needs review or non-compliant, with the AI's confidence." },
      { icon: ClipboardCheck, title: "Gaps", body: "Specific things to check at this farm." },
      { icon: ListChecks, title: "Actions", body: "A checklist the farm can work through." },
      { icon: CalendarClock, title: "Deadlines", body: "Due dates and penalties, in plain English." },
    ],
  },
  {
    heading: "Who gets alerted",
    sub: "The people who act on it",
    items: [
      {
        icon: Bell,
        title: "Alerts name the affected farms",
        body: "Ranked by severity, with a link to each farm, on the dashboard and alerts page.",
      },
      {
        icon: Users,
        title: "Farm operators and their consultants",
        body: "They see what changed, which farms it hits, and what to do next.",
      },
      {
        icon: Zap,
        title: "Email and text alerts",
        body: "Push notifications aren't built yet. Today everything shows in the app.",
        tag: "next",
      },
    ],
  },
];

const AUTOMATION_POINTS: Item[] = [
  {
    icon: Newspaper,
    title: "Watches for new rules",
    body: "Rules come straight from the Federal Register's public feed. Today the fetch runs on demand; putting it on a schedule is next.",
    tag: "next",
  },
  {
    icon: Users,
    title: "Matches rules to affected farms",
    body: "Each alert names the farms it applies to. Here those matches are curated; the AI prompt that does the matching is written but not yet switched on.",
    tag: "partial",
  },
  {
    icon: BadgeCheck,
    title: "Drafts the compliance check",
    body: "The AI reads the whole rule (the core one is over 70,000 words, close to 300 book pages) and drafts each farm's check. Nobody reads it by hand.",
    tag: "local",
  },
];

function Tag({ kind }: { kind: TagKind }) {
  const tag = TAGS[kind];
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full border px-1.5 py-px text-[10px] font-semibold leading-4",
        tag.className
      )}
    >
      {tag.label}
    </span>
  );
}

function FlowArrow() {
  return (
    <div className="flex items-center justify-center py-1 lg:px-0.5 lg:py-0" aria-hidden="true">
      <svg
        viewBox="0 0 28 16"
        className="h-4 w-7 rotate-90 text-primary/70 dark:text-green-400/80 lg:rotate-0"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M2 8h22" />
        <path d="M18 2l6 6-6 6" />
      </svg>
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
        className="relative w-full max-w-[1180px] overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-2xl"
      >
        <div className="h-1 bg-primary" />

        <div className="flex items-start justify-between gap-4 px-6 pb-3 pt-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-primary dark:text-green-400">
              How RegRadar works
            </p>
            <h2 id="how-it-works-title" className="mt-1 text-xl font-semibold leading-snug sm:text-2xl">
              From a new rule to a farm&rsquo;s to-do list
            </h2>
            <p id="how-it-works-sub" className="mt-1 text-sm text-muted-foreground">
              Information comes in on the left, the AI does the reading in the middle, and each farm gets a
              clear answer on the right.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close overview"
            className="rounded p-1 text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6">
          <ol className="grid grid-cols-1 gap-1 lg:grid-cols-[1fr_auto_1.3fr_auto_0.95fr_auto_1fr] lg:gap-0">
            {COLUMNS.map((col, i) => (
              <li key={col.heading} className="contents">
                <section
                  aria-labelledby={`hiw-col-${i}`}
                  className="flex flex-col rounded-lg border border-border/70 bg-muted/40 p-3"
                >
                  <header className="mb-2 flex items-center gap-2">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <h3 id={`hiw-col-${i}`} className="text-sm font-semibold leading-tight">
                        {col.heading}
                      </h3>
                      <p className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                        {col.sub}
                        {col.tag && <Tag kind={col.tag} />}
                      </p>
                    </div>
                  </header>
                  <ul className="flex flex-1 flex-col gap-1.5">
                    {col.items.map((item) => (
                      <li key={item.title} className="rounded-md border border-border/60 bg-card px-2.5 py-1.5">
                        <div className="flex items-start gap-2">
                          <item.icon className="mt-0.5 h-4 w-4 shrink-0 text-primary dark:text-green-400" />
                          <div className="min-w-0">
                            <p className="text-[13px] font-semibold leading-snug">{item.title}</p>
                            <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{item.body}</p>
                            {item.tag && (
                              <div className="mt-1">
                                <Tag kind={item.tag} />
                              </div>
                            )}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
                {i < COLUMNS.length - 1 && <FlowArrow />}
              </li>
            ))}
          </ol>

          <section
            aria-labelledby="hiw-automation"
            className="mt-3 rounded-lg border-2 border-green-400/70 bg-green-50 p-3 dark:bg-green-950/30"
          >
            <h3 id="hiw-automation" className="flex items-center gap-2 text-sm font-semibold">
              <Zap className="h-4 w-4 text-primary dark:text-green-400" />
              What makes this an automation
            </h3>
            <ul className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-3">
              {AUTOMATION_POINTS.map((point) => (
                <li key={point.title} className="flex items-start gap-2">
                  <point.icon className="mt-0.5 h-4 w-4 shrink-0 text-primary dark:text-green-400" />
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-1.5 text-[13px] font-semibold leading-snug">
                      {point.title}
                      {point.tag && <Tag kind={point.tag} />}
                    </p>
                    <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{point.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <div className="mt-3 flex flex-col-reverse items-stretch justify-between gap-3 border-t border-border/60 bg-muted/30 px-6 py-3 sm:flex-row sm:items-center">
          <p className="text-[11px] leading-snug text-muted-foreground">
            <Tag kind="local" /> runs when RegRadar is installed with its server and AI key. This online demo
            shows a saved result from that version.
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
