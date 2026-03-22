# RegRadar Frontend

Next.js 14 frontend for RegRadar -- an AI-powered environmental compliance monitoring tool for NC hog farm CAFOs (Concentrated Animal Feeding Operations) in Duplin and Sampson counties.

## Tech Stack

| Technology | Purpose |
|---|---|
| Next.js 14 (App Router) | React framework with server/client components |
| TypeScript | Type safety |
| Tailwind CSS | Utility-first styling |
| shadcn/ui | UI component library (Radix UI primitives) |
| React Leaflet | Interactive map (OpenStreetMap tiles) |
| Recharts | Chart library (available for future use) |
| Lucide React | Icon library |
| bun | Package manager and runtime (required) |

## Prerequisites

- [Bun](https://bun.sh/) v1.0+ installed
- The backend API running at `http://localhost:8000` (or use mock mode)

## Quick Start

```bash
cd frontend
bun install
bun run dev
```
The app starts on [http://localhost:3000](http://localhost:3000).

The app is now configured to connect to the **live backend** by default (`NEXT_PUBLIC_USE_MOCKS=false`). The backend must be running at `http://localhost:8000` and seeded before the frontend will show real data.

**To run with the live backend:**

```bash
# 1. Start the backend (in a separate terminal)
cd backend
source .venv/bin/activate
uv run python -m db.seed          # seed SQLite + ChromaDB (first time only)
uv run uvicorn main:app --reload --port 8000

# 2. Start the frontend
cd frontend
bun run dev
```

**To fall back to mock data** (no backend required):

```bash
# Edit .env.local
NEXT_PUBLIC_USE_MOCKS=true
```

## Environment Variables

| Variable | Value | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | Backend FastAPI base URL |
| `NEXT_PUBLIC_USE_MOCKS` | `false` | Set to `true` to use hardcoded mock data without a backend |

## Backend Integration

The frontend connects to the FastAPI backend over HTTP. All API calls go through `lib/api.ts` which prepends `NEXT_PUBLIC_API_URL` to every request.

### Confirmed working endpoints

| Endpoint | Frontend function | Notes |
|---|---|---|
| `GET /api/regulations` | `fetchRegulations()` | Returns paginated list with `{ items, total, page, per_page }` |
| `GET /api/businesses` | `fetchBusinesses()` | Returns `{ items, total, page, per_page }`; `latest_status` is computed server-side from most recent analysis |
| `GET /api/businesses/{id}` | `fetchBusinessDetail()` | Returns business with `analyses[]` array; JSON fields pre-parsed |
| `POST /api/analyze` | `runAnalysis()` | Sends `{ business_id, regulation_id }`; runs Gemini 2.5 Flash via backend; response cached in SQLite |
| `GET /api/alerts` | `fetchAlerts()` | Returns raw array from `data/alerts_seed.json` |
| `GET /api/health` | — | Backend health check (not called by frontend directly) |

### Known field differences (handled)

- `GET /api/businesses` returns extra `page`/`per_page` fields — typed as optional in `BusinessListResponse`
- `POST /api/analyze` returns an extra `analysis_id` field — typed as optional in `ComplianceGapAnalysis`
- `GET /api/regulations` returns extra `cfr_references` and `ingested_at` fields — ignored by TypeScript (no type change needed)
- Past analyses on `GET /api/businesses/{id}` have `confidence` (not `confidence_score`) and `*_json` fields that are pre-parsed objects — the frontend only displays `summary` and `overall_status` from these, so no impact

## Project Structure

```
frontend/
  app/
    layout.tsx              # Root layout with sidebar navigation
    page.tsx                # Dashboard: regulation feed + NC CAFO map
    globals.css             # Tailwind base + shadcn/ui CSS variables
    alerts/
      page.tsx              # Alerts view with severity levels + timer simulation
  components/
    nc-map.tsx              # React Leaflet map ("use client", loads dynamically)
    reg-feed.tsx            # Scrollable regulation card feed
    business-detail.tsx     # Slide-out Sheet with facility info + analyze button
    analysis-result.tsx     # Renders ComplianceGapAnalysis from Gemini
    ui/                     # shadcn/ui primitives
      alert.tsx
      badge.tsx
      button.tsx
      card.tsx
      scroll-area.tsx
      select.tsx
      separator.tsx
      sheet.tsx
      skeleton.tsx
  lib/
    api.ts                  # Fetch wrapper with mock toggle
    mock-data.ts            # 10 businesses, 5 regulations, alerts, analysis
    types.ts                # TypeScript interfaces for all API shapes
    utils.ts                # cn() helper for Tailwind class merging
```

## Pages

### Dashboard (`/`)

Split-panel layout:
- **Left (35%)** -- Regulation Feed: scrollable cards for each regulation fetched from `GET /api/regulations`. Each card shows title, agency badge (EPA = blue, NC_DEQ = green), document type, publication date, and abstract excerpt.
- **Right (65%)** -- NC Map: React Leaflet map centered on eastern NC (35.0, -78.0, zoom 8) with CircleMarker overlays for each CAFO facility from `GET /api/businesses`. Markers are color-coded by compliance status:
  - `#22c55e` green = Compliant
  - `#eab308` yellow = Warning
  - `#ef4444` red = Non-Compliant
  - `#9ca3af` gray = Unknown

Clicking a map marker opens the **Business Detail** panel.

### Business Detail (Sheet)

A shadcn Sheet that slides in from the right. Displays:
- Facility name, permit number, county, operation type, head count, coordinates
- Compliance history (past analyses with status badges)
- **Analyze Compliance** button: select a regulation from a dropdown, then POST to `/api/analyze` to run a Gemini-powered gap analysis
- Analysis results rendered inline showing overall status, confidence score, compliance gaps, recommended actions, and individual regulatory requirements

### Alerts (`/alerts`)

Lists compliance alerts from `GET /api/alerts`, each showing:
- Regulation title, severity badge (High/Medium/Low with color-coded left border)
- Description text and number of affected facilities
- A 60-second timer simulates a "live monitoring" notification appearing

## API Contract

The frontend expects the following endpoints from the backend at `NEXT_PUBLIC_API_URL`:

### `GET /api/regulations`

```json
{
  "items": [{
    "id": "string",
    "title": "string",
    "agency": "EPA | NC_DEQ",
    "document_type": "RULE | PROPOSED_RULE | NOTICE",
    "publication_date": "2024-11-15",
    "effective_date": "2025-03-01 | null",
    "abstract": "string"
  }],
  "total": 5,
  "page": 1,
  "per_page": 20
}
```

### `GET /api/businesses`

```json
{
  "items": [{
    "id": "string",
    "name": "string",
    "permit_number": "string",
    "county": "string",
    "latitude": 34.95,
    "longitude": -78.05,
    "operation_type": "string",
    "head_count": 8500,
    "permit_type": "general | individual",
    "latest_status": "compliant | non_compliant | warning | unknown"
  }],
  "total": 10
}
```

### `GET /api/businesses/{id}`

Same as a business item above, plus an `analyses` array:

```json
{
  "...business fields",
  "naics_code": "112210",
  "created_at": "2024-01-01T00:00:00Z",
  "analyses": [{
    "id": "string",
    "regulation_id": "string",
    "overall_status": "compliant | non_compliant | warning | unknown",
    "confidence": 0.87,
    "summary": "string",
    "created_at": "2025-01-20T14:30:00Z"
  }]
}
```

### `POST /api/analyze`

Request body:
```json
{
  "business_id": "biz-002",
  "regulation_id": "2024-01247"
}
```

Response:
```json
{
  "business_name": "string",
  "business_id": "string",
  "regulation_name": "string",
  "regulation_id": "string",
  "analysis_date": "2025-01-22T10:00:00Z",
  "overall_status": "compliant | non_compliant | warning | unknown",
  "confidence_score": 0.87,
  "requirements": [{
    "requirement_id": "string",
    "regulation_section": "40 CFR 412.31(a)",
    "requirement_text": "string",
    "plain_language_summary": "string",
    "obligation_type": "mandatory | recommended | conditional",
    "deadline": "2025-01-15 | null",
    "penalty_info": "string | null"
  }],
  "gaps": ["string"],
  "recommended_actions": ["string"],
  "summary": "string"
}
```

### `GET /api/alerts`

```json
[{
  "id": "string",
  "regulation_title": "string",
  "regulation_id": "string",
  "affected_business_ids": ["biz-002", "biz-005"],
  "severity": "high | medium | low",
  "timestamp": "2025-01-22T08:00:00Z",
  "description": "string"
}]
```

## Mock Data

When `NEXT_PUBLIC_USE_MOCKS=true`, the app uses hardcoded data from `lib/mock-data.ts`:
- **10 businesses** spread across Duplin and Sampson counties (lat 34.83-35.15, lng -77.95 to -78.45)
- **5 regulations** (3 EPA, 2 NC DEQ) including final rules and proposed rules
- **4 alerts** with high/medium/low severity
- **3 historical analyses** attached to specific facilities
- **1 full ComplianceGapAnalysis** response returned by the mock `POST /api/analyze`

## Commands

| Command | Description |
|---|---|
| `bun install` | Install dependencies |
| `bun run dev` | Start development server (port 3000) |
| `bun run build` | Production build |
| `bun run start` | Start production server |
| `bun run lint` | Run ESLint |

## Important Notes

- **Leaflet/Map**: All map components use `"use client"` and are loaded via `next/dynamic` with `ssr: false`. Leaflet crashes on server-side rendering.
- **Package Manager**: This project uses `bun` exclusively. Do NOT use npm, yarn, or pnpm.
- **Error Handling**: Every async operation shows a loading skeleton (shadcn Skeleton). Failed API calls display an Alert with error message and Retry button.
- **Status Colors**: Map markers use SVG-based CircleMarker (not image icons) with the following colors:
  - Compliant: `#22c55e`
  - Warning: `#eab308`
  - Non-Compliant: `#ef4444`
  - Unknown: `#9ca3af`

---

## Analysis Display

When a user clicks **Analyze Compliance** in the business detail panel:

1. A loading skeleton fills the analysis area while the `POST /api/analyze` request runs (1.5s simulated delay in mock mode).
2. On success the result renders inline inside the Sheet with:
   - **Status badge** (large, colored): `COMPLIANT` green / `WARNING` yellow / `NON-COMPLIANT` red / `UNKNOWN` gray, with confidence percentage alongside
   - **Summary callout**: plain-language overview rendered as an `Alert` component
   - **Identified Gaps**: red-bordered card with bullet points for each gap
   - **Recommended Actions**: blue-bordered card where each action is a `Checkbox` item — checked actions get a strikethrough so users can track progress
   - **Requirements**: each regulatory requirement shows the CFR section in monospace, an obligation-type badge (`mandatory` = red, `recommended` = blue, `conditional` = yellow), plain-language summary, legal text in italic, and deadline/penalty if present

## Alerts Page Features

- Alerts sorted descending by timestamp
- Each card has a colored left border (`border-l-red-500` high, `border-l-yellow-500` medium, `border-l-blue-500` low)
- **"View Affected Facilities"** button navigates to `/?highlight=biz-001,biz-002,...`

### Live Monitoring Simulation

A `setInterval` fires every **60 seconds** and:
1. Prepends a new hardcoded `mockTimerAlert` to the alert list (simulating EPA proposed rule detection)
2. Fires a shadcn **Toast** notification in the bottom-right corner: "New Regulation Alert — EPA proposed rule detected affecting 4 facilities"

The interval clears on component unmount (React cleanup).

## Map Marker Highlights

When navigating from an alert via "View Affected Facilities" (`/?highlight=biz-001,...`):

- Highlighted markers are **forced red** (`#ef4444` / `#b91c1c` border) regardless of their actual compliance status
- Radius increases from 8 → 12, border weight from 2 → 3
- A CSS `transition: fill 0.3s ease, stroke 0.3s ease` on the SVG path gives a smooth color change
- A `@keyframes marker-pulse` animation pulses opacity 1→0.5→1 every 1.5s on highlighted markers
- The map legend gains an "Alert (N)" row when highlights are active
- Hover **Tooltip** shows business name; highlighted markers also show a "⚠ Alert" label
- Click **Popup** shows "⚠ Affected by active alert" for highlighted businesses

## New UI Components

| Component | File | Description |
|---|---|---|
| Toast system | `components/ui/toast.tsx`, `components/ui/toaster.tsx`, `lib/use-toast.ts` | shadcn toast notifications, global via `<Toaster />` in layout |
| Checkbox | `components/ui/checkbox.tsx` | Radix Checkbox for the recommended actions checklist |

## New Dependencies

| Package | Version | Purpose |
|---|---|---|
| `@radix-ui/react-toast` | `1.1.5` | Toast notifications (React 18 compatible) |
| `@radix-ui/react-checkbox` | `1.0.4` | Checkbox for action items (React 18 compatible) |
