"""
Feature engineering for the predictive-maintenance models, shared by the
training scripts (pipeline/train) and the serving code (app/services/maintenance)
so both compute identical features. Pure pandas/numpy.

RUL features are rolling stats over OBSERVABLE telemetry (never SoH, which is the
label's source and unmeasurable in the field). Anomaly features are per-row.
"""
from __future__ import annotations

import pandas as pd

NOMINAL_BATT_V = 48.0

RUL_FEATURES = [
    "age_days", "soc_mean_7", "soc_min_7", "soc_mean_30",
    "temp_mean_30", "temp_max_7", "battv_mean_7",
    "pv_load_ratio_7", "dod_proxy_7",
]

# Scale-invariant electrical-health signals only. Raw load_w/pv_w scale with
# system size (would dominate); temp_c and grid_present are natural variation
# (cloudy days, outages) that inflate false positives - both deliberately
# excluded so the detector isolates FAULTS, not benign conditions.
ANOMALY_FEATURES = ["batt_soc", "pv_load_ratio", "battv_dev"]


def _roll(g, col, win, minp, how):
    r = g[col].transform(lambda s: getattr(s.rolling(win, min_periods=minp), how)())
    return r


def build_rul_features(df: pd.DataFrame) -> tuple[pd.DataFrame, pd.Series, pd.Series]:
    """Return (X, y=rul_days, groups=facility_id) for training. Drops warmup rows
    where the rolling windows are not yet populated."""
    df = df.sort_values(["facility_id", "day"])
    g = df.groupby("facility_id")

    feat = pd.DataFrame(index=df.index)
    feat["age_days"] = df["day"].astype(float)
    feat["soc_mean_7"] = _roll(g, "batt_soc", 7, 3, "mean")
    feat["soc_min_7"] = _roll(g, "batt_soc", 7, 3, "min")
    feat["soc_mean_30"] = _roll(g, "batt_soc", 30, 5, "mean")
    feat["temp_mean_30"] = _roll(g, "temp_c", 30, 5, "mean")
    feat["temp_max_7"] = _roll(g, "temp_c", 7, 3, "max")
    feat["battv_mean_7"] = _roll(g, "batt_v", 7, 3, "mean")
    pv7 = _roll(g, "pv_w", 7, 3, "mean")
    load7 = _roll(g, "load_w", 7, 3, "mean").clip(lower=1.0)
    feat["pv_load_ratio_7"] = pv7 / load7
    feat["dod_proxy_7"] = 1.0 - feat["soc_mean_7"] / 100.0

    X = feat.dropna()
    y = df.loc[X.index, "rul_days"]
    groups = df.loc[X.index, "facility_id"]
    return X[RUL_FEATURES], y, groups


def build_rul_features_window(window: list[dict]) -> dict:
    """Compute the RUL feature row from a facility's recent daily telemetry window
    (>= a few weeks recommended). Returns a {feature: value} dict for the last day.
    Requires each record to carry a 'day' (age in service) plus telemetry fields.
    """
    df = pd.DataFrame(window).sort_values("day")
    if df.empty:
        raise ValueError("empty telemetry window")
    df["facility_id"] = "_serve"
    X, _, _ = build_rul_features(df.assign(rul_days=0))
    if X.empty:
        raise ValueError("telemetry window too short to compute rolling features")
    return X.iloc[-1].to_dict()


def build_anomaly_features(df: pd.DataFrame) -> pd.DataFrame:
    out = pd.DataFrame(index=df.index)
    out["batt_soc"] = df["batt_soc"]
    # Fault signatures: inverter dropout -> ratio ~ 0; voltage spike / undervolt
    # -> large deviation from the 48 V bus.
    out["pv_load_ratio"] = df["pv_w"] / df["load_w"].clip(lower=1.0)
    out["battv_dev"] = (df["batt_v"] - NOMINAL_BATT_V).abs()
    return out[ANOMALY_FEATURES]


def build_anomaly_features_rows(records: list[dict]) -> pd.DataFrame:
    return build_anomaly_features(pd.DataFrame(records))
