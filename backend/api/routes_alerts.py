"""
Alerts API route.
GET /api/alerts - Return pre-loaded alert data from seed files.
"""

import json
from pathlib import Path

from fastapi import APIRouter, Query

router = APIRouter(prefix="/api", tags=["alerts"])

# Load alerts from seed data at module level (lazy, cached after first load)
_alerts: list[dict] = []
_alerts_loaded = False


def _load_alerts():
    """Load alerts from the seed data file on first call."""
    global _alerts, _alerts_loaded
    if _alerts_loaded:
        return

    alerts_path = Path(__file__).parent.parent.parent / "data" / "alerts_seed.json"
    if alerts_path.exists():
        with open(alerts_path) as f:
            _alerts = json.load(f)
    _alerts_loaded = True


@router.get("/alerts")
async def list_alerts(
    since: str | None = Query(
        None,
        description="Filter alerts with timestamp >= this ISO date (e.g., 2026-01-01)",
    ),
):
    """
    Return pre-loaded alert data from seed files.
    Optionally filter by timestamp using the 'since' query parameter.
    In production, this would query a real-time monitoring system.
    """
    _load_alerts()
    if since:
        return [a for a in _alerts if a.get("timestamp", "") >= since]
    return _alerts
