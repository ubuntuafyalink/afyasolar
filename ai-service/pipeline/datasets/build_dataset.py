"""
Turn the raw NASA POWER download into clean, split, Chronos-ready series.

Reads the long-format Parquet produced by ``ml/data/fetch_nasa.py`` and emits
two tidy datasets (one per resolution, since we train both horizons):

  * ``daily.parquet``   - one row per (location, variable, day)
  * ``monthly.parquet`` - one row per (location, variable, month)

Both use the schema Chronos fine-tuning expects after a trivial group-by:
``[item_id, timestamp, target, location_id, variable, freq, split]`` where
``item_id = "<location>|<variable>|<freq>"`` identifies a single series and
``split`` is ``train`` or ``val`` (the final holdout window used for backtesting).

Cleaning per series: reindex onto a complete calendar, linearly interpolate
short gaps (<= ``--max-gap`` days), and trim leading/trailing missing values so
each series is contiguous for training.

Monthly aggregation: precipitation is summed (monthly total mm); every other
variable is averaged.

Usage:
    python build_dataset.py
    python build_dataset.py --val-days 60 --val-months 12 --max-gap 5
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
import pandas as pd

HERE = Path(__file__).resolve().parent
DEFAULT_RAW_DIR = HERE.parent / "data" / "raw"

# Monthly aggregation rule per variable. Precip accumulates; the rest average.
SUM_VARIABLES = {"PRECTOTCORR"}


def resolve_raw(raw_arg: Path | None) -> Path:
    """Locate the combined raw file, preferring parquet then csv."""
    if raw_arg is not None:
        return raw_arg
    for ext in ("parquet", "csv"):
        p = DEFAULT_RAW_DIR / f"nasa_daily_all.{ext}"
        if p.exists():
            return p
    return DEFAULT_RAW_DIR / "nasa_daily_all.parquet"


def read_raw(path: Path) -> pd.DataFrame:
    if path.suffix == ".parquet":
        return pd.read_parquet(path)
    return pd.read_csv(path, parse_dates=["date"])


def write_df(df: pd.DataFrame, path_no_ext: Path, fmt: str) -> Path:
    path = path_no_ext.with_suffix(f".{fmt}")
    if fmt == "parquet":
        df.to_parquet(path, index=False)
    else:
        df.to_csv(path, index=False)
    return path


def clean_series(g: pd.DataFrame, max_gap: int) -> pd.DataFrame:
    """Reindex one (location, variable) group to a full daily calendar and fill
    short gaps. Returns a frame with a contiguous ``date`` / ``value``."""
    g = g.sort_values("date").drop_duplicates("date")
    full = pd.date_range(g["date"].min(), g["date"].max(), freq="D")
    s = g.set_index("date")["value"].astype("float64").reindex(full)
    # Interpolate only short gaps; longer outages stay NaN and are trimmed below.
    s = s.interpolate(method="time", limit=max_gap, limit_area="inside")
    s = s.loc[s.first_valid_index(): s.last_valid_index()]
    s = s.rename("value")
    s.index.name = "date"
    return s.reset_index()


def build_daily(raw: pd.DataFrame, max_gap: int) -> pd.DataFrame:
    frames: list[pd.DataFrame] = []
    for (loc, var), g in raw.groupby(["location_id", "variable"], sort=False):
        c = clean_series(g, max_gap)
        if c.empty:
            continue
        c["location_id"] = loc
        c["variable"] = var
        frames.append(c)
    daily = pd.concat(frames, ignore_index=True)
    daily["freq"] = "D"
    daily = daily.rename(columns={"date": "timestamp", "value": "target"})
    daily["item_id"] = daily["location_id"] + "|" + daily["variable"] + "|D"
    return daily


def build_monthly(daily: pd.DataFrame) -> pd.DataFrame:
    frames: list[pd.DataFrame] = []
    for (loc, var), g in daily.groupby(["location_id", "variable"], sort=False):
        agg = "sum" if var in SUM_VARIABLES else "mean"
        m = (
            g.set_index("timestamp")["target"]
            .resample("MS")  # month-start timestamps
            .agg(agg)
            .rename("target")
            .reset_index()
        )
        m["location_id"] = loc
        m["variable"] = var
        frames.append(m)
    monthly = pd.concat(frames, ignore_index=True)
    monthly["freq"] = "M"
    monthly["item_id"] = monthly["location_id"] + "|" + monthly["variable"] + "|M"
    return monthly


def mark_split(df: pd.DataFrame, holdout: int) -> pd.DataFrame:
    """Label the final ``holdout`` observations of each series as ``val``."""
    df = df.sort_values(["item_id", "timestamp"]).copy()
    rank_from_end = df.groupby("item_id").cumcount(ascending=False)
    df["split"] = np.where(rank_from_end < holdout, "val", "train")
    return df


def summarize(df: pd.DataFrame, freq: str) -> list[dict]:
    rows = []
    for item_id, g in df.groupby("item_id"):
        rows.append({
            "item_id": item_id,
            "freq": freq,
            "n": int(len(g)),
            "start": g["timestamp"].min().strftime("%Y-%m-%d"),
            "end": g["timestamp"].max().strftime("%Y-%m-%d"),
            "n_val": int((g["split"] == "val").sum()),
        })
    return rows


def main() -> int:
    ap = argparse.ArgumentParser(description="Build Chronos-ready NASA datasets.")
    ap.add_argument("--raw", type=Path, default=None,
                    help="combined raw file (default: auto-detect parquet/csv)")
    ap.add_argument("--out-dir", type=Path, default=HERE / "processed")
    ap.add_argument("--format", choices=["parquet", "csv"], default="parquet",
                    help="output format (default parquet)")
    ap.add_argument("--max-gap", type=int, default=5,
                    help="max consecutive missing days to interpolate (default 5)")
    ap.add_argument("--val-days", type=int, default=60,
                    help="daily holdout length for backtesting (default 60)")
    ap.add_argument("--val-months", type=int, default=12,
                    help="monthly holdout length for backtesting (default 12)")
    args = ap.parse_args()

    raw_path = resolve_raw(args.raw)
    if not raw_path.exists():
        raise SystemExit(f"Raw file not found: {raw_path}\nRun ml/data/fetch_nasa.py first.")

    args.out_dir.mkdir(parents=True, exist_ok=True)
    raw = read_raw(raw_path)
    raw["value"] = pd.to_numeric(raw["value"], errors="coerce")
    print(f"Loaded {len(raw):,} raw rows, "
          f"{raw['location_id'].nunique()} locations, "
          f"{raw['variable'].nunique()} variables")

    daily = mark_split(build_daily(raw, args.max_gap), args.val_days)
    monthly = mark_split(build_monthly(daily), args.val_months)

    cols = ["item_id", "timestamp", "target", "location_id", "variable", "freq", "split"]
    write_df(daily[cols], args.out_dir / "daily", args.format)
    write_df(monthly[cols], args.out_dir / "monthly", args.format)

    summary = {
        "daily": summarize(daily, "D"),
        "monthly": summarize(monthly, "M"),
        "config": {"max_gap": args.max_gap,
                   "val_days": args.val_days,
                   "val_months": args.val_months},
    }
    (args.out_dir / "dataset_summary.json").write_text(
        json.dumps(summary, indent=2), encoding="utf-8")

    print(f"daily:   {len(daily):,} rows, {daily['item_id'].nunique()} series")
    print(f"monthly: {len(monthly):,} rows, {monthly['item_id'].nunique()} series")
    print(f"Wrote datasets + dataset_summary.json to {args.out_dir}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
