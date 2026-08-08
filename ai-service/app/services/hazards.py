"""
Derive climate-hazard indices (heat / flood / storm / drought, 0..100) from
forecasted raw NASA variables.

This is a faithful Python port of the app's normalization
(afyasolar/src/lib/climate/nasa-power.ts, NORMALIZATION_VERSION "v1") so the AI
engine and the web app produce identical hazard numbers. Chronos forecasts the
raw variables; this turns them into the hazard vocabulary the platform uses.

Pure functions, no I/O - unit-testable and safe to call per request.

Precipitation units: the v1 bounds treat PRECTOTCORR as mm/day (NASA POWER's
monthly PRECTOTCORR is a mm/day *mean*, which is what nasa-power.ts feeds).
The Chronos pipeline instead sums daily precipitation into monthly *totals*
(pipeline/datasets/build_dataset.py, SUM_VARIABLES), so callers holding
Chronos monthly forecasts must pass precip_unit="mm_per_month" to have the
totals converted back to mm/day means before the v1 bounds apply.
"""
from __future__ import annotations

import calendar
from datetime import datetime

NORMALIZATION_VERSION = "v1"

HEAT_BOUNDS = (20.0, 42.0)            # mean T2M_MAX (deg C)
FLOOD_BOUNDS_DAILY = (0.0, 80.0)      # peak PRECTOTCORR (mm/day)
FLOOD_BOUNDS_MONTHLY = (0.0, 15.0)    # peak PRECTOTCORR (monthly)
STORM_BOUNDS = (0.0, 15.0)            # peak WS10M (m/s)
DROUGHT_DAYS_BOUNDS = (0.0, 90.0)     # longest dry-day run
DRY_MONTHS_BOUNDS = (0.0, 12.0)       # count of dry months
DRY_THRESHOLD_MM = 1.0

DAYS_PER_MONTH_AVG = 30.437  # mean Gregorian month length; divisor fallback

PRECIP_UNITS = ("mm_per_day", "mm_per_month")


def _days_in_month(ts: str) -> float:
    try:
        dt = datetime.fromisoformat(str(ts)[:19])
        return float(calendar.monthrange(dt.year, dt.month)[1])
    except (ValueError, TypeError):
        return DAYS_PER_MONTH_AVG


def monthly_totals_to_daily_means(values: list[float],
                                  timestamps: list[str] | None = None) -> list[float]:
    """Convert monthly-total precipitation (mm) to mm/day means.

    Uses the exact days-in-month when an aligned timestamp is available,
    otherwise the average month length.
    """
    if timestamps and len(timestamps) == len(values):
        return [v / _days_in_month(ts) for v, ts in zip(values, timestamps)]
    return [v / DAYS_PER_MONTH_AVG for v in values]


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


def hazard_indices(series: dict[str, list[float]], temporal: str = "monthly", *,
                   precip_unit: str = "mm_per_day",
                   timestamps: list[str] | None = None) -> dict:
    """Map forecasted variable series to hazard indices + composite.

    ``series`` maps NASA variable names to forecasted value lists over the
    horizon, e.g. {"T2M_MAX": [...], "PRECTOTCORR": [...], "WS10M": [...]}.
    ``temporal`` is "daily" or "monthly" (selects flood bounds + drought method).
    ``precip_unit`` declares the unit of the PRECTOTCORR values on the monthly
    path: "mm_per_day" (NASA POWER monthly means; the v1 default) or
    "mm_per_month" (Chronos monthly totals, converted here before the v1
    bounds apply). Ignored when ``temporal`` is "daily" (always mm/day).
    ``timestamps`` (optional, aligned to the series) enables exact
    days-in-month conversion; otherwise the average month length is used.
    """
    daily = temporal == "daily"

    t2m_max = series.get("T2M_MAX", [])
    precip = series.get("PRECTOTCORR", [])
    wind = series.get("WS10M", [])
    if not daily and precip_unit == "mm_per_month":
        precip = monthly_totals_to_daily_means(precip, timestamps)

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


def hazard_trajectory(timestamps: list[str], series: dict[str, list[float]],
                      temporal: str = "monthly", *,
                      precip_unit: str = "mm_per_day") -> list[dict]:
    """Per-timestep hazard indices aligned to ``timestamps``, for a forecast chart.

    Unlike ``hazard_indices`` (which aggregates the whole horizon into one number
    each), this returns one {heat, flood, storm, drought} per forecast step, using
    the same ``index_from`` + bounds. Drought here is a per-step *dryness proxy*
    (how far the step's precipitation falls below the "wet" reference) rather than
    the horizon's dry-run/dry-month count, so it varies smoothly month to month.
    ``precip_unit`` has the same semantics as in ``hazard_indices`` (conversion
    uses the exact days-in-month from ``timestamps``).
    """
    daily = temporal == "daily"
    flood_hi = FLOOD_BOUNDS_DAILY[1] if daily else FLOOD_BOUNDS_MONTHLY[1]
    t2m = series.get("T2M_MAX", [])
    precip = series.get("PRECTOTCORR", [])
    wind = series.get("WS10M", [])
    if not daily and precip_unit == "mm_per_month":
        precip = monthly_totals_to_daily_means(precip, list(timestamps))

    def at(xs: list[float], i: int) -> float | None:
        return xs[i] if i < len(xs) else None

    out: list[dict] = []
    for i, ts in enumerate(timestamps):
        h, p, w = at(t2m, i), at(precip, i), at(wind, i)
        out.append({
            "timestamp": ts,
            "heat": 0 if h is None else index_from(h, *HEAT_BOUNDS),
            "flood": 0 if p is None else index_from(p, 0.0, flood_hi),
            "storm": 0 if w is None else index_from(w, *STORM_BOUNDS),
            "drought": 0 if p is None else index_from(flood_hi - p, 0.0, flood_hi),
        })
    return out
