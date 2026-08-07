"""
Generate a regular lat/lon grid of NASA POWER points over East Africa and write
it as a ``locations.json`` that ``fetch_nasa.py`` can consume directly.

We train the climate models on a geographic GRID (not facility coordinates): it
gives many diverse, clean climate cells, decoupled from the facility DB, and at
inference the app's ``nearest_location`` maps each facility to its nearest grid
cell. NASA POWER's native resolution is ~0.5 deg (MERRA-2), so a 1 deg grid gives
genuinely distinct cells.

Land filtering (optional): if ``global-land-mask`` is installed we drop ocean
cells so the corpus is land climate; otherwise every cell in the box is kept.

Output: ``ai-service/dataset/grid_locations.json`` with the same schema
fetch_nasa.py expects -> {"locations": [{"id","lat","lon"}, ...]}.

Usage:
    python pipeline/data/make_grid.py                 # East Africa, 1 deg, land-only if possible
    python pipeline/data/make_grid.py --step 0.5      # denser grid
    python pipeline/data/make_grid.py --no-land-filter
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
AI_SERVICE = HERE.parents[1]                 # pipeline/data -> pipeline -> ai-service
DATASET_DIR = AI_SERVICE / "dataset"

# East Africa bounding box (covers Tanzania + Kenya, Uganda, Rwanda, Burundi,
# Malawi and the northern Mozambique border zones).
BBOX = {"lat_min": -17.0, "lat_max": 5.0, "lon_min": 29.0, "lon_max": 41.0}


def frange(lo: float, hi: float, step: float) -> list[float]:
    """Inclusive float range, rounded to avoid FP ids like -6.0000001."""
    out, v = [], lo
    while v <= hi + 1e-9:
        out.append(round(v, 3))
        v += step
    return out


def fmt(v: float) -> str:
    """Filename/id-safe number: no dots (fetch_nasa uses Path.with_suffix)."""
    s = f"{v:g}".replace("-", "m").replace(".", "p")
    return s


def try_land_mask():
    try:
        from global_land_mask import globe  # type: ignore
        return globe.is_land
    except Exception:  # noqa: BLE001 - optional dependency
        return None


def main() -> int:
    ap = argparse.ArgumentParser(description="Build a NASA POWER grid locations.json.")
    ap.add_argument("--step", type=float, default=1.0, help="grid spacing in degrees (default 1.0)")
    ap.add_argument("--out", type=Path, default=DATASET_DIR / "grid_locations.json")
    ap.add_argument("--no-land-filter", action="store_true", help="keep ocean cells too")
    args = ap.parse_args()

    is_land = None if args.no_land_filter else try_land_mask()
    land_note = ("land-only (global_land_mask)" if is_land
                 else "ALL cells (no land filter)" if args.no_land_filter
                 else "ALL cells (global_land_mask not installed)")

    lats = frange(BBOX["lat_min"], BBOX["lat_max"], args.step)
    lons = frange(BBOX["lon_min"], BBOX["lon_max"], args.step)

    locations, dropped = [], 0
    for lat in lats:
        for lon in lons:
            if is_land is not None and not bool(is_land(lat, lon)):
                dropped += 1
                continue
            locations.append({"id": f"ea_{fmt(lat)}_{fmt(lon)}", "lat": lat, "lon": lon})

    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps({"locations": locations}, indent=2), encoding="utf-8")

    print(f"Box: lat[{BBOX['lat_min']}..{BBOX['lat_max']}] lon[{BBOX['lon_min']}..{BBOX['lon_max']}] "
          f"@ {args.step} deg  ({len(lats)}x{len(lons)} = {len(lats) * len(lons)} cells)")
    print(f"Filter: {land_note}  ->  kept {len(locations)}, dropped {dropped}")
    print(f"Wrote {args.out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
