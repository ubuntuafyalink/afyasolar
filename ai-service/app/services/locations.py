"""
Resolve an arbitrary lat/lon to the nearest known training location.

The forecast models are keyed by the locations in
``pipeline/data/locations.json`` (the points NASA POWER was fetched for). A web
caller passes a facility's lat/lon; this maps it to the nearest of those points
so ``/predict/climate`` can serve a forecast. Pure, no I/O beyond one JSON read.
"""
from __future__ import annotations

import json
import math
from functools import lru_cache

from app import config


@lru_cache(maxsize=1)
def _locations() -> list[dict]:
    return json.loads(config.LOCATIONS_PATH.read_text(encoding="utf-8"))["locations"]


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlambda / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def nearest_location(lat: float, lon: float) -> tuple[str, float]:
    """Return (location_id, distance_km) of the closest known point."""
    locs = _locations()
    best = min(locs, key=lambda l: haversine_km(lat, lon, l["lat"], l["lon"]))
    dist = haversine_km(lat, lon, best["lat"], best["lon"])
    return best["id"], round(dist, 1)


def location_exists(location_id: str) -> bool:
    return any(l["id"] == location_id for l in _locations())
