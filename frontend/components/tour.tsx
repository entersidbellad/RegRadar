"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TOUR_STEPS } from "@/lib/tour-steps";

const STORAGE_KEY = "regradar-tour";
const AUTO_START_PATH = "/dashboard";
const WAIT_TIMEOUT_MS = 8000;
const POLL_MS = 80;
const SETTLE_MS = 350;
const SPOTLIGHT_PAD = 8;
const CARD_GAP = 14;
const VIEWPORT_MARGIN = 12;
const CARD_WIDTH = 360;
const NARROW_BREAKPOINT = 768;
// Room the card needs beside a target; taller targets are scrolled to the top instead of centered.
const CARD_ROOM = 260;

interface TourContextValue {
  start: () => void;
  active: boolean;
}

const TourContext = createContext<TourContextValue>({ start: () => {}, active: false });

export function useTour() {
  return useContext(TourContext);
}

interface Box {
  top: number;
  left: number;
  width: number;
  height: number;
}

function hasFinishedTour(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "done";
  } catch {
    // Storage unavailable (e.g. blocked cookies): don't auto-start on every page load.
    return true;
  }
}

function rememberFinished() {
  try {
    localStorage.setItem(STORAGE_KEY, "done");
  } catch {
    // Nothing to persist to; the tour simply auto-starts again next visit.
  }
}

