"""Unit tests for the AI engine's pure services (no models / network needed)."""
import math

from app.services.energy_yield import estimate_yield
from app.services.hazards import (DAYS_PER_MONTH_AVG, hazard_indices,
                                  index_from, monthly_totals_to_daily_means)
from app.services.maintenance_features import (ANOMALY_FEATURES,
                                               build_anomaly_features_rows)


# ---- hazards (port of nasa-power.ts normalization "v1") --------------------

def test_index_from_bounds_and_linearity():
    assert index_from(20, 20, 42) == 0      # at lower bound
    assert index_from(42, 20, 42) == 100    # at upper bound
    assert index_from(31, 20, 42) == 50     # midpoint
    assert index_from(-5, 20, 42) == 0      # clamped below
    assert index_from(99, 20, 42) == 100    # clamped above
    assert index_from(5, 10, 10) == 0       # zero-width guard


def test_hazard_indices_monthly():
    # Default precip_unit="mm_per_day": NASA POWER monthly means, the v1 contract.
    h = hazard_indices(
        {"T2M_MAX": [31, 31], "PRECTOTCORR": [7.5, 0.0], "WS10M": [0, 15]},
        temporal="monthly",
    )
    assert h["heat"] == 50           # mean 31 in [20,42]
    assert h["flood"] == 50          # peak 7.5 in [0,15] monthly
    assert h["storm"] == 100         # peak 15 in [0,15]
    assert h["drought"] == round(1 / 12 * 100)  # 1 dry month of 2 -> 8
    assert h["composite"] == round((50 + 50 + 100 + h["drought"]) / 4)
    assert h["normalization_version"] == "v1"


def test_hazard_indices_daily_drought_run():
    # 5 consecutive dry days -> index_from(5, 0, 90)
    h = hazard_indices({"PRECTOTCORR": [0, 0, 0, 0, 0, 5, 0]}, temporal="daily")
    assert h["drought"] == round(5 / 90 * 100)


def test_hazard_indices_missing_variables_are_zero():
    h = hazard_indices({}, temporal="monthly")
    assert h == {"heat": 0, "flood": 0, "storm": 0, "drought": 0,
                 "composite": 0, "normalization_version": "v1"}


# ---- monthly-total precipitation (Chronos series, precip_unit="mm_per_month") --

MONTH_STARTS_2025 = [f"2025-{m:02d}-01T00:00:00" for m in range(1, 13)]


def test_monthly_totals_to_daily_means_exact_and_fallback():
    # January has 31 days -> exact conversion when the timestamp is given.
    assert monthly_totals_to_daily_means([310.0], ["2025-01-01T00:00:00"]) == [10.0]
    # Without timestamps, the average month length is the divisor.
    (approx,) = monthly_totals_to_daily_means([310.0])
    assert abs(approx - 310.0 / DAYS_PER_MONTH_AVG) < 1e-9


def test_hazard_indices_monthly_totals_realistic():
    """Unit-consistency: realistic Tanzanian monthly totals (mm) must yield varied
    flood/drought, not the pinned 100/0 the raw totals produce against mm/day bounds."""
    totals = [90, 120, 180, 250, 60, 15, 5, 3, 10, 40, 110, 160]
    h = hazard_indices(
        {"T2M_MAX": [31] * 12, "PRECTOTCORR": totals, "WS10M": [5] * 12},
        temporal="monthly", precip_unit="mm_per_month", timestamps=MONTH_STARTS_2025,
    )
    # Peak is April: 250 mm / 30 d = 8.33 mm/day in [0,15] -> 56.
    assert h["flood"] == 56
    assert 0 < h["flood"] < 100
    # Dry months (< 1 mm/day): Jun 0.50, Jul 0.16, Aug 0.10, Sep 0.33 -> 4/12 -> 33.
    assert h["drought"] == 33
    assert h["normalization_version"] == "v1"
    # Same totals WITHOUT the unit flag reproduce the bug shape (guards the contrast).
    pinned = hazard_indices({"PRECTOTCORR": totals}, temporal="monthly")
    assert pinned["flood"] == 100 and pinned["drought"] == 0


def test_hazard_indices_monthly_totals_not_pinned():
    # An extreme-but-real wet month (789 mm, the dataset's peak) may legitimately
    # saturate flood, but stays in range and doesn't error.
    h = hazard_indices({"PRECTOTCORR": [789.0]}, temporal="monthly",
                       precip_unit="mm_per_month")
    assert 0 <= h["flood"] <= 100
    # A uniform ~100 mm/month (~3.3 mm/day) is unremarkable: low flood, no drought.
    h = hazard_indices({"PRECTOTCORR": [100.0] * 12}, temporal="monthly",
                       precip_unit="mm_per_month")
    assert h["flood"] == 22
    assert h["drought"] == 0


def test_hazard_indices_daily_ignores_precip_unit():
    series = {"PRECTOTCORR": [0, 0, 0, 0, 0, 5, 0]}
    default = hazard_indices(series, temporal="daily")
    flagged = hazard_indices(series, temporal="daily", precip_unit="mm_per_month")
    assert default == flagged


# ---- yield -----------------------------------------------------------------

def test_estimate_yield_matches_physics():
    out = estimate_yield([5.8, 6.1], system_kw=6.0, performance_ratio=0.75)
    assert math.isclose(out["generation_kwh_per_step"][0], 5.8 * 6.0 * 0.75, rel_tol=1e-6)
    assert math.isclose(out["total_kwh"], (5.8 + 6.1) * 6.0 * 0.75, rel_tol=1e-6)
    assert out["steps"] == 2


def test_estimate_yield_rejects_nonpositive_system():
    import pytest
    with pytest.raises(ValueError):
        estimate_yield([5.0], system_kw=0)


def test_negative_irradiance_floored_to_zero():
    out = estimate_yield([-3.0, 4.0], system_kw=2.0)
    assert out["generation_kwh_per_step"][0] == 0.0


# ---- anomaly features ------------------------------------------------------

def test_anomaly_features_are_scale_invariant_columns():
    rows = [{"batt_soc": 55, "batt_v": 46.5, "load_w": 900, "pv_w": 1200}]
    X = build_anomaly_features_rows(rows)
    assert list(X.columns) == ANOMALY_FEATURES
    assert abs(X.iloc[0]["battv_dev"] - 1.5) < 1e-9        # |46.5 - 48|
    assert abs(X.iloc[0]["pv_load_ratio"] - 1200 / 900) < 1e-9
