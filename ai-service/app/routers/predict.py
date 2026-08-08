"""
Combined prediction endpoints for the web app.

/predict/climate: forecasted hazard indices (heat/flood/storm/drought), the raw
variable forecasts, and (optionally) solar yield for a location.
/predict/maintenance: battery RUL + anomaly + health status for a facility.
Both compose the existing pure/model services into one web-facing call.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app import config
from app.services.hazards import hazard_indices, hazard_trajectory
from app.services.llm import build_facility_advisory, build_portfolio_advisory
from app.services.locations import location_exists, nearest_location
from app.services.report import build_outlook_report

router = APIRouter(prefix="/predict", tags=["predict"])


class ClimatePredictRequest(BaseModel):
    lat: float | None = Field(None, ge=-90, le=90)
    lon: float | None = Field(None, ge=-180, le=180)
    location_id: str | None = Field(
        None, description="A known location id (overrides lat/lon if given).")
    horizon: str = Field("monthly", pattern="^(daily|monthly)$")
    system_kw: float | None = Field(None, gt=0, description="Installed PV kW, for yield.")
    months: int | None = Field(
        None, ge=1, le=24,
        description="Forecast window: compute hazards/yield over the first N steps only.")


@router.post("/climate", summary="Forecast climate hazards (+ optional yield) for a location")
def predict_climate(req: ClimatePredictRequest) -> dict:
    # 1. Resolve the location.
    distance_km: float | None = None
    if req.location_id:
        if not location_exists(req.location_id):
            raise HTTPException(400, f"Unknown location_id '{req.location_id}'.")
        location_id = req.location_id
    elif req.lat is not None and req.lon is not None:
        location_id, distance_km = nearest_location(req.lat, req.lon)
    else:
        raise HTTPException(400, "Provide either location_id or both lat and lon.")

    if not (config.MODEL_DIR / req.horizon).exists():
        raise HTTPException(
            503, f"No trained model for horizon '{req.horizon}'. Build it first "
                 "(pipeline: fetch -> build -> finetune_chronos).")

    # 2. Forecast the raw NASA variables (Chronos).
    from app.services.predictor import deployed_model_name, forecast_location
    try:
        fc = forecast_location(req.horizon, location_id)
        forecast = fc["forecast"]
        model_used = fc.get("model_used")
        model_name = deployed_model_name()
    except FileNotFoundError as err:
        raise HTTPException(503, str(err))
    except ValueError as err:
        raise HTTPException(404, str(err))

    # 3. Derive hazard indices from the mean forecast per variable.
    series = {var: [pt["mean"] for pt in pts if "mean" in pt]
              for var, pts in forecast.items()}
    timestamps = [pt["timestamp"] for pt in next(iter(forecast.values()), [])]

    # Optional forecast window: restrict hazards/trajectory/yield to the first N
    # steps so a shorter horizon genuinely re-derives the indices (flood/storm are
    # peaks, drought is a dry-count -> window-dependent), not just a chart slice.
    if req.months:
        series = {var: vals[:req.months] for var, vals in series.items()}
        timestamps = timestamps[:req.months]

    temporal = "daily" if req.horizon == "daily" else "monthly"
    # Chronos monthly series carry monthly-total precipitation (the dataset sums
    # PRECTOTCORR); declare it so the v1 mm/day bounds apply to converted values.
    precip_unit = "mm_per_month" if temporal == "monthly" else "mm_per_day"
    hazards = hazard_indices(series, temporal,
                             precip_unit=precip_unit, timestamps=timestamps)

    # Per-step hazard trajectory (for the forecast chart), aligned to timestamps.
    hazards_monthly = hazard_trajectory(timestamps, series, temporal,
                                        precip_unit=precip_unit)

    result = {
        "location_id": location_id,
        "distance_km": distance_km,
        "horizon": req.horizon,
        "hazards": hazards,
        "hazards_monthly": hazards_monthly,
        "forecast_raw": forecast,
        "model_used": model_used,
        "model_name": model_name,
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }

    # 4. Optional solar yield from the irradiance forecast.
    if req.system_kw:
        irradiance = series.get("ALLSKY_SFC_SW_DWN")
        if irradiance:
            from app.services.energy_yield import estimate_yield
            result["yield"] = estimate_yield(irradiance, req.system_kw)

    return result


class MaintenancePredictRequest(BaseModel):
    facility_id: str = Field(..., min_length=1)
    age_days: int = Field(400, ge=1, description="System age in days (from install date).")
    system_kw: float = Field(5.0, gt=0, description="Installed PV capacity.")
    window: list[dict] | None = Field(
        None, description="Optional real telemetry window; if omitted, one is simulated.")


@router.post("/maintenance", summary="Battery RUL + anomaly + health for a facility")
def predict_maintenance(req: MaintenancePredictRequest) -> dict:
    if not config.RUL_MODEL_PATH.exists() or not config.ANOMALY_MODEL_PATH.exists():
        raise HTTPException(
            503, "Maintenance models not trained. Run pipeline/train/train_rul.py "
                 "and train_anomaly.py first.")
    from app.services.maintenance_predict import predict_facility_maintenance
    try:
        return predict_facility_maintenance(
            req.facility_id, req.age_days, req.system_kw, req.window)
    except ValueError as err:
        raise HTTPException(400, str(err))


class AdvisoryPredictRequest(BaseModel):
    facility_id: str = Field(..., min_length=1)
    lat: float | None = Field(None, ge=-90, le=90)
    lon: float | None = Field(None, ge=-180, le=180)
    age_days: int = Field(400, ge=1, description="System age in days (from install date).")
    system_kw: float = Field(5.0, gt=0, description="Installed PV capacity.")
    lang: str = Field("en", pattern="^(en|sw)$")
    battery_level: float | None = Field(None, ge=0, le=100, description="Current battery SoC %.")
    medical: dict[str, Any] | None = Field(
        None, description="Compact medical-load summary (total_daily_load, peak_load_kw, "
                          "criticality, top_critical_devices).")


@router.post("/advisory", summary="Facility operations advisory (power/climate/medical/health)")
def predict_advisory(req: AdvisoryPredictRequest) -> dict:
    """Compose this facility's own signals - solar yield + climate hazards + battery
    RUL/anomalies + its medical-equipment load - into a single-facility operations
    advisory (power, climate, medical equipment, system health & energy security).

    Every leg is best-effort: a missing model is swallowed so the advisory still
    returns from whatever is available (and works keyless via the rule-based
    fallback). It never references other facilities or the wider network.
    """
    context: dict = {"facility_id": req.facility_id}
    inputs: dict = {}

    # 1. Climate (optional): hazards + yield from the monthly forecast at the
    #    nearest known location.
    if req.lat is not None and req.lon is not None and (config.MODEL_DIR / "monthly").exists():
        try:
            location_id, _ = nearest_location(req.lat, req.lon)
            from app.services.predictor import forecast_location
            forecast = forecast_location("monthly", location_id)["forecast"]
            series = {var: [pt["mean"] for pt in pts if "mean" in pt]
                      for var, pts in forecast.items()}
            timestamps = [pt["timestamp"] for pt in next(iter(forecast.values()), [])]
            hazards = hazard_indices(series, "monthly",
                                     precip_unit="mm_per_month", timestamps=timestamps)
            context["hazards"] = hazards
            inputs["hazards"] = hazards
            irradiance = series.get("ALLSKY_SFC_SW_DWN")
            if irradiance:
                from app.services.energy_yield import estimate_yield
                yld = estimate_yield(irradiance, req.system_kw)
                context["yield"] = yld
                inputs["mean_daily_kwh"] = yld.get("mean_daily_kwh")
        except Exception:  # noqa: BLE001 - climate is optional; never fail the advisory
            pass

    # 2. Maintenance (optional): battery RUL + anomaly + health.
    if config.RUL_MODEL_PATH.exists() and config.ANOMALY_MODEL_PATH.exists():
        try:
            from app.services.maintenance_predict import predict_facility_maintenance
            maint = predict_facility_maintenance(req.facility_id, req.age_days, req.system_kw)
            context["rul"] = maint["rul"]
            # Pass the scored recent readings as the list form the fallback counts.
            context["anomaly"] = maint["anomaly"]["recent"]
            inputs["rul_days"] = maint["rul"].get("rul_days")
            inputs["health"] = maint["health"]
            inputs["anomalies"] = maint["anomaly"]["n"]
        except Exception:  # noqa: BLE001 - maintenance is optional; never fail the advisory
            pass

    # 3. Power: current battery level (if the app has a live reading).
    if req.battery_level is not None:
        context["battery_level"] = req.battery_level
        inputs["battery_level"] = req.battery_level

    # 4. Medical equipment load + energy balance (does expected yield cover the load?).
    if req.medical:
        context["medical"] = req.medical
        inputs["medical"] = req.medical
        load = req.medical.get("total_daily_load")
        expected = inputs.get("mean_daily_kwh")
        if isinstance(load, (int, float)) and isinstance(expected, (int, float)):
            balance = {
                "expected_kwh": round(expected, 2),
                "load_kwh": round(load, 2),
                "covers_load": expected >= load,
            }
            context["energy_balance"] = balance
            inputs["energy_balance"] = balance

    result = build_facility_advisory(context, req.lang)
    result["inputs"] = inputs
    result["generated_at"] = datetime.now(timezone.utc).isoformat()
    return result


class OutlookHazards(BaseModel):
    heat: int = Field(..., ge=0, le=100)
    flood: int = Field(..., ge=0, le=100)
    storm: int = Field(..., ge=0, le=100)
    drought: int = Field(..., ge=0, le=100)
    composite: int = Field(..., ge=0, le=100)


class OutlookReportRequest(BaseModel):
    hazards: OutlookHazards
    lang: str = Field("en", pattern="^(en|sw)$")
    scope: str = Field("facility", pattern="^(facility|portfolio)$")
    context: dict[str, Any] | None = Field(
        None, description="Optional extras, e.g. {'facility_count': 14, 'months': 12}.")


@router.post("/outlook-report",
             summary="Recommended actions / safe-outlook report from hazard scores")
def predict_outlook_report(req: OutlookReportRequest) -> dict:
    """Turn already-computed hazard indices into an explicit report: per-hazard
    recommended actions when any hazard is high (>=50, band 'high'/'severe'), or
    an explicit all-clear when none is. The caller passes the same numbers it
    displays (from /predict/climate or a portfolio aggregate), so the report
    always agrees with the charts. Deterministic + bilingual; works keyless."""
    result = build_outlook_report(req.hazards.model_dump(), req.lang,
                                  req.scope, req.context)
    result["generated_at"] = datetime.now(timezone.utc).isoformat()
    return result


class PortfolioAdvisoryFacility(BaseModel):
    name: str
    rul_days: float | None = None
    status: str | None = None
    anomalies: int | None = None
    hazard_composite: float | None = None


class PortfolioAdvisoryRequest(BaseModel):
    n_facilities: int = Field(0, ge=0)
    n_at_risk: int = Field(0, ge=0)
    avg_rul_days: float | None = None
    total_anomalies: int | None = None
    top: list[PortfolioAdvisoryFacility] = Field(default_factory=list)


@router.post("/portfolio-advisory", summary="Fleet-level advisory over a portfolio summary")
def predict_portfolio_advisory(req: PortfolioAdvisoryRequest) -> dict:
    """Turn a pre-ranked portfolio summary into a plain-language weekly fleet
    briefing. Ranking is done by the caller; this only writes the narrative
    (LLM when a key is configured, else a deterministic fallback)."""
    context = req.model_dump(exclude_none=True)
    result = build_portfolio_advisory(context)
    result["generated_at"] = datetime.now(timezone.utc).isoformat()
    return result
