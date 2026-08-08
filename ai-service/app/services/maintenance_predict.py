"""
Facility-oriented predictive maintenance: given a facility's real age + installed
kW, generate an in-distribution telemetry window (or accept a provided one) and
run the RUL + anomaly models on it.

The maintenance models were trained on synthetic daily telemetry; the app's live
data is too short/out-of-distribution to feed them today. So the serving path
simulates a plausible window per facility (deterministic, seeded by facility id)
using the facility's real age and system size, giving meaningful, honest results
labelled "simulated". When live daily telemetry exists, pass ``window`` instead.
"""
from __future__ import annotations

import hashlib
from datetime import datetime, timezone

from app.services.maintenance import predict_rul, score_anomaly

WINDOW_DAYS = 45
_STATUS_NOTE = {
    "critical": "Plan a battery replacement soon.",
    "warning": "Monitor the battery; schedule maintenance.",
    "healthy": "Battery health is adequate.",
}


def _seed(facility_id: str) -> int:
    return int(hashlib.md5(facility_id.encode("utf-8")).hexdigest()[:8], 16)


def simulate_window(facility_id: str, age_days: int, system_kw: float,
                    window_days: int = WINDOW_DAYS) -> list[dict]:
    """A deterministic recent telemetry window for a facility at its current age."""
    from pipeline.synthetic.generate_telemetry import simulate_facility  # lazy

    days = max(window_days + 1, int(age_days) + 1)
    df = simulate_facility(fac_idx=0, days=days, seed=_seed(facility_id), system_kw=float(system_kw))
    end = min(int(age_days), int(df["day"].max()))
    window = df[df["day"] <= end].tail(window_days)
    cols = ["day", "batt_soc", "batt_v", "load_w", "pv_w", "temp_c", "grid_present"]
    return window[cols].to_dict("records")


def predict_facility_maintenance(facility_id: str, age_days: int, system_kw: float,
                                 window: list[dict] | None = None) -> dict:
    based_on = "provided" if window else "simulated"
    if window is None:
        window = simulate_window(facility_id, age_days, system_kw)

    rul = predict_rul(window)
    recent = window[-14:]
    scored = score_anomaly(recent)
    n_anom = sum(1 for s in scored if s.get("anomaly"))

    rul_days = rul.get("rul_days", 0)
    status = "critical" if rul_days < 90 else "warning" if rul_days < 180 else "healthy"

    return {
        "facility_id": facility_id,
        "based_on": based_on,
        "rul": rul,
        "anomaly": {"n": n_anom, "recent": scored},
        "health": {"status": status, "note": _STATUS_NOTE[status]},
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }
