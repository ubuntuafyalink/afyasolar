"""
Estimate solar energy yield from a forecasted irradiance series + system specs.

NASA POWER's ALLSKY_SFC_SW_DWN is kWh/m^2/day, which equals peak-sun-hours (PSH).
Daily generation = PSH x system_kw x performance_ratio, mirroring the app's
sizing engine (solar_energy_daily = P_pv_actual_kw x peakSun x derate).

Pure functions, no I/O.
"""
from __future__ import annotations

# Derate / performance ratio by facility type, matching the sizing engine's
# DERATE_FACTORS. Hybrid is the sensible default for AfyaSolar health facilities.
PERFORMANCE_RATIO = {"on_grid": 0.8, "hybrid": 0.75, "off_grid": 0.7}
DEFAULT_PERFORMANCE_RATIO = 0.75


def estimate_yield(
    irradiance_psh: list[float],
    system_kw: float,
    performance_ratio: float = DEFAULT_PERFORMANCE_RATIO,
) -> dict:
    """Modeled generation for each forecast step plus totals.

    ``irradiance_psh``: forecasted ALLSKY_SFC_SW_DWN (kWh/m^2/day = PSH).
    ``system_kw``: installed PV capacity.
    ``performance_ratio``: system derate (see PERFORMANCE_RATIO).
    """
    if system_kw <= 0:
        raise ValueError("system_kw must be positive")
    pr = performance_ratio

    per_step = [round(max(0.0, psh) * system_kw * pr, 3) for psh in irradiance_psh]
    total = round(sum(per_step), 3)
    mean_daily = round(total / len(per_step), 3) if per_step else 0.0

    return {
        "system_kw": system_kw,
        "performance_ratio": pr,
        "generation_kwh_per_step": per_step,
        "total_kwh": total,
        "mean_daily_kwh": mean_daily,
        "steps": len(per_step),
    }
