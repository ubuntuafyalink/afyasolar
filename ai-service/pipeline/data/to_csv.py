"""
Make a CSV copy of the fetched NASA POWER dataset (converted locally from the
per-point Parquet files — no re-fetching).

Parquet stays the pipeline's source of truth (smaller, typed, faster); CSV is a
human-readable / portable copy. Writes:
  - dataset/nasa_daily_all.csv        (combined, streamed point-by-point)
  - dataset/csv/<id>.csv              (per point, only with --per-point)

Usage:
    python pipeline/data/to_csv.py                 # combined CSV only
    python pipeline/data/to_csv.py --per-point     # + one CSV per grid point
"""
from __future__ import annotations

import argparse
from pathlib import Path

import pandas as pd

HERE = Path(__file__).resolve().parent
AI_SERVICE = HERE.parents[1]
DATASET_DIR = AI_SERVICE / "dataset"


def main() -> int:
    ap = argparse.ArgumentParser(description="Convert the Parquet dataset to CSV.")
    ap.add_argument("--raw-dir", type=Path, default=DATASET_DIR / "raw")
    ap.add_argument("--out", type=Path, default=DATASET_DIR / "nasa_daily_all.csv")
    ap.add_argument("--per-point", action="store_true", help="also write dataset/csv/<id>.csv")
    args = ap.parse_args()

    files = sorted(p for p in args.raw_dir.glob("*.parquet") if p.name != "nasa_daily_all.parquet")
    if not files:
        raise SystemExit(f"No per-point parquet files in {args.raw_dir}. Run fetch_grid.py first.")

    per_dir = DATASET_DIR / "csv"
    if args.per_point:
        per_dir.mkdir(parents=True, exist_ok=True)

    total = 0
    first = True
    with args.out.open("w", newline="", encoding="utf-8") as fh:
        for i, p in enumerate(files, 1):
            df = pd.read_parquet(p)                      # one point at a time -> memory-safe
            df.to_csv(fh, header=first, index=False)
            first = False
            total += len(df)
            if args.per_point:
                df.to_csv(per_dir / f"{p.stem}.csv", index=False)
            if i % 25 == 0 or i == len(files):
                print(f"  [{i}/{len(files)}] {total:,} rows written")

    size_mb = args.out.stat().st_size / 1e6
    print(f"Combined CSV: {args.out} ({size_mb:.1f} MB, {total:,} rows)")
    if args.per_point:
        print(f"Per-point CSVs: {per_dir}/ ({len(files)} files)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
