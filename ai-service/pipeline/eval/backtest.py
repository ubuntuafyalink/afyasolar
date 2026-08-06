"""
Backtest a fine-tuned Chronos predictor and write a reviewer-friendly report.

Loads the ``TimeSeriesPredictor`` saved by ``finetune_chronos.py`` and produces,
per horizon:
  * the model leaderboard (SeasonalNaive vs Chronos ZeroShot vs FineTuned),
  * the fine-tuned model's improvement over the seasonal-naive baseline,
  * a per-variable metrics breakdown (WQL / MASE / RMSE) so we can see which
    climate signals forecast well.

Outputs a Markdown report + CSV under ml/train/outputs/<horizon>/.

Run after finetune_chronos.py (same environment):
    python ml/eval/backtest.py --horizon both --format parquet
"""
from __future__ import annotations

import argparse
from pathlib import Path

import pandas as pd
from autogluon.timeseries import TimeSeriesDataFrame, TimeSeriesPredictor

HERE = Path(__file__).resolve().parent
ML_ROOT = HERE.parent
DEFAULT_PROCESSED = ML_ROOT / "datasets" / "processed"
OUTPUTS = ML_ROOT / "train" / "outputs"

METRICS = ["WQL", "MASE", "RMSE"]


def load_series(processed_dir: Path, name: str, fmt: str) -> pd.DataFrame:
    path = processed_dir / f"{name}.{fmt}"
    if not path.exists():
        raise SystemExit(f"Dataset not found: {path}")
    df = pd.read_parquet(path) if fmt == "parquet" else pd.read_csv(path, parse_dates=["timestamp"])
    df["timestamp"] = pd.to_datetime(df["timestamp"])
    return df[["item_id", "timestamp", "target"]]


def to_tsdf(df: pd.DataFrame) -> TimeSeriesDataFrame:
    return TimeSeriesDataFrame.from_data_frame(df, id_column="item_id", timestamp_column="timestamp")


def variable_of(item_id: str) -> str:
    # item_id == "<location>|<VARIABLE>|<D|M>"
    parts = item_id.split("|")
    return parts[1] if len(parts) >= 2 else item_id


def subset_by_variable(tsdf: TimeSeriesDataFrame, variable: str) -> TimeSeriesDataFrame:
    ids = [i for i in tsdf.item_ids if variable_of(i) == variable]
    sub = tsdf[tsdf.index.get_level_values("item_id").isin(ids)]
    return TimeSeriesDataFrame(sub)


def improvement(leaderboard: pd.DataFrame, score_col: str) -> str:
    """Percent error reduction of the best model vs SeasonalNaive.

    AutoGluon scores are 'higher is better' (error metrics are negated), so the
    underlying error is abs(score)."""
    try:
        best = leaderboard.iloc[0]
        naive = leaderboard[leaderboard["model"].str.contains("SeasonalNaive", case=False)]
        if naive.empty:
            return "n/a (no baseline in leaderboard)"
        naive_err = abs(float(naive.iloc[0][score_col]))
        best_err = abs(float(best[score_col]))
        if naive_err == 0:
            return "n/a"
        pct = (naive_err - best_err) / naive_err * 100
        return f"{pct:+.1f}% vs SeasonalNaive (best model: {best['model']})"
    except Exception as err:  # noqa: BLE001
        return f"n/a ({err})"


def report_horizon(name: str, processed_dir: Path, fmt: str) -> None:
    model_dir = OUTPUTS / name
    if not model_dir.exists():
        print(f"skip {name}: no trained predictor at {model_dir}")
        return

    print(f"\n=== Backtest: {name} ===")
    predictor = TimeSeriesPredictor.load(str(model_dir))
    dataset_name = "daily" if name == "daily" else "monthly"
    tsdf = to_tsdf(load_series(processed_dir, dataset_name, fmt))

    leaderboard = predictor.leaderboard(tsdf)
    score_col = "score_test" if "score_test" in leaderboard.columns else "score_val"

    # Per-variable metrics for the best model.
    variables = sorted({variable_of(i) for i in tsdf.item_ids})
    rows = []
    for var in variables:
        sub = subset_by_variable(tsdf, var)
        try:
            scores = predictor.evaluate(sub, metrics=METRICS)
            rows.append({"variable": var, **{m: abs(float(scores[m])) for m in METRICS}})
        except Exception as err:  # noqa: BLE001 - report and continue
            rows.append({"variable": var, **{m: float("nan") for m in METRICS}, "error": str(err)})
    per_var = pd.DataFrame(rows)

    # Write artifacts.
    leaderboard.to_csv(model_dir / "leaderboard.csv", index=False)
    per_var.to_csv(model_dir / "per_variable_metrics.csv", index=False)

    lines = [
        f"# Backtest report - {name} horizon",
        "",
        f"Prediction length: **{predictor.prediction_length}**, "
        f"eval metric: **{predictor.eval_metric}**.",
        "",
        f"**Fine-tune value:** {improvement(leaderboard, score_col)}",
        "",
        "## Model leaderboard",
        "",
        "AutoGluon scores are higher-is-better (error metrics negated). "
        "SeasonalNaive is the baseline; the fine-tuned Chronos should beat it.",
        "",
        leaderboard.to_markdown(index=False),
        "",
        "## Per-variable metrics (best model, lower is better)",
        "",
        per_var.to_markdown(index=False),
        "",
    ]
    (model_dir / "backtest_report.md").write_text("\n".join(lines), encoding="utf-8")
    print(f"  wrote {model_dir / 'backtest_report.md'}")
    print(f"  fine-tune value: {improvement(leaderboard, score_col)}")


def main() -> int:
    ap = argparse.ArgumentParser(description="Backtest fine-tuned Chronos predictors.")
    ap.add_argument("--processed-dir", type=Path, default=DEFAULT_PROCESSED)
    ap.add_argument("--horizon", choices=["daily", "monthly", "both"], default="both")
    ap.add_argument("--format", choices=["parquet", "csv"], default="parquet")
    args = ap.parse_args()

    names = ["daily", "monthly"] if args.horizon == "both" else [args.horizon]
    for name in names:
        report_horizon(name, args.processed_dir, args.format)
    print("\nDone.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
