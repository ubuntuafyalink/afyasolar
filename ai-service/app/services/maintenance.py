"""
Serve the predictive-maintenance models: RUL regression and anomaly detection.

Heavy deps (xgboost / joblib) are imported lazily and models are cached so the
API stays light until these endpoints are called.
"""
from __future__ import annotations

import json
from functools import lru_cache

import pandas as pd

from app import config
from app.services.maintenance_features import (
    ANOMALY_FEATURES,
    RUL_FEATURES,
    build_anomaly_features_rows,
    build_rul_features_window,
)


@lru_cache(maxsize=1)
def _rul_model():
    from xgboost import XGBRegressor

    model = XGBRegressor()
    model.load_model(str(config.RUL_MODEL_PATH))
    imp_path = config.RUL_MODEL_PATH.parent / "importances.json"
    importances = json.loads(imp_path.read_text()) if imp_path.exists() else {}
    return model, importances


@lru_cache(maxsize=1)
def _anomaly_model():
    import joblib

    return joblib.load(config.ANOMALY_MODEL_PATH)


def predict_rul(window: list[dict]) -> dict:
    """Predict days-to-end-of-life from a facility's recent telemetry window."""
    model, importances = _rul_model()
    row = build_rul_features_window(window)
    X = pd.DataFrame([row])[RUL_FEATURES]
    rul_days = max(0.0, float(model.predict(X)[0]))  # RUL cannot be negative

    ranked = sorted(
        ((k, v) for k, v in importances.items() if k in RUL_FEATURES),
        key=lambda kv: -kv[1],
    )[:4]
    factors = [
        {"feature": k, "importance": round(v, 4), "value": round(float(row[k]), 3)}
        for k, v in ranked
    ]
    return {
        "rul_days": round(rul_days, 1),
        "eol_soh": 0.70,
        "importance_method": importances.get("method", "n/a"),
        "top_factors": factors,
    }


def score_anomaly(records: list[dict]) -> list[dict]:
    """Flag anomalous telemetry rows. Isolation Forest: lower score = more anomalous."""
    model = _anomaly_model()
    X = build_anomaly_features_rows(records)[ANOMALY_FEATURES]
    flags = model.predict(X)          # -1 anomaly, 1 normal
    scores = model.decision_function(X)  # higher = more normal
    return [
        {"anomaly": bool(flags[i] == -1), "score": round(float(scores[i]), 4)}
        for i in range(len(records))
    ]
