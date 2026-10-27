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
import HowItWorks from "@/components/how-it-works";
import IdcPlan from "@/components/idc-plan";
import { readIdcMode } from "@/lib/idc-mode";
import { TOUR_STEPS } from "@/lib/tour-steps";

const STORAGE_KEY = "regradar-tour";
const AUTO_START_PATH = "/dashboard";
const WAIT_TIMEOUT_MS = 8000;
const POLL_MS = 80;
const SETTLE_MS = 350;
const SPOTLIGHT_PAD = 8;
// Keeps the highlight ring fully on screen when the target runs past the viewport edge.
const RING_INSET = 6;
const SETTLE_TIMEOUT_MS = 1500;
const DIM = "rgba(12, 22, 8, 0.72)";
const CARD_GAP = 14;
const VIEWPORT_MARGIN = 12;
const CARD_WIDTH = 360;
const NARROW_BREAKPOINT = 768;
// Room the card needs beside a target; taller targets are scrolled to the top instead of centered.
const CARD_ROOM = 260;

interface TourContextValue {
  start: () => void;
  showOverview: () => void;
  active: boolean;
}

const TourContext = createContext<TourContextValue>({
  start: () => {},
  showOverview: () => {},
  active: false,
});

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

function scrollTargetIntoView(el: HTMLElement, behavior: ScrollBehavior) {
  const narrow = window.innerWidth < NARROW_BREAKPOINT;
  const fitsWithCard = el.getBoundingClientRect().height + 2 * CARD_ROOM <= window.innerHeight;
  el.scrollIntoView({ block: !narrow && fitsWithCard ? "center" : "start", behavior });
}

function isInView(el: HTMLElement): boolean {
  const r = el.getBoundingClientRect();
  const visible = Math.min(r.bottom, window.innerHeight) - Math.max(r.top, 0);
  return visible >= Math.min(r.height, window.innerHeight) / 2;
}

