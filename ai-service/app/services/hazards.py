"""
Derive climate-hazard indices (heat / flood / storm / drought, 0..100) from
forecasted raw NASA variables.

This is a faithful Python port of the app's normalization
(afyasolar/src/lib/climate/nasa-power.ts, NORMALIZATION_VERSION "v1") so the AI
engine and the web app produce identical hazard numbers. Chronos forecasts the
raw variables; this turns them into the hazard vocabulary the platform uses.

Pure functions, no I/O - unit-testable and safe to call per request.
"""
from __future__ import annotations

NORMALIZATION_VERSION = "v1"

HEAT_BOUNDS = (20.0, 42.0)            # mean T2M_MAX (deg C)
FLOOD_BOUNDS_DAILY = (0.0, 80.0)      # peak PRECTOTCORR (mm/day)
FLOOD_BOUNDS_MONTHLY = (0.0, 15.0)    # peak PRECTOTCORR (monthly)
STORM_BOUNDS = (0.0, 15.0)            # peak WS10M (m/s)
DROUGHT_DAYS_BOUNDS = (0.0, 90.0)     # longest dry-day run
DRY_MONTHS_BOUNDS = (0.0, 12.0)       # count of dry months
DRY_THRESHOLD_MM = 1.0


def clamp(n: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, n))


def index_from(value: float, lo: float, hi: float) -> int:
    """Linear map of value in [lo, hi] onto an integer 0..100, clamped."""
    if hi == lo:
        return 0
    return round(clamp(((value - lo) / (hi - lo)) * 100.0, 0.0, 100.0))


def _mean(xs: list[float]) -> float | None:
    return sum(xs) / len(xs) if xs else None


def _max(xs: list[float]) -> float | None:
    return max(xs) if xs else None


def _longest_dry_run(precip: list[float]) -> int:
    run = best = 0
    for v in precip:
        if v < DRY_THRESHOLD_MM:
            run += 1
            best = max(best, run)
        else:
            run = 0
    return best


def hazard_indices(series: dict[str, list[float]], temporal: str = "monthly") -> dict:
    """Map forecasted variable series to hazard indices + composite.

    ``series`` maps NASA variable names to forecasted value lists over the
    horizon, e.g. {"T2M_MAX": [...], "PRECTOTCORR": [...], "WS10M": [...]}.
    ``temporal`` is "daily" or "monthly" (selects flood bounds + drought method).
    """
    daily = temporal == "daily"

    t2m_max = series.get("T2M_MAX", [])
    precip = series.get("PRECTOTCORR", [])
    wind = series.get("WS10M", [])

    heat_mean = _mean(t2m_max)
    heat = 0 if heat_mean is None else index_from(heat_mean, *HEAT_BOUNDS)

    flood_peak = _max(precip)
    if flood_peak is None:
        flood = 0
    else:
        bounds = FLOOD_BOUNDS_DAILY if daily else FLOOD_BOUNDS_MONTHLY
        flood = index_from(flood_peak, *bounds)

    storm_peak = _max(wind)
    storm = 0 if storm_peak is None else index_from(storm_peak, *STORM_BOUNDS)

    if not precip:
        drought = 0
    elif daily:
        drought = index_from(_longest_dry_run(precip), *DROUGHT_DAYS_BOUNDS)
    else:
        dry_months = sum(1 for v in precip if v < DRY_THRESHOLD_MM)
        drought = index_from(dry_months, *DRY_MONTHS_BOUNDS)

    composite = round((heat + flood + storm + drought) / 4)
    return {
        "heat": heat,
        "flood": flood,
        "storm": storm,
        "drought": drought,
        "composite": composite,
        "normalization_version": NORMALIZATION_VERSION,
    }
