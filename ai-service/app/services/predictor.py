"""
Load a fine-tuned Chronos predictor (AutoGluon) and forecast a location's raw
NASA variables.

Heavy dependencies (autogluon/torch) are imported inside the functions so the
API process boots for /health even before the training stack is installed.
"""
from __future__ import annotations

from functools import lru_cache

import pandas as pd

from app import config


@lru_cache(maxsize=4)
def _load_predictor(horizon: str):
    from autogluon.timeseries import TimeSeriesPredictor

    return TimeSeriesPredictor.load(str(config.MODEL_DIR / horizon))


def _load_context(horizon: str) -> pd.DataFrame:
    """The series the model conditions on (same schema build_dataset.py emits)."""
    name = "daily" if horizon == "daily" else "monthly"
    path = config.PROCESSED_DIR / f"{name}.{config.DATA_FORMAT}"
    if not path.exists():
        raise FileNotFoundError(
            f"Context dataset not found: {path}. Build datasets before serving."
        )
    if config.DATA_FORMAT == "parquet":
        df = pd.read_parquet(path)
    else:
        df = pd.read_csv(path, parse_dates=["timestamp"])
    df["timestamp"] = pd.to_datetime(df["timestamp"])
    return df[["item_id", "timestamp", "target"]]


def forecast_location(horizon: str, location_id: str,
                      variables: list[str] | None = None) -> dict:
    from autogluon.timeseries import TimeSeriesDataFrame

    suffix = "D" if horizon == "daily" else "M"
    df = _load_context(horizon)
    mask = df["item_id"].str.startswith(f"{location_id}|")
    if variables:
        allowed = {f"{location_id}|{v}|{suffix}" for v in variables}
        mask &= df["item_id"].isin(allowed)
    sub = df[mask]
    if sub.empty:
        raise ValueError(
            f"No series for location '{location_id}'"
            + (f" with variables {variables}" if variables else "")
        )

    tsdf = TimeSeriesDataFrame.from_data_frame(
        sub, id_column="item_id", timestamp_column="timestamp"
    )
    predictions = _load_predictor(horizon).predict(tsdf).reset_index()

    out: dict[str, list[dict]] = {}
    quantile_cols = [c for c in predictions.columns if c not in ("item_id", "timestamp", "mean")]
    for item_id, g in predictions.groupby("item_id"):
        variable = item_id.split("|")[1]
        records = []
        for _, row in g.iterrows():
            rec = {"timestamp": row["timestamp"].isoformat()}
            if "mean" in g.columns:
                rec["mean"] = float(row["mean"])
            for q in quantile_cols:
                rec[f"q{q}"] = float(row[q])
            records.append(rec)
        out[variable] = records

    return {"location_id": location_id, "horizon": horizon, "forecast": out}
