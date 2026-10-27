import { mockAlerts } from "./mock-data";

export interface TourStep {
  id: string;
  /** Path (and optional query) the step lives on. */
  route: string;
  /** CSS selector to spotlight; omit for a centered card. */
  target?: string;
  title: string;
  body: string;
  /** UI actions needed to reveal the target: click `click` until `until` exists. */
  prepare?: { click: string; until: string }[];
  /** The step lives inside the facility analysis panel, so keep it open. */
  inPanel?: boolean;
}

export const TOUR_FACILITY_ID = "e681a8a3-3ae5-4d4e-8fe7-4ff8d280dce2";
const FEATURED_ALERT_ID = "alert-001";

const featuredAlertFacilities =
  mockAlerts.find((a) => a.id === FEATURED_ALERT_ID)?.affected_business_ids ?? [TOUR_FACILITY_ID];

const FACILITY_PAGE = `/facilities/${TOUR_FACILITY_ID}`;
const OPEN_PANEL = { click: '[data-tour="run-analysis"]', until: '[data-tour="analysis-form"]' };
const RUN_ANALYSIS = { click: '[data-tour="analyze-button"]', until: '[data-tour="analysis-overview"]' };

export const TOUR_STEPS: TourStep[] = [
  {
    id: "welcome",
    route: "/dashboard",
    title: "Welcome to RegRadar",
    body: "RegRadar watches environmental rules for hog farms in eastern North Carolina and explains, in plain English, what each rule means for each farm. This short tour follows one rule change from alert to to-do list.",
  },
  {
    id: "overview",
    route: "/dashboard",
    target: '[data-tour="kpis"]',
    title: "What RegRadar watches",
    body: "15 real hog farms from North Carolina's permit records and the 9 federal EPA rules that apply to them. These cards give the big picture: farms monitored, farms needing attention, open alerts and rules tracked.",
  },
  {
    id: "map",
    route: "/dashboard",
    target: '[data-tour="dashboard-map"]',
    title: "Where the farms are",
    body: "Each dot is a farm, colored by its latest check: green is compliant, amber needs review, red is non-compliant and gray hasn't been analyzed yet. In this demo, one farm has a saved analysis.",
  },
  {
    id: "alert",
    route: "/alerts",
    target: `[data-alert-id="${FEATURED_ALERT_ID}"]`,
    title: "A rule change comes in",
    body: "When a rule changes, RegRadar raises an alert and rates how serious it is. Here, a North Carolina Supreme Court ruling struck down three permit conditions for hog farms.",
  },
  {
    id: "affected",
    route: "/alerts",
    target: `[data-alert-id="${FEATURED_ALERT_ID}"] [data-tour="alert-affected"]`,
    title: "Who it affects",
    body: "Each alert is matched to the specific farms it applies to, so nobody has to read every rule against every farm by hand. Click any farm name to open it.",
  },
  {
    id: "affected-map",
    route: `/facilities?highlight=${featuredAlertFacilities.join(",")}`,
    target: '[data-tour="facilities-map"]',
    title: "The affected farms",
    body: "Farms hit by the alert are highlighted in red. Calvin L. Rouse Farm in Duplin County is one of them. Let's open it.",
  },
  {
    id: "facility",
    route: FACILITY_PAGE,
    target: '[data-tour="facility-header"]',
    title: "Calvin L. Rouse Farm",
    body: "A 2,883-head hog farm in Duplin County, operating under North Carolina's general permit. Its location, alerts and past checks are all on this page.",
  },
  {
    id: "run",
    route: FACILITY_PAGE,
    target: '[data-tour="run-analysis"]',
    title: "Check the farm against a rule",
    body: "One click starts a compliance check. Press Next and the tour will open it for you.",
  },
  {
    id: "choose",
    route: FACILITY_PAGE,
    target: '[data-tour="analysis-form"]',
    prepare: [OPEN_PANEL],
    inPanel: true,
    title: "Pick a rule and analyze",
    body: "The main federal permit rule for hog farms is pre-selected. In the full version, the AI reads the entire rule and compares it with this farm's permit, size and type. This demo shows a result the AI produced earlier.",
  },
  {
    id: "verdict",
    route: FACILITY_PAGE,
    target: '[data-tour="analysis-overview"]',
    prepare: [OPEN_PANEL, RUN_ANALYSIS],
    inPanel: true,
    title: "The risk level",
    body: "\"Needs review\" means the farm looks mostly in line, but some requirements can't be confirmed from its records. The counts show how much there is to look at, and the AI says how confident it is.",
  },
  {
    id: "gaps",
    route: FACILITY_PAGE,
    target: '[data-tour="analysis-gaps"]',
    prepare: [OPEN_PANEL, RUN_ANALYSIS],
    inPanel: true,
    title: "What might be missing",
    body: "Each gap is something specific to check at this farm, such as whether the permit renewal was filed on time or the lagoons have the required depth markers.",
  },
  {
    id: "actions",
    route: FACILITY_PAGE,
    target: '[data-tour="analysis-actions"]',
    prepare: [OPEN_PANEL, RUN_ANALYSIS],
    inPanel: true,
    title: "What to do next",
    body: "The gaps turn into a checklist the farm can work through and tick off.",
  },
  {
    id: "requirements",
    route: FACILITY_PAGE,
    target: '[data-tour="analysis-requirements"]',
    prepare: [OPEN_PANEL, RUN_ANALYSIS],
    inPanel: true,
    title: "The rule, in plain English",
    body: "Every requirement the AI found, with the exact legal citation, a plain-English summary, and any deadline or penalty. This rule produced 76 of them.",
  },
  {
    id: "done",
    route: FACILITY_PAGE,
    prepare: [OPEN_PANEL, RUN_ANALYSIS],
    inPanel: true,
    title: "That's the whole flow",
    body: "A rule changes, the affected farms are flagged, and each one gets a plain-English to-do list. In the full local version the AI runs live for any farm and rule. Reopen this tour any time with \"Take the tour\".",
  },
];
