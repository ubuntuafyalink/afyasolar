"""Unit tests for the AI engine's pure services (no models / network needed)."""
import math

from app.services.energy_yield import estimate_yield
from app.services.hazards import hazard_indices, index_from
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
