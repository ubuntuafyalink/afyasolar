"""
Load a fine-tuned Chronos predictor (AutoGluon) and forecast a location's raw
NASA variables.

Heavy dependencies (autogluon/torch) are imported inside the functions so the
API process boots for /health even before the training stack is installed.
"""
from __future__ import annotations

import threading
from functools import lru_cache

import pandas as pd

from app import config

# AutoGluon's TimeSeriesPredictor is not safe under concurrent predict() calls
# (its trainer mutates shared model state; parallel requests fail with
# "Following models failed to predict"). Inference is CPU-bound anyway, so all
# predictions are serialized behind this lock.
_PREDICT_LOCK = threading.Lock()


@lru_cache(maxsize=1)
def _model_base():
    """Local model dir, or a HuggingFace snapshot when AI_ENGINE_MODEL_REPO is set."""
    from pathlib import Path
    if config.MODEL_REPO:
        from huggingface_hub import snapshot_download
        return Path(snapshot_download(config.MODEL_REPO))
    return config.MODEL_DIR


@lru_cache(maxsize=1)
def deployed_model_name() -> str:
    """The deployed model's brand name (from model_card.json 'name', else the
    model directory / HF repo basename)."""
    if config.MODEL_REPO:
        return config.MODEL_REPO.split("/")[-1]
    base = _model_base()
    card = base / "model_card.json"
    if card.exists():
        try:
            import json
            name = json.loads(card.read_text(encoding="utf-8")).get("name")
            if name:
                return name
        except Exception:  # noqa: BLE001
            pass
    return base.name


@lru_cache(maxsize=4)
def _load_predictor(horizon: str):
    from autogluon.timeseries import TimeSeriesPredictor

    path = str(_model_base() / horizon)
    try:
        return TimeSeriesPredictor.load(path)
    except Exception:
        # Models fine-tuned on Colab (Linux) load cleanly on a matching Linux host,
        # but on Windows / an older local AutoGluon they need two compatibility
        # shims: (1) let Linux-pickled PosixPath objects unpickle, and (2) relax the
        # strict predictor-version check. Zero-shot Chronos (the served model) is
        # stable across these minor versions. This branch only runs if the clean
        # load above fails, so production Linux serving is unaffected.
        import os
        import pathlib
        if os.name == "nt":
            pathlib.PosixPath = pathlib.WindowsPath
        return TimeSeriesPredictor.load(path, require_version_match=False)


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


def _resolve_model(predictor, pref: str) -> str | None:
    """Map a preference ('finetuned' | 'zeroshot' | 'best' | exact name) to an
    actual model in the predictor. None => AutoGluon's best model."""
    if not pref or pref.lower() == "best":
        return None
    names = predictor.model_names()
    if pref in names:
        return pref
    key = pref.lower().replace("-", "").replace("_", "").replace(" ", "")
    for n in names:
        if key in n.lower().replace("-", "").replace("_", "").replace(" ", ""):
            return n
    return None  # not found -> fall back to best


def forecast_location(horizon: str, location_id: str,
                      variables: list[str] | None = None) -> dict:
    """Forecast a location's variables. Results are cached per (horizon,
    location, variables): the model and context data are fixed for the process
    lifetime, so a location's forecast is deterministic - and fleet callers
    (e.g. the portfolio outlook) hit the same few grid points repeatedly."""
    return _forecast_location_cached(
        horizon, location_id, tuple(variables) if variables else None)


@lru_cache(maxsize=128)
def _forecast_location_cached(horizon: str, location_id: str,
                              variables: tuple[str, ...] | None = None) -> dict:
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
    predictor = _load_predictor(horizon)
    model = _resolve_model(predictor, config.CLIMATE_MODEL)
    with _PREDICT_LOCK:
        predictions = predictor.predict(tsdf, model=model).reset_index()
    model_used = model or predictor.model_best

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

    return {"location_id": location_id, "horizon": horizon, "forecast": out,
            "model_used": model_used}
