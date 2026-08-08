"""
Fetch NASA POWER daily climate data for every point in a grid ``locations.json``,
in PARALLEL (the per-request latency is network-bound — NASA POWER takes ~80s to
generate 45 years of daily data — so concurrency is the only way to make ~275
points practical).

Reuses the tested request/flatten/save helpers from ``fetch_nasa.py``. Writes one
Parquet per point under ``--out-dir`` (resumable: existing files are skipped),
then combines them into a single ``nasa_daily_all.parquet`` with a memory-safe
incremental writer.

Usage:
    python pipeline/data/fetch_grid.py                          # dataset/grid_locations.json -> dataset/raw
    python pipeline/data/fetch_grid.py --workers 8 --start 19810101
    python pipeline/data/fetch_grid.py --combine-only           # just rebuild the combined file
"""
from __future__ import annotations

import argparse
import json
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

import pandas as pd
import pyarrow as pa
import pyarrow.parquet as pq

from fetch_nasa import fetch_point, to_long_frame, default_end  # reuse tested helpers

HERE = Path(__file__).resolve().parent
AI_SERVICE = HERE.parents[1]
DATASET_DIR = AI_SERVICE / "dataset"


def load_locations(path: Path) -> list[dict]:
    return json.loads(path.read_text(encoding="utf-8"))["locations"]


def fetch_one(loc: dict, start: str, end: str, out_dir: Path, force: bool) -> dict:
    out_path = out_dir / f"{loc['id']}.parquet"
    if out_path.exists() and not force:
        return {"id": loc["id"], "status": "cached"}
    try:
        # (connect, read) timeout: fail fast on a saturated connect, allow slow reads.
        parameter = fetch_point(loc["lat"], loc["lon"], start, end, timeout=(20, 180))
        df = to_long_frame(loc["id"], parameter)
        df.to_parquet(out_path, index=False)
        return {"id": loc["id"], "status": "ok", "days": int(df["date"].nunique()),
                "miss": float(df["value"].isna().mean() * 100)}
    except Exception as err:  # noqa: BLE001 - report and continue
        return {"id": loc["id"], "status": "failed", "error": str(err)}


def combine(out_dir: Path, combined_path: Path) -> None:
    """Concatenate every per-point parquet into one file, streaming to keep memory flat."""
    files = sorted(p for p in out_dir.glob("*.parquet") if p.name != combined_path.name)
    if not files:
        print("No per-point files to combine.")
        return
    writer: pq.ParquetWriter | None = None
    total = 0
    try:
        for p in files:
            table = pq.read_table(p)
            if writer is None:
                writer = pq.ParquetWriter(combined_path, table.schema, compression="snappy")
            writer.write_table(table)
            total += table.num_rows
    finally:
        if writer is not None:
            writer.close()
    size_mb = combined_path.stat().st_size / 1e6
    print(f"Combined {len(files)} points, {total:,} rows -> {combined_path} ({size_mb:.1f} MB)")


def main() -> int:
    ap = argparse.ArgumentParser(description="Parallel NASA POWER grid fetch.")
    ap.add_argument("--locations", type=Path, default=DATASET_DIR / "grid_locations.json")
    ap.add_argument("--out-dir", type=Path, default=DATASET_DIR / "raw")
    ap.add_argument("--start", default="19810101", help="YYYYMMDD (default 19810101 — max history)")
    ap.add_argument("--end", default=None, help="YYYYMMDD (default ~today-10d)")
    ap.add_argument("--workers", type=int, default=6, help="concurrent requests (default 6)")
    ap.add_argument("--force", action="store_true", help="refetch even if a point file exists")
    ap.add_argument("--combine-only", action="store_true", help="skip fetching, just rebuild combined file")
    args = ap.parse_args()

    args.out_dir.mkdir(parents=True, exist_ok=True)
    combined_path = args.out_dir / "nasa_daily_all.parquet"

    if args.combine_only:
        combine(args.out_dir, combined_path)
        return 0

    end = args.end or default_end()
    locations = load_locations(args.locations)
    todo = [l for l in locations if args.force or not (args.out_dir / f"{l['id']}.parquet").exists()]
    print(f"{len(locations)} grid points ({args.start}..{end}); {len(todo)} to fetch, "
          f"{len(locations) - len(todo)} cached. Workers={args.workers}\n")

    ok = failed = 0
    failures: list[str] = []
    t0 = time.time()
    with ThreadPoolExecutor(max_workers=args.workers) as ex:
        futures = {ex.submit(fetch_one, l, args.start, end, args.out_dir, args.force): l for l in todo}
        for i, fut in enumerate(as_completed(futures), 1):
            r = fut.result()
            if r["status"] == "ok":
                ok += 1
                print(f"[{i}/{len(todo)}] {r['id']}: {r['days']} days, {r['miss']:.1f}% missing")
            elif r["status"] == "failed":
                failed += 1
                failures.append(r["id"])
                print(f"[{i}/{len(todo)}] {r['id']}: FAILED — {r['error']}", file=sys.stderr)
    dt = time.time() - t0
    print(f"\nFetched {ok} ok, {failed} failed in {dt/60:.1f} min.")
    if failures:
        print(f"Failed points (re-run to resume): {', '.join(failures)}", file=sys.stderr)

    combine(args.out_dir, combined_path)
    print("Done.")
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
