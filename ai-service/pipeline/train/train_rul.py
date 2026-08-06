"""
Train the Remaining-Useful-Life (RUL) regressor on synthetic telemetry.

XGBoost regression from observable telemetry rolling-features -> days until the
battery reaches end-of-life. Facility-grouped train/test split (no leakage).
Saves the model + feature list + metrics + SHAP (or gain) importances.

Run from the ai-engine root, after generating telemetry:
    python pipeline/synthetic/generate_telemetry.py
    python pipeline/train/train_rul.py
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))  # ai-engine root
from app.services.maintenance_features import RUL_FEATURES, build_rul_features  # noqa: E402

HERE = Path(__file__).resolve().parent
DEFAULT_TELEMETRY = HERE.parent / "synthetic" / "out" / "telemetry.parquet"
OUT_DIR = HERE / "outputs" / "rul"


def load_telemetry(path: Path) -> pd.DataFrame:
    if not path.exists():
        raise SystemExit(f"Telemetry not found: {path}\nRun generate_telemetry.py first.")
    return pd.read_parquet(path) if path.suffix == ".parquet" else pd.read_csv(path)


def importances(model, X: pd.DataFrame) -> dict:
    """SHAP mean-|value| per feature if shap is available, else XGBoost gain."""
    try:
        import shap
        sample = X.sample(min(2000, len(X)), random_state=0)
        vals = shap.TreeExplainer(model).shap_values(sample)
        imp = np.abs(vals).mean(axis=0)
        return {"method": "shap", **{f: float(v) for f, v in zip(X.columns, imp)}}
    except Exception:  # noqa: BLE001 - shap optional
        booster = model.get_booster()
        score = booster.get_score(importance_type="gain")
        return {"method": "xgboost_gain", **{f: float(score.get(f, 0.0)) for f in X.columns}}


def main() -> int:
    from sklearn.metrics import mean_absolute_error, mean_squared_error
    from sklearn.model_selection import GroupShuffleSplit
    from xgboost import XGBRegressor

    ap = argparse.ArgumentParser(description="Train the RUL regressor.")
    ap.add_argument("--telemetry", type=Path, default=DEFAULT_TELEMETRY)
    ap.add_argument("--test-size", type=float, default=0.25)
    args = ap.parse_args()

    df = load_telemetry(args.telemetry)
    X, y, groups = build_rul_features(df)
    print(f"Features: {len(X):,} rows x {X.shape[1]} cols, {groups.nunique()} facilities")

    splitter = GroupShuffleSplit(n_splits=1, test_size=args.test_size, random_state=0)
    train_idx, test_idx = next(splitter.split(X, y, groups))
    Xtr, Xte = X.iloc[train_idx], X.iloc[test_idx]
    ytr, yte = y.iloc[train_idx], y.iloc[test_idx]

    model = XGBRegressor(
        n_estimators=400, max_depth=6, learning_rate=0.05,
        subsample=0.8, colsample_bytree=0.8, random_state=0, n_jobs=4,
    )
    model.fit(Xtr, ytr)

    pred = model.predict(Xte)
    mae = float(mean_absolute_error(yte, pred))
    rmse = float(np.sqrt(mean_squared_error(yte, pred)))
    # Baseline: predict the training mean RUL.
    base_mae = float(mean_absolute_error(yte, np.full_like(yte, ytr.mean(), dtype=float)))
    print(f"Test MAE: {mae:.1f} days (baseline {base_mae:.1f}) | RMSE: {rmse:.1f}")

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    model.get_booster().save_model(str(OUT_DIR / "model.json"))
    (OUT_DIR / "feature_names.json").write_text(json.dumps(RUL_FEATURES, indent=2))
    (OUT_DIR / "metrics.json").write_text(json.dumps(
        {"mae_days": mae, "rmse_days": rmse, "baseline_mae_days": base_mae,
         "n_train": len(Xtr), "n_test": len(Xte)}, indent=2))
    (OUT_DIR / "importances.json").write_text(json.dumps(importances(model, Xtr), indent=2))
    print(f"Saved RUL model + metrics -> {OUT_DIR}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