function matchesRoute(route: string): boolean {
  const target = new URL(route, window.location.origin);
  if (target.pathname !== window.location.pathname) return false;
  const current = new URLSearchParams(window.location.search);
  return Array.from(target.searchParams).every(([key, value]) => current.get(key) === value);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function findVisible(selector: string): HTMLElement | null {
  const el = document.querySelector<HTMLElement>(selector);
  return el && el.getClientRects().length > 0 ? el : null;
}

async function waitFor(selector: string, cancelled: () => boolean): Promise<HTMLElement | null> {
  const deadline = Date.now() + WAIT_TIMEOUT_MS;
  while (!cancelled()) {
    const el = findVisible(selector);
    if (el) return el;
    if (Date.now() > deadline) return null;
    await sleep(POLL_MS);
  }
  return null;
}

function closeOpenPanel() {
  document.querySelector<HTMLElement>('[role="dialog"] [data-sheet-close]')?.click();
}

function scrollTargetIntoView(el: HTMLElement) {
  const narrow = window.innerWidth < NARROW_BREAKPOINT;
  const fitsWithCard = el.getBoundingClientRect().height + 2 * CARD_ROOM <= window.innerHeight;
  el.scrollIntoView({ block: !narrow && fitsWithCard ? "center" : "start", behavior: "smooth" });
}

function visibleBox(el: HTMLElement, vw: number, vh: number): Box | null {
  const r = el.getBoundingClientRect();
  const top = Math.max(r.top - SPOTLIGHT_PAD, 0);
  const left = Math.max(r.left - SPOTLIGHT_PAD, 0);
  const bottom = Math.min(r.bottom + SPOTLIGHT_PAD, vh);
  const right = Math.min(r.right + SPOTLIGHT_PAD, vw);
  if (bottom - top < 4 || right - left < 4) return null;
  return {
    top: Math.round(top),
    left: Math.round(left),
    width: Math.round(right - left),
    height: Math.round(bottom - top),
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

function placeCard(spot: Box | null, w: number, h: number, vw: number, vh: number) {
  if (!spot) return { top: (vh - h) / 2, left: (vw - w) / 2 };

  const bottom = spot.top + spot.height;
  const right = spot.left + spot.width;
  const centerX = spot.left + spot.width / 2 - w / 2;
  const centerY = spot.top + spot.height / 2 - h / 2;
  const candidates = [
    { top: bottom + CARD_GAP, left: centerX, fits: bottom + CARD_GAP + h <= vh - VIEWPORT_MARGIN },
    { top: spot.top - CARD_GAP - h, left: centerX, fits: spot.top - CARD_GAP - h >= VIEWPORT_MARGIN },
    { top: centerY, left: spot.left - CARD_GAP - w, fits: spot.left - CARD_GAP - w >= VIEWPORT_MARGIN },
    { top: centerY, left: right + CARD_GAP, fits: right + CARD_GAP + w <= vw - VIEWPORT_MARGIN },
  ];
  const pick = candidates.find((c) => c.fits) ?? {
    top: vh - h - VIEWPORT_MARGIN,
    left: right - w - VIEWPORT_MARGIN,
  };
  return {
    top: clamp(pick.top, VIEWPORT_MARGIN, vh - h - VIEWPORT_MARGIN),
    left: clamp(pick.left, VIEWPORT_MARGIN, vw - w - VIEWPORT_MARGIN),
  };
}

export function TourProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [stepIndex, setStepIndex] = useState<number | null>(null);
  const [session, setSession] = useState(0);
  const [ready, setReady] = useState(false);
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const runRef = useRef(0);

  const start = useCallback(() => {
    setStepIndex(0);
    setSession((s) => s + 1);
  }, []);

  const end = useCallback(() => {
    rememberFinished();
    runRef.current += 1;
    setStepIndex(null);
    setTarget(null);
    setReady(false);
  }, []);

  const next = useCallback(() => {
    if (stepIndex === null) return;
    if (stepIndex >= TOUR_STEPS.length - 1) end();
    else setStepIndex(stepIndex + 1);
  }, [stepIndex, end]);

  const back = useCallback(() => {
    if (stepIndex !== null && stepIndex > 0) setStepIndex(stepIndex - 1);
  }, [stepIndex]);

  useEffect(() => {
    if (stepIndex === null && pathname === AUTO_START_PATH && !hasFinishedTour()) start();
  }, [pathname, stepIndex, start]);

  useEffect(() => {
    if (stepIndex === null) return;
    const step = TOUR_STEPS[stepIndex];
    const run = ++runRef.current;
    const cancelled = () => runRef.current !== run;
    setReady(false);
    setTarget(null);

    (async () => {
      if (!step.inPanel) closeOpenPanel();
      if (!matchesRoute(step.route)) router.push(step.route);

      for (const action of step.prepare ?? []) {
        if (findVisible(action.until)) continue;
        const trigger = await waitFor(action.click, cancelled);
        if (!trigger || cancelled()) break;
        trigger.click();
        if (!(await waitFor(action.until, cancelled))) break;
        await sleep(SETTLE_MS);
      }
      if (cancelled()) return;

      const el = step.target ? await waitFor(step.target, cancelled) : null;
      if (cancelled()) return;
      if (el) scrollTargetIntoView(el);
      setTarget(el);
      setReady(true);
    })();
  }, [stepIndex, session, router]);

  useEffect(() => {
    if (stepIndex === null) return;
    function onKeyDown(e: KeyboardEvent) {
      const el = e.target as HTMLElement | null;
      if (el?.closest("input, textarea, select, [contenteditable='true']")) return;
      if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") back();
      else if (e.key === "Escape") end();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [stepIndex, next, back, end]);

  return (
    <TourContext.Provider value={{ start, active: stepIndex !== null }}>
      {children}
      {stepIndex !== null && (
        <TourOverlay
          stepIndex={stepIndex}
          target={target}
          ready={ready}
          onNext={next}
          onBack={back}
          onSkip={end}
        />
      )}
    </TourContext.Provider>
  );
}

interface TourOverlayProps {
  stepIndex: number;
  target: HTMLElement | null;
  ready: boolean;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}

function TourOverlay({ stepIndex, target, ready, onNext, onBack, onSkip }: TourOverlayProps) {
  const step = TOUR_STEPS[stepIndex];
  const isLast = stepIndex === TOUR_STEPS.length - 1;
  const cardRef = useRef<HTMLDivElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const [viewport, setViewport] = useState({ w: 0, h: 0 });
  const [spot, setSpot] = useState<Box | null>(null);
  const [cardHeight, setCardHeight] = useState(220);

  useEffect(() => {
    const update = () => setViewport({ w: window.innerWidth, h: window.innerHeight });
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // Follow the target through smooth scrolling, panel animations and layout shifts.
  useEffect(() => {
    if (!target || !step.target) {
      setSpot(null);
      return;
    }
    const selector = step.target;
    let el: HTMLElement | null = target;
    let frame = 0;
    let last = "";
    const tick = () => {
      if (!el?.isConnected) el = findVisible(selector);
      const box = el ? visibleBox(el, window.innerWidth, window.innerHeight) : null;
      const key = box ? `${box.top},${box.left},${box.width},${box.height}` : "none";
      if (key !== last) {
        last = key;
        setSpot(box);
      }
      frame = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(frame);
  }, [target, step.target]);

  const measured = viewport.w > 0;
  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    const observer = new ResizeObserver(() => setCardHeight(card.offsetHeight));
    observer.observe(card);
    return () => observer.disconnect();
  }, [measured]);

  useEffect(() => {
    if (ready) nextRef.current?.focus({ preventScroll: true });
  }, [ready, stepIndex]);

  if (!measured) return null;

  const narrow = viewport.w < NARROW_BREAKPOINT;
  // On narrow screens the card docks to the bottom, or to the top when the target can't scroll above it.
  const dockTop = narrow && !!spot && spot.top + spot.height / 2 > viewport.h / 2;
  const cardWidth = Math.min(CARD_WIDTH, viewport.w - 2 * VIEWPORT_MARGIN);
  const position = placeCard(spot, cardWidth, cardHeight, viewport.w, viewport.h);
  const progress = ((stepIndex + 1) / TOUR_STEPS.length) * 100;

  return createPortal(
    <div data-tour-ui="">
      {spot ? (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed z-[10000] rounded-lg ring-2 ring-green-400 transition-all duration-200 ease-out"
          style={{
            top: spot.top,
            left: spot.left,
            width: spot.width,
            height: spot.height,
            boxShadow: "0 0 0 9999px rgba(12, 22, 8, 0.6)",
          }}
        />
      ) : (
        <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[10000] bg-[rgba(12,22,8,0.6)]" />
      )}

      <div
        ref={cardRef}
        role="dialog"
        aria-modal="false"
        aria-labelledby="tour-title"
        aria-describedby="tour-body"
        // Live regions are exempt from the aria-hidden the analysis panel applies to the rest of the page.
        aria-live="polite"
        className="pointer-events-auto fixed z-[10001] overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-2xl transition-[top,left] duration-200 ease-out"
        style={
          narrow
            ? dockTop
              ? { left: VIEWPORT_MARGIN, right: VIEWPORT_MARGIN, top: VIEWPORT_MARGIN }
              : { left: VIEWPORT_MARGIN, right: VIEWPORT_MARGIN, bottom: VIEWPORT_MARGIN }
            : { top: position.top, left: position.left, width: cardWidth }
        }
      >
        <div className="h-1 bg-muted">
          <div className="h-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
        <div className="px-5 pb-4 pt-3.5">
          <div className="flex items-center justify-between gap-3">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
              Step {stepIndex + 1} of {TOUR_STEPS.length}
              {!ready && <Loader2 className="h-3 w-3 animate-spin" aria-label="Loading" />}
            </p>
            <button
              type="button"
              onClick={onSkip}
              aria-label="Close tour"
              className="rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <h2 id="tour-title" className="mt-1.5 text-base font-semibold leading-snug">
            {step.title}
          </h2>
          <p id="tour-body" className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
            {step.body}
          </p>
        </div>
        <div className="flex items-center justify-between gap-2 border-t border-border/60 bg-muted/30 px-5 py-3">
          {isLast ? (
            <span />
          ) : (
            <button
              type="button"
              onClick={onSkip}
              className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Skip tour
            </button>
          )}
          <div className="flex items-center gap-2">
            {stepIndex > 0 && (
              <Button type="button" variant="outline" size="sm" className="h-8 gap-1" onClick={onBack}>
                <ArrowLeft className="h-3.5 w-3.5" />
                Back
              </Button>
            )}
            <Button ref={nextRef} type="button" size="sm" className="h-8 gap-1" onClick={onNext}>
              {isLast ? "Finish" : "Next"}
              {!isLast && <ArrowRight className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
