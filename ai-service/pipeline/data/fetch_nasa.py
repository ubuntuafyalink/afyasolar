"""
Fetch historical daily climate data from the NASA POWER API for every training
location in ``locations.json``.

This is the AfyaSolar ML data layer's entry point. It mirrors the variable set
and the ``community=RE`` choice the Next.js app already uses
(``src/lib/climate/nasa-power.ts``) so the models train on exactly the signals
the platform serves.

Output: one Parquet file per location under ``--out-dir`` (default ``raw/``),
in long format with columns ``[location_id, date, variable, value]``, plus a
combined ``nasa_daily_all.parquet``.

NASA POWER is a free, open, keyless API (https://power.larc.nasa.gov/). Be a
good citizen: this script requests one location at a time with a short pause and
retries transient failures.

Usage:
    python fetch_nasa.py                       # all locations, 1990-01-01..recent
    python fetch_nasa.py --start 20000101 --end 20241231
    python fetch_nasa.py --only tz-2,st-therese
"""
from __future__ import annotations

import argparse
import json
import sys
import time
from datetime import date, timedelta
from pathlib import Path

import pandas as pd
import requests

HERE = Path(__file__).resolve().parent


def save_df(df: pd.DataFrame, path_no_ext: Path, fmt: str) -> Path:
    """Write a frame as parquet (default) or csv. Parquet is preferred for the
    real pipeline; csv is a fallback for constrained environments and quick
    inspection."""
    path = path_no_ext.with_suffix(f".{fmt}")
    if fmt == "parquet":
        df.to_parquet(path, index=False)
    else:
        df.to_csv(path, index=False)
    return path


def read_cached(path: Path) -> pd.DataFrame:
    if path.suffix == ".parquet":
        return pd.read_parquet(path)
    return pd.read_csv(path, parse_dates=["date"])

# The 7 variables the pipeline trains on (superset of the app's current 4).
#   ALLSKY_SFC_SW_DWN  all-sky surface shortwave irradiance (kWh/m^2/day)  -> solar yield
#   T2M / T2M_MAX / T2M_MIN  air temperature at 2 m (C)                    -> heat hazard
#   PRECTOTCORR        bias-corrected precipitation (mm/day)               -> flood / drought
#   WS10M              wind speed at 10 m (m/s)                            -> storm
#   RH2M               relative humidity at 2 m (%)                        -> context feature
NASA_PARAMETERS = [
    "ALLSKY_SFC_SW_DWN",
    "T2M",
    "T2M_MAX",
    "T2M_MIN",
    "PRECTOTCORR",
    "WS10M",
    "RH2M",
]

NASA_ENDPOINT = "https://power.larc.nasa.gov/api/temporal/daily/point"
FILL_VALUE = -999.0  # NASA POWER's missing-data sentinel


def load_locations(path: Path) -> list[dict]:
    data = json.loads(path.read_text(encoding="utf-8"))
    return data["locations"]


def default_end() -> str:
    """NASA POWER lags real time by several days; back off 10 days to be safe."""
    return (date.today() - timedelta(days=10)).strftime("%Y%m%d")


def fetch_point(lat: float, lon: float, start: str, end: str,
                community: str = "RE", retries: int = 4,
                timeout: int = 60) -> dict[str, dict[str, float]]:
    """Return {variable: {YYYYMMDD: value}} for one coordinate, or raise."""
    params = {
        "parameters": ",".join(NASA_PARAMETERS),
        "community": community,
        "longitude": f"{lon}",
        "latitude": f"{lat}",
        "start": start,
        "end": end,
        "format": "JSON",
    }
    last_err: Exception | None = None
    for attempt in range(1, retries + 1):
        try:
            resp = requests.get(NASA_ENDPOINT, params=params, timeout=timeout)
            if resp.status_code == 200:
                payload = resp.json()
                return payload["properties"]["parameter"]
            # 429 / 5xx are transient; back off and retry.
            if resp.status_code in (429, 500, 502, 503, 504):
                last_err = RuntimeError(f"HTTP {resp.status_code}")
            else:
                resp.raise_for_status()
        except (requests.RequestException, ValueError, KeyError) as err:
            last_err = err
        sleep_s = min(30, 2 ** attempt)
        print(f"    retry {attempt}/{retries} after {sleep_s}s ({last_err})",
              file=sys.stderr)
        time.sleep(sleep_s)
    raise RuntimeError(f"NASA POWER request failed after {retries} tries: {last_err}")


