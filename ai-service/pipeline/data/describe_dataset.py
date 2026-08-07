"""
Generate a human-readable data card (JSON) for the NASA POWER East Africa dataset.

Reads the CSV to compute real per-variable stats + coverage, merges them with
hand-written descriptions, and writes ``dataset/<csv>.info.json`` so a new user
can understand exactly what the data is, where it came from, and how to use it.

Usage:
    python pipeline/data/describe_dataset.py
    python pipeline/data/describe_dataset.py --csv dataset/other.csv
"""
from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd

HERE = Path(__file__).resolve().parent
DATASET_DIR = HERE.parents[1] / "dataset"

# Hand-written descriptions for the 7 NASA POWER parameters (RE community).
VARS = {
    "ALLSKY_SFC_SW_DWN": ("All-sky surface shortwave downward irradiance", "kWh/m^2/day",
                          "Sunlight reaching the ground; drives solar PV yield.", "~1 deg (satellite/CERES)"),
    "T2M": ("Air temperature at 2 m (mean)", "deg C", "Daily mean near-surface air temperature.", "0.5x0.625 deg (MERRA-2)"),
    "T2M_MAX": ("Air temperature at 2 m (daily max)", "deg C", "Daytime peak; drives the heat hazard index.", "0.5x0.625 deg (MERRA-2)"),
    "T2M_MIN": ("Air temperature at 2 m (daily min)", "deg C", "Overnight low near-surface temperature.", "0.5x0.625 deg (MERRA-2)"),
    "PRECTOTCORR": ("Precipitation (bias-corrected)", "mm/day", "Total daily rainfall; drives flood and drought indices.", "0.5x0.625 deg (MERRA-2)"),
    "WS10M": ("Wind speed at 10 m", "m/s", "Near-surface wind; drives the storm hazard index.", "0.5x0.625 deg (MERRA-2)"),
    "RH2M": ("Relative humidity at 2 m", "%", "Near-surface humidity; context feature.", "0.5x0.625 deg (MERRA-2)"),
}


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--csv", type=Path, default=DATASET_DIR / "nasa_east_africa_daily_2000_present.csv")
    ap.add_argument("--locations", type=Path, default=DATASET_DIR / "grid_locations.json")
    ap.add_argument("--out", type=Path, default=None)
    args = ap.parse_args()
    out = args.out or args.csv.with_suffix(".info.json")

    print(f"Reading {args.csv} ...", flush=True)
    df = pd.read_csv(args.csv, parse_dates=["date"])
    locs = json.loads(args.locations.read_text(encoding="utf-8"))["locations"]
    lats = [l["lat"] for l in locs]
    lons = [l["lon"] for l in locs]

    # Per-variable real statistics.
    variables = []
    for name, (label, unit, desc, grid) in VARS.items():
        v = df.loc[df.variable == name, "value"]
        variables.append({
            "name": name, "label": label, "unit": unit, "description": desc,
            "native_grid": grid,
            "stats": {
                "count": int(v.notna().sum()),
                "missing_pct": round(float(v.isna().mean()) * 100, 3),
                "min": round(float(v.min()), 2),
                "max": round(float(v.max()), 2),
                "mean": round(float(v.mean()), 2),
            },
        })

    size_mb = round(args.csv.stat().st_size / 1e6, 1)
    card = {
        "dataset": {
            "name": "NASA POWER — East Africa Daily Climate (2000–present)",
            "file": args.csv.name,
            "format": "CSV, long/tidy (one row per location × date × variable)",
            "encoding": "utf-8",
            "rows": int(len(df)),
            "size_mb": size_mb,
            "generated_utc": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "description": (
                "Daily historical climate for a 1-degree land grid over East Africa, from the "
                "NASA POWER reanalysis. Built to fine-tune the AfyaSolar climate forecaster "
                "(Chronos-Bolt): the model forecasts these raw variables and the app derives "
                "climate-hazard indices (heat/flood/storm/drought) and solar yield from them."
            ),
            "license": "NASA POWER data are free and openly available (U.S. Government, public domain). https://power.larc.nasa.gov/",
        },
        "source": {
            "provider": "NASA POWER (Prediction Of Worldwide Energy Resources), NASA Langley Research Center",
            "endpoint": "https://power.larc.nasa.gov/api/temporal/daily/regional",
            "community": "RE (Renewable Energy)",
            "keyless": True,
            "note": "Meteorology is from MERRA-2; solar (ALLSKY_SFC_SW_DWN) is satellite-derived on a coarser grid.",
        },
        "schema": {
            "columns": [
                {"name": "location_id", "type": "string",
                 "description": "Grid point id, format 'ea_<lat>_<lon>' where 'm' marks a minus sign "
                                "(e.g. 'ea_m6_39' = latitude -6, longitude 39)."},
                {"name": "date", "type": "date (YYYY-MM-DD)", "description": "Calendar day (UTC-aggregated)."},
                {"name": "variable", "type": "string", "description": "NASA POWER parameter name (one of 7)."},
                {"name": "value", "type": "float", "description": "Daily value in the variable's unit; empty cell = missing."},
            ],
            "long_format": "One row per (location_id, date, variable). To get a wide table: "
                           "df.pivot_table(index=['location_id','date'], columns='variable', values='value')",
        },
        "spatial": {
            "region": "East Africa (Tanzania + Kenya, Uganda, Rwanda, Burundi, Malawi, northern Mozambique border zones)",
            "grid": "1-degree land grid (ocean cells removed with a land mask)",
            "n_points": len(locs),
            "bbox": {"lat_min": min(lats), "lat_max": max(lats), "lon_min": min(lons), "lon_max": max(lons)},
            "point_assembly": "Each grid point's series is taken from NASA POWER's nearest NATIVE cell, resolved "
                              "PER variable (meteorology 0.5x0.625 deg, solar ~1 deg).",
            "note_on_facilities": "Intentionally NOT built from facility coordinates — a clean geographic grid "
                                  "avoids facility-location errors and gives diverse, decoupled training series. "
                                  "At inference a facility maps to its nearest grid point.",
        },
        "temporal": {
            "start": str(df.date.min().date()),
            "end": str(df.date.max().date()),
            "frequency": "daily",
            "n_days": int(df.date.nunique()),
            "timezone": "UTC (POWER daily values are UTC-day aggregates)",
        },
        "variables": variables,
        "quality": {
            "overall_missing_pct": round(float(df.value.isna().mean()) * 100, 3),
            "missing_value_encoding": "empty cell (NASA POWER's -999 fill sentinel is converted to empty)",
            "rows_per_variable": int(df.variable.value_counts().iloc[0]),
            "balanced": bool(df.variable.value_counts().nunique() == 1),
        },
        "provenance": {
            "grid_definition": "pipeline/data/make_grid.py -> dataset/grid_locations.json",
            "fetcher": "pipeline/data/fetch_regional.py (regional endpoint, concurrent, band-by-band)",
            "this_card": "pipeline/data/describe_dataset.py",
        },
        "usage": {
            "intended_use": "Fine-tune Chronos-Bolt (AutoGluon-TimeSeries) to forecast the raw variables.",
            "next_step": "pipeline/datasets/build_dataset.py turns this into per-series item_id|timestamp|target "
                         "(daily + monthly), with gap-filling and a validation split.",
            "load_python": "import pandas as pd; df = pd.read_csv('%s', parse_dates=['date'])" % args.csv.name,
            "caveats": [
                "Reanalysis/model-derived data, not station observations — excellent coverage, but smoothed vs point measurements.",
                "Recent ~10 days may be absent (POWER lags real time).",
                "Solar is on a coarser grid, so nearby points can share a solar cell.",
            ],
        },
    }

    out.write_text(json.dumps(card, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Wrote data card -> {out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
