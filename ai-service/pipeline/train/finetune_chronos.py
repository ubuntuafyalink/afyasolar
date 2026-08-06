"""
Fine-tune Chronos-Bolt on the NASA climate series with AutoGluon-TimeSeries.

For each horizon in ``config.yaml`` this trains one ``TimeSeriesPredictor`` that
holds three models so the fine-tune's value is measurable in one leaderboard:

    SeasonalNaive  |  Chronos-Bolt ZeroShot  |  Chronos-Bolt FineTuned

AutoGluon does a rolling-origin backtest internally (``num_val_windows``) and
scores every model with the chosen metric (WQL by default), so the leaderboard
*is* the comparison against the baseline.

Inputs : datasets/processed/{daily,monthly}.{parquet,csv}  (from build_dataset.py)
Outputs: ml/train/outputs/<horizon>/  (saved predictor + leaderboard.csv)

Run on a GPU (free Google Colab is enough):
    pip install -r ml/train/requirements.txt
    python ml/train/finetune_chronos.py                 # both horizons
    python ml/train/finetune_chronos.py --horizon monthly --format csv
"""
from __future__ import annotations

import argparse
from pathlib import Path

import pandas as pd
import yaml
from autogluon.timeseries import TimeSeriesDataFrame, TimeSeriesPredictor

HERE = Path(__file__).resolve().parent
ML_ROOT = HERE.parent
DEFAULT_PROCESSED = ML_ROOT / "datasets" / "processed"


def load_config(path: Path) -> dict:
    return yaml.safe_load(path.read_text(encoding="utf-8"))


def load_series(processed_dir: Path, name: str, fmt: str) -> pd.DataFrame:
    path = processed_dir / f"{name}.{fmt}"
    if not path.exists():
        raise SystemExit(
            f"Dataset not found: {path}\n"
            "Run ml/data/fetch_nasa.py then ml/datasets/build_dataset.py first."
        )
    df = pd.read_parquet(path) if fmt == "parquet" else pd.read_csv(path, parse_dates=["timestamp"])
    df["timestamp"] = pd.to_datetime(df["timestamp"])
    return df[["item_id", "timestamp", "target"]]


def to_tsdf(df: pd.DataFrame) -> TimeSeriesDataFrame:
    return TimeSeriesDataFrame.from_data_frame(
        df, id_column="item_id", timestamp_column="timestamp"
    )


def build_hyperparameters(model_cfg: dict) -> dict:
    """SeasonalNaive baseline + Chronos zero-shot + Chronos fine-tuned."""
    base = {"model_path": model_cfg["chronos_model"]}
    zero_shot = {**base, "ag_args": {"name_suffix": "ZeroShot"}}
    fine_tuned = {
        **base,
        "fine_tune": bool(model_cfg.get("fine_tune", True)),
        "fine_tune_steps": int(model_cfg.get("fine_tune_steps", 2000)),
        "fine_tune_lr": float(model_cfg.get("fine_tune_lr", 1e-4)),
        "ag_args": {"name_suffix": "FineTuned"},
    }
    return {"SeasonalNaive": {}, "Chronos": [zero_shot, fine_tuned]}


def run_horizon(name: str, hcfg: dict, cfg: dict, processed_dir: Path, fmt: str) -> pd.DataFrame:
    print(f"\n=== Horizon: {name} (H={hcfg['prediction_length']}, freq={hcfg['freq']}) ===")
    tsdf = to_tsdf(load_series(processed_dir, hcfg["dataset"], fmt))
    print(f"  {tsdf.num_items} series, {len(tsdf)} observations")

    out_dir = HERE / cfg["train"]["output_dir"] / name
    predictor = TimeSeriesPredictor(
        prediction_length=int(hcfg["prediction_length"]),
        freq=hcfg["freq"],
        eval_metric=hcfg.get("eval_metric", "WQL"),
        target="target",
        path=str(out_dir),
    )
    predictor.fit(
        tsdf,
        hyperparameters=build_hyperparameters(cfg["model"]),
        num_val_windows=int(cfg["train"].get("num_val_windows", 3)),
        time_limit=cfg["train"].get("time_limit"),
        enable_ensemble=False,  # keep models comparable, not blended
    )

    leaderboard = predictor.leaderboard()
    out_dir.mkdir(parents=True, exist_ok=True)
    leaderboard.to_csv(out_dir / "leaderboard.csv", index=False)
    print(f"\n  Leaderboard ({name}) - saved to {out_dir / 'leaderboard.csv'}:")
    print(leaderboard.to_string(index=False))
    return leaderboard


def main() -> int:
    ap = argparse.ArgumentParser(description="Fine-tune Chronos-Bolt on NASA series.")
    ap.add_argument("--config", type=Path, default=HERE / "config.yaml")
    ap.add_argument("--processed-dir", type=Path, default=DEFAULT_PROCESSED)
    ap.add_argument("--horizon", choices=["daily", "monthly", "both"], default="both")
    ap.add_argument("--format", choices=["parquet", "csv"], default="parquet")
    args = ap.parse_args()

    cfg = load_config(args.config)
    horizons = cfg["horizons"]
    names = list(horizons) if args.horizon == "both" else [args.horizon]

    for name in names:
        run_horizon(name, horizons[name], cfg, args.processed_dir, args.format)

    print("\nDone. Predictors saved under ml/train/outputs/. "
          "Run ml/eval/backtest.py for the detailed per-variable report.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