def to_long_frame(location_id: str, parameter: dict[str, dict[str, float]]) -> pd.DataFrame:
    """Flatten the nested {var: {date: value}} into long tidy rows."""
    rows: list[dict] = []
    for variable, series in parameter.items():
        for yyyymmdd, value in series.items():
            rows.append({
                "location_id": location_id,
                "date": pd.to_datetime(yyyymmdd, format="%Y%m%d"),
                "variable": variable,
                # Convert the fill sentinel to a real missing value now, so every
                # downstream step treats gaps uniformly.
                "value": pd.NA if value == FILL_VALUE else float(value),
            })
    df = pd.DataFrame(rows)
    return df.sort_values(["variable", "date"]).reset_index(drop=True)


def main() -> int:
    ap = argparse.ArgumentParser(description="Fetch NASA POWER daily climate data.")
    ap.add_argument("--locations", type=Path, default=HERE / "locations.json")
    ap.add_argument("--out-dir", type=Path, default=HERE / "raw")
    ap.add_argument("--start", default="19900101", help="YYYYMMDD (default 19900101)")
    ap.add_argument("--end", default=None, help="YYYYMMDD (default: ~today-10d)")
    ap.add_argument("--only", default=None,
                    help="comma-separated location ids to fetch (default: all)")
    ap.add_argument("--pause", type=float, default=1.5,
                    help="seconds to sleep between locations (be polite)")
    ap.add_argument("--format", choices=["parquet", "csv"], default="parquet",
                    help="output format (default parquet)")
    ap.add_argument("--force", action="store_true",
                    help="refetch even if a location's file already exists")
    args = ap.parse_args()

    end = args.end or default_end()
    args.out_dir.mkdir(parents=True, exist_ok=True)

    locations = load_locations(args.locations)
    if args.only:
        wanted = {x.strip() for x in args.only.split(",")}
        locations = [l for l in locations if l["id"] in wanted]

    print(f"Fetching {len(locations)} locations x {len(NASA_PARAMETERS)} variables "
          f"({args.start}..{end}) into {args.out_dir}")

    combined: list[pd.DataFrame] = []
    failures: list[str] = []
    for i, loc in enumerate(locations, 1):
        out_path = args.out_dir / f"{loc['id']}.{args.format}"
        if out_path.exists() and not args.force:
            print(f"[{i}/{len(locations)}] {loc['id']}: cached, skip")
            combined.append(read_cached(out_path))
            continue
        print(f"[{i}/{len(locations)}] {loc['id']} ({loc['lat']},{loc['lon']}) ...")
        try:
            parameter = fetch_point(loc["lat"], loc["lon"], args.start, end)
            df = to_long_frame(loc["id"], parameter)
            written = save_df(df, args.out_dir / loc["id"], args.format)
            combined.append(df)
            n = df["date"].nunique()
            miss = df["value"].isna().mean() * 100
            print(f"    ok: {n} days, {miss:.1f}% missing -> {written.name}")
        except Exception as err:  # noqa: BLE001 - report and continue
            print(f"    FAILED: {err}", file=sys.stderr)
            failures.append(loc["id"])
        time.sleep(args.pause)

    if combined:
        all_df = pd.concat(combined, ignore_index=True)
        all_path = save_df(all_df, args.out_dir / "nasa_daily_all", args.format)
        print(f"Combined {len(all_df):,} rows -> {all_path}")

    if failures:
        print(f"WARNING: {len(failures)} locations failed: {', '.join(failures)}",
              file=sys.stderr)
        return 1
    print("Done.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
