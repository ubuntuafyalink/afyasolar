"""
Generate synthetic solar-system telemetry for training the predictive-maintenance
models (RUL + anomaly), since no live device data exists yet.

Physics-lite but learnable: each simulated facility ages a battery whose State of
Health (SoH) fades with calendar time, cycling depth, and temperature stress
(Arrhenius-style). End-of-life (EOL) is SoH < 0.7; the per-day **RUL label** is
the number of days until that crossing. Fault windows (inverter dropout, battery
step-loss, sensor spikes) are injected and flagged with an **anomaly label**.

Everything is deterministic given --seed so training data is reproducible.

Output (long format, one row per facility-day):
    facility_id, ts, day, load_w, pv_w, batt_v, batt_soc, temp_c, grid_present,
    soh, rul_days, anomaly

Usage:
    python generate_telemetry.py --facilities 40 --days 2200
    python generate_telemetry.py --format csv --out out/telemetry.csv
"""
from __future__ import annotations

import argparse
import math
from pathlib import Path

import numpy as np
import pandas as pd

HERE = Path(__file__).resolve().parent

EOL_SOH = 0.70                # end-of-life threshold
NOMINAL_BATT_V = 48.0         # DC bus


def _seasonal(day: int, base: float, amp: float, phase: float = 0.0) -> float:
    """Annual sinusoid (southern-hemisphere friendly; phase in days)."""
    return base + amp * math.sin(2 * math.pi * (day + phase) / 365.0)


def simulate_facility(fac_idx: int, days: int, seed: int) -> pd.DataFrame:
    rng = np.random.RandomState(seed + fac_idx)

    system_kw = float(rng.choice([2.0, 4.2, 6.0, 10.0]))
    batt_kwh = system_kw * rng.uniform(2.2, 3.0)          # nameplate storage
    load_factor = rng.uniform(2.5, 3.6)                   # daily load, kWh per installed kW
    night_fraction = rng.uniform(0.35, 0.45)             # share of load served from battery
    # Per-facility fade sensitivities (some sites age faster).
    calendar_fade = rng.uniform(3e-5, 7e-5)      # SoH lost per day (calendar)
    cycle_fade = rng.uniform(2e-4, 5e-4)         # SoH lost per full-depth cycle
    temp_ref = 25.0

    # Inject 0-3 fault windows.
    n_faults = rng.randint(0, 4)
    fault_days: set[int] = set()
    fault_kinds: dict[int, str] = {}
    for _ in range(n_faults):
        start = rng.randint(30, max(31, days - 40))
        length = rng.randint(2, 8)
        kind = rng.choice(["inverter", "undervolt", "sensor_spike"])
        for d in range(start, min(days, start + length)):
            fault_days.add(d)
            fault_kinds[d] = kind

    soh = 1.0
    rows = []
    for day in range(days):
        temp = _seasonal(day, temp_ref + 3, 6.0, phase=-80) + rng.normal(0, 1.5)
        psh = max(0.5, _seasonal(day, 5.5, 1.6, phase=-80) + rng.normal(0, 0.6))
        # Daily energy balance (kWh), then average power for the telemetry proxy.
        daily_pv_kwh = psh * system_kw * 0.75
        daily_load_kwh = max(
            0.1, system_kw * load_factor
            * (1 + 0.08 * math.sin(2 * math.pi * day / 7) + rng.normal(0, 0.06)))
        load_w = daily_load_kwh * 1000 / 24
        pv_w = daily_pv_kwh * 1000 / 24

        # Depth of discharge = night load / usable capacity; rises as SoH fades,
        # keeping the battery in a healthy cycling band while new.
        usable_kwh = batt_kwh * soh
        night_load_kwh = daily_load_kwh * night_fraction
        dod = float(np.clip(night_load_kwh / max(0.1, usable_kwh), 0.05, 0.95))
        batt_soc = float(np.clip(1.0 - dod + rng.normal(0, 0.03), 0.10, 1.0)) * 100
        batt_v = NOMINAL_BATT_V * (0.90 + 0.10 * batt_soc / 100) + rng.normal(0, 0.2)
        grid_present = int(rng.random() > 0.08)

        anomaly = 0
        if day in fault_days:
            anomaly = 1
            kind = fault_kinds[day]
            if kind == "inverter":                            # inverter dropout: no PV,
                pv_w = 0.0                                    # battery drains, voltage sags
                batt_soc = float(rng.uniform(8, 20))
                batt_v = NOMINAL_BATT_V * rng.uniform(0.80, 0.86)
            elif kind == "sensor_spike":                      # over-voltage spike
                batt_v = NOMINAL_BATT_V * rng.uniform(1.25, 1.6)
            elif kind == "undervolt":                         # deep under-voltage
                batt_v = NOMINAL_BATT_V * rng.uniform(0.72, 0.82)
                batt_soc = float(rng.uniform(3, 12))

        # Temperature-accelerated calendar + cycle fade (Arrhenius-ish doubling / 10C).
        temp_factor = 2 ** ((temp - temp_ref) / 10.0)
        soh -= (calendar_fade + cycle_fade * dod) * temp_factor
        soh = max(0.0, soh)

        rows.append({
            "facility_id": f"sim-{fac_idx:03d}",
            "day": day,
            "load_w": round(load_w, 1),
            "pv_w": round(pv_w, 1),
            "batt_v": round(batt_v, 2),
            "batt_soc": round(batt_soc, 1),
            "temp_c": round(temp, 1),
            "grid_present": grid_present,
            "soh": round(soh, 4),
            "anomaly": anomaly,
        })
        if soh <= 0.0:
            break

    df = pd.DataFrame(rows)
    # RUL label: days until SoH first drops below EOL_SOH (right-open).
    below = df.index[df["soh"] < EOL_SOH]
    eol_day = int(df.loc[below[0], "day"]) if len(below) else None
    if eol_day is None:
        df["rul_days"] = (df["day"].max() - df["day"]).astype(int)  # censored
    else:
        df["rul_days"] = (eol_day - df["day"]).clip(lower=0).astype(int)
    # Synthetic calendar timestamp (day 0 = 2019-01-01) for realism.
    df["ts"] = pd.to_datetime("2019-01-01") + pd.to_timedelta(df["day"], unit="D")
    return df


def main() -> int:
    ap = argparse.ArgumentParser(description="Generate synthetic maintenance telemetry.")
    ap.add_argument("--facilities", type=int, default=40)
    ap.add_argument("--days", type=int, default=2200)
    ap.add_argument("--seed", type=int, default=42)
    ap.add_argument("--out", type=Path, default=None)
    ap.add_argument("--format", choices=["parquet", "csv"], default="parquet")
    args = ap.parse_args()

    frames = [simulate_facility(i, args.days, args.seed) for i in range(args.facilities)]
    df = pd.concat(frames, ignore_index=True)
    cols = ["facility_id", "ts", "day", "load_w", "pv_w", "batt_v", "batt_soc",
            "temp_c", "grid_present", "soh", "rul_days", "anomaly"]
    df = df[cols]

    out = args.out or (HERE / "out" / f"telemetry.{args.format}")
    out.parent.mkdir(parents=True, exist_ok=True)
    if args.format == "parquet":
        df.to_parquet(out, index=False)
    else:
        df.to_csv(out, index=False)

    print(f"Wrote {len(df):,} rows for {df['facility_id'].nunique()} facilities -> {out}")
    print(f"  anomaly rate: {df['anomaly'].mean()*100:.2f}% | "
          f"EOL reached by {df.groupby('facility_id')['soh'].min().lt(EOL_SOH).mean()*100:.0f}% of sites")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
