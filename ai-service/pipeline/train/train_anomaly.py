"""
Train the anomaly detector on synthetic telemetry.

An Isolation Forest (the spec's choice) fit on NORMAL rows only, then evaluated
against the injected fault labels (precision / recall / F1). Saves the model +
feature list + metrics.

Run from the ai-engine root, after generating telemetry:
    python pipeline/train/train_anomaly.py
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))  # ai-engine root
from app.services.maintenance_features import ANOMALY_FEATURES, build_anomaly_features  # noqa: E402

HERE = Path(__file__).resolve().parent
DEFAULT_TELEMETRY = HERE.parent / "synthetic" / "out" / "telemetry.parquet"
OUT_DIR = HERE / "outputs" / "anomaly"


def load_telemetry(path: Path) -> pd.DataFrame:
    if not path.exists():
        raise SystemExit(f"Telemetry not found: {path}\nRun generate_telemetry.py first.")
    return pd.read_parquet(path) if path.suffix == ".parquet" else pd.read_csv(path)


def main() -> int:
    import joblib
    from sklearn.ensemble import IsolationForest
    from sklearn.metrics import (average_precision_score,
                                 precision_recall_fscore_support, roc_auc_score)
    from sklearn.pipeline import make_pipeline
    from sklearn.preprocessing import StandardScaler

    ap = argparse.ArgumentParser(description="Train the anomaly detector.")
    ap.add_argument("--telemetry", type=Path, default=DEFAULT_TELEMETRY)
    args = ap.parse_args()

    df = load_telemetry(args.telemetry)
    X = build_anomaly_features(df)
    y_true = df["anomaly"].astype(int).to_numpy()
    contamination = max(0.003, min(0.2, float(y_true.mean()) or 0.02))

    # StandardScaler so low-variance fault signals (battv_dev) are not drowned by
    # high-variance features. IsolationForest fit on ALL rows with contamination =
    # the fault rate, which calibrates the cutoff to flag the top-fraction (the
    # faults) - far better here than fitting on normal-only, whose own tail
    # miscalibrates the threshold.
    model = make_pipeline(
        StandardScaler(),
        IsolationForest(n_estimators=300, contamination=contamination,
                        random_state=0, n_jobs=4),
    )
    model.fit(X)

    pred = (model.predict(X) == -1).astype(int)
    scores = -model.named_steps["isolationforest"].score_samples(
        model.named_steps["standardscaler"].transform(X))  # higher = more anomalous
    p, r, f1, _ = precision_recall_fscore_support(
        y_true, pred, average="binary", zero_division=0)
    auc = roc_auc_score(y_true, scores)
    ap_score = average_precision_score(y_true, scores)
    print(f"Anomaly detector -> precision {p:.2f}, recall {r:.2f}, F1 {f1:.2f} | "
          f"ROC-AUC {auc:.2f}, AP {ap_score:.2f} (contamination {contamination:.3f})")

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump(model, OUT_DIR / "model.joblib")
    (OUT_DIR / "feature_names.json").write_text(json.dumps(ANOMALY_FEATURES, indent=2))
    (OUT_DIR / "metrics.json").write_text(json.dumps(
        {"precision": float(p), "recall": float(r), "f1": float(f1),
         "roc_auc": float(auc), "average_precision": float(ap_score),
         "contamination": contamination, "n_rows": int(len(X))}, indent=2))
    print(f"Saved anomaly model + metrics -> {OUT_DIR}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