// Resolves once the element is on screen and smooth scrolling / panel slide-ins have stopped moving
// it; if that hasn't happened by the deadline, jumps it into view instead.
function waitUntilSettledInView(el: HTMLElement, cancelled: () => boolean): Promise<void> {
  return new Promise((resolve) => {
    const startedAt = Date.now();
    const deadline = startedAt + SETTLE_TIMEOUT_MS;
    let last = "";
    let stableFrames = 0;
    const tick = () => {
      const r = el.getBoundingClientRect();
      const key = `${Math.round(r.top)},${Math.round(r.left)},${Math.round(r.width)},${Math.round(r.height)}`;
      stableFrames = key === last ? stableFrames + 1 : 0;
      last = key;
      const settled = stableFrames >= 4 && Date.now() - startedAt > 150 && isInView(el);
      if (cancelled() || settled) return resolve();
      if (Date.now() > deadline) {
        if (!isInView(el)) scrollTargetIntoView(el, "instant");
        return resolve();
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

function visibleBox(el: HTMLElement, vw: number, vh: number): Box | null {
  const r = el.getBoundingClientRect();
  const top = Math.max(r.top - SPOTLIGHT_PAD, RING_INSET);
  const left = Math.max(r.left - SPOTLIGHT_PAD, RING_INSET);
  const bottom = Math.min(r.bottom + SPOTLIGHT_PAD, vh - RING_INSET);
  const right = Math.min(r.right + SPOTLIGHT_PAD, vw - RING_INSET);
  if (bottom - top < 16 || right - left < 16) return null;
  return {
    top: Math.round(top),
    left: Math.round(left),
    width: Math.round(right - left),
    height: Math.round(bottom - top),
  };
}

function keepClearOfDockedCard(spot: Box, cardHeight: number, vh: number, dockTop: boolean): Box {
  const cardEdge = cardHeight + 2 * VIEWPORT_MARGIN;
  const top = dockTop ? Math.max(spot.top, cardEdge) : spot.top;
  const bottom = dockTop ? spot.top + spot.height : Math.min(spot.top + spot.height, vh - cardEdge);
  if (bottom - top < 40) return spot;
  return { ...spot, top, height: bottom - top };
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
  // Tagged with its step so the first render of a new step never reuses the previous step's target.
  const [resolved, setResolved] = useState<{ step: number; session: number; el: HTMLElement | null } | null>(null);
  const [overview, setOverview] = useState<"tour" | "standalone" | null>(null);
  const [idc, setIdc] = useState(false);
  const [idcPlan, setIdcPlan] = useState(false);
  const runRef = useRef(0);
  const ready = resolved !== null && resolved.step === stepIndex && resolved.session === session;
  const target = ready ? resolved.el : null;

  const stopSteps = useCallback(() => {
    runRef.current += 1;
    setStepIndex(null);
    setResolved(null);
  }, []);

  const start = useCallback(() => {
    stopSteps();
    setIdcPlan(false);
    setOverview("tour");
  }, [stopSteps]);

  const showOverview = useCallback(() => {
    stopSteps();
    setIdcPlan(false);
    setOverview("standalone");
  }, [stopSteps]);

  const beginSteps = useCallback(() => {
    setOverview(null);
    setStepIndex(0);
    setSession((s) => s + 1);
  }, []);

  const end = useCallback(() => {
    rememberFinished();
    stopSteps();
  }, [stopSteps]);

  const closeOverview = useCallback(() => {
    if (overview === "tour") rememberFinished();
    setOverview(null);
  }, [overview]);

  const next = useCallback(() => {
    if (stepIndex === null) return;
    if (stepIndex >= TOUR_STEPS.length - 1) {
      end();
      if (idc) setIdcPlan(true);
    } else setStepIndex(stepIndex + 1);
  }, [stepIndex, end, idc]);

  const closeIdcPlan = useCallback(() => setIdcPlan(false), []);

  useEffect(() => {
    setIdc(readIdcMode());
  }, [pathname]);

  const back = useCallback(() => {
    if (stepIndex !== null && stepIndex > 0) setStepIndex(stepIndex - 1);
  }, [stepIndex]);

  useEffect(() => {
    if (stepIndex === null && overview === null && pathname === AUTO_START_PATH && !hasFinishedTour()) start();
  }, [pathname, stepIndex, overview, start]);

  useEffect(() => {
    if (stepIndex === null) return;
    const step = TOUR_STEPS[stepIndex];
    const run = ++runRef.current;
    const cancelled = () => runRef.current !== run;

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
      if (el) {
        scrollTargetIntoView(el, "smooth");
        await waitUntilSettledInView(el, cancelled);
        if (cancelled()) return;
      }
      setResolved({ step: stepIndex, session, el });
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
    <TourContext.Provider value={{ start, showOverview, active: stepIndex !== null || overview !== null || idcPlan }}>
      {children}
      {overview !== null && <HowItWorks mode={overview} onStart={beginSteps} onClose={closeOverview} />}
      {idcPlan && <IdcPlan onClose={closeIdcPlan} />}
      {stepIndex !== null && (
        <TourOverlay
          stepIndex={stepIndex}
          idc={idc}
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
  idc: boolean;
  target: HTMLElement | null;
  ready: boolean;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}

function TourOverlay({ stepIndex, idc, target, ready, onNext, onBack, onSkip }: TourOverlayProps) {
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
  // On narrow screens the card docks to the bottom, or to the top when the target sits low on screen.
  const dockTop = narrow && !!spot && spot.top > viewport.h / 2;
  const ring = narrow && spot ? keepClearOfDockedCard(spot, cardHeight, viewport.h, dockTop) : spot;
  const cardWidth = Math.min(CARD_WIDTH, viewport.w - 2 * VIEWPORT_MARGIN);
  const position = placeCard(spot, cardWidth, cardHeight, viewport.w, viewport.h);
  const progress = ((stepIndex + 1) / TOUR_STEPS.length) * 100;

  return createPortal(
    <div data-tour-ui="">
      {ring ? (
        <>
          <div
            aria-hidden="true"
            data-tour-dim="spotlight"
            className="pointer-events-none fixed z-[10000] rounded-xl"
            style={{ ...ring, boxShadow: `0 0 0 9999px ${DIM}` }}
          />
          <div
            aria-hidden="true"
            data-tour-highlight=""
            className="tour-highlight-ring pointer-events-none fixed z-[10000] rounded-xl border-[3px] border-green-400"
            style={ring}
          />
        </>
      ) : (
        <div
          aria-hidden="true"
          data-tour-dim="full"
          className="pointer-events-none fixed inset-0 z-[10000]"
          style={{ backgroundColor: DIM }}
        />
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
          {idc && step.idc && (
            <p className="mt-2 border-l-2 border-primary/50 pl-2.5 text-sm leading-snug text-muted-foreground dark:border-green-400/50">
              <span className="font-semibold text-primary dark:text-green-400">At IDC:</span> {step.idc}
            </p>
          )}
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
