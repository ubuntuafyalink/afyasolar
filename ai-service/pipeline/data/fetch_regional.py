"""
Fast NASA POWER daily fetch via the REGIONAL endpoint, streamed into ONE CSV.

The point endpoint throttles concurrency (a 45-year point request is ~85s and
parallel ones stall). The regional endpoint returns a whole <=10deg box in ~7s
and tolerates concurrency, so we fetch (tile x parameter x year) in parallel and
assemble each of our target grid points from its nearest 0.5x0.625deg cell.

Regional constraints: 1 parameter, <=366 days, <=10deg box per request.

Memory-safe: processes one latitude band at a time and appends that band's rows
to the output CSV, so peak memory stays ~1 band's worth.

Output: dataset/nasa_east_africa_daily_<start>_present.csv
    columns: location_id, date (YYYY-MM-DD), variable, value  (long/tidy format)

Usage:
    python pipeline/data/fetch_regional.py                 # 2000-01-01 -> present
    python pipeline/data/fetch_regional.py --start-year 1990 --workers 8
"""
from __future__ import annotations

import argparse
import csv
import json
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import date, timedelta
from pathlib import Path

import requests

HERE = Path(__file__).resolve().parent
AI_SERVICE = HERE.parents[1]
DATASET_DIR = AI_SERVICE / "dataset"

URL = "https://power.larc.nasa.gov/api/temporal/daily/regional"
PARAMS = ["ALLSKY_SFC_SW_DWN", "T2M", "T2M_MAX", "T2M_MIN", "PRECTOTCORR", "WS10M", "RH2M"]
FILL = -999.0

# East Africa box, split into <=10deg tiles (bands x lon tiles). Slight padding so
# every integer-degree target has a nearby cell on each side.
LAT_BANDS = [(-17.0, -7.0), (-7.0, 3.0), (3.0, 6.0)]
LON_TILES = [(29.0, 39.0), (38.0, 42.0)]


def default_end() -> str:
    return (date.today() - timedelta(days=10)).strftime("%Y%m%d")


def fetch_regional(lat0, lat1, lon0, lon1, param, yr, end_last, retries=4):
    start = f"{yr}0101"
    end = f"{yr}1231" if yr < int(end_last[:4]) else end_last
    p = {"parameters": param, "community": "RE",
         "latitude-min": lat0, "latitude-max": lat1,
         "longitude-min": lon0, "longitude-max": lon1,
         "start": start, "end": end, "format": "JSON"}
    last = None
    for a in range(1, retries + 1):
        try:
            r = requests.get(URL, params=p, timeout=(20, 150))
            if r.status_code == 200:
                return r.json().get("features", [])
            if r.status_code in (429, 500, 502, 503, 504):
                last = f"HTTP {r.status_code}"
            else:
                r.raise_for_status()
        except Exception as e:  # noqa: BLE001
            last = str(e)
        time.sleep(min(30, 2 ** a))
    raise RuntimeError(f"regional {param} {yr} [{lat0},{lat1}]x[{lon0},{lon1}]: {last}")


def cell_key(lat, lon):
    return (round(float(lat), 4), round(float(lon), 4))


def nearest(cells, lat, lon):
    """Nearest cell key to (lat,lon) by squared lat/lon distance."""
    return min(cells, key=lambda c: (c[0] - lat) ** 2 + (c[1] - lon) ** 2)


def main() -> int:
    ap = argparse.ArgumentParser(description="Regional NASA POWER fetch -> single CSV.")
    ap.add_argument("--locations", type=Path, default=DATASET_DIR / "grid_locations.json")
    ap.add_argument("--start-year", type=int, default=2000)
    ap.add_argument("--end", default=None, help="YYYYMMDD (default ~today-10d)")
    ap.add_argument("--workers", type=int, default=8)
    ap.add_argument("--out", type=Path, default=None)
    args = ap.parse_args()

    end_last = args.end or default_end()
    end_year = int(end_last[:4])
    years = list(range(args.start_year, end_year + 1))
    out = args.out or DATASET_DIR / f"nasa_east_africa_daily_{args.start_year}_present.csv"

    targets = json.loads(args.locations.read_text(encoding="utf-8"))["locations"]
    # Assign each target to exactly one latitude band.
    def band_of(lat):
        for i, (a, b) in enumerate(LAT_BANDS):
            if a <= lat < b or (i == len(LAT_BANDS) - 1 and lat <= b):
                return i
        return None
    by_band: dict[int, list[dict]] = {i: [] for i in range(len(LAT_BANDS))}
    for t in targets:
        bi = band_of(t["lat"])
        if bi is not None:
            by_band[bi].append(t)

    print(f"{len(targets)} targets, {len(years)} years ({args.start_year}..{end_year}), "
          f"{len(PARAMS)} params, {args.workers} workers -> {out.name}", flush=True)

    out.parent.mkdir(parents=True, exist_ok=True)
    total_rows = 0
    t0 = time.time()
    with out.open("w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh)
        w.writerow(["location_id", "date", "variable", "value"])

        for bi, (la0, la1) in enumerate(LAT_BANDS):
            band_targets = by_band[bi]
            if not band_targets:
                continue
            tiles = [(la0, la1, lo0, lo1) for (lo0, lo1) in LON_TILES]

            # acc[param][cell_key] = {yyyymmdd: value}. Keyed by param first because
            # solar (ALLSKY) sits on a coarser 1deg grid than the 0.5x0.625deg
            # meteorology grid, so nearest-cell must be resolved per parameter.
            acc: dict[str, dict[tuple, dict[str, float]]] = {}
            tasks = [(t, param, yr) for t in tiles for param in PARAMS for yr in years]
            print(f"\n[band {bi+1}/{len(LAT_BANDS)}] lat[{la0}..{la1}] "
                  f"{len(band_targets)} targets, {len(tasks)} requests", flush=True)

            done = 0
            with ThreadPoolExecutor(max_workers=args.workers) as ex:
                futs = {ex.submit(fetch_regional, t[0], t[1], t[2], t[3], param, yr, end_last): None
                        for (t, param, yr) in tasks}
                for fut in as_completed(futs):
                    feats = fut.result()
                    for f in feats:
                        lon, lat = f["geometry"]["coordinates"][0], f["geometry"]["coordinates"][1]
                        k = cell_key(lat, lon)
                        par = f["properties"]["parameter"]
                        for pname, series in par.items():
                            acc.setdefault(pname, {}).setdefault(k, {}).update(series)
                    done += 1
                    if done % 40 == 0 or done == len(tasks):
                        print(f"  band {bi+1}: {done}/{len(tasks)} requests "
                              f"({(time.time()-t0)/60:.1f} min)", flush=True)

            # Map each band target to its nearest fetched cell PER PARAMETER
            # (grids differ between solar and meteorology), then write its rows.
            per_param_cells = {p: list(acc.get(p, {}).keys()) for p in PARAMS}
            for t in band_targets:
                for pname in PARAMS:
                    cells_p = per_param_cells[pname]
                    if not cells_p:
                        continue
                    k = nearest(cells_p, t["lat"], t["lon"])
                    for ymd, val in sorted(acc[pname][k].items()):
                        v = "" if val == FILL else val
                        w.writerow([t["id"],
                                    f"{ymd[:4]}-{ymd[4:6]}-{ymd[6:]}", pname, v])
                        total_rows += 1
            acc.clear()

    size_mb = out.stat().st_size / 1e6
    print(f"\nDONE: {total_rows:,} rows -> {out} ({size_mb:.1f} MB) in {(time.time()-t0)/60:.1f} min",
          flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
