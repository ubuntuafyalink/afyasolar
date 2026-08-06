"""Predictive-maintenance endpoints: RUL + anomaly detection."""
from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app import config

router = APIRouter(prefix="/maintenance", tags=["maintenance"])


class TelemetryPoint(BaseModel):
    day: int | None = Field(None, description="Age of the system in days (required for RUL)")
    batt_soc: float
    batt_v: float
    load_w: float
    pv_w: float
    temp_c: float
    grid_present: int = 1


class RulRequest(BaseModel):
    window: list[TelemetryPoint] = Field(
        ..., description="Recent daily telemetry for ONE facility (>= a few weeks).")


class AnomalyRequest(BaseModel):
    records: list[TelemetryPoint] = Field(..., description="Telemetry rows to score.")


@router.post("/rul", summary="Predict battery remaining useful life (days)")
def rul(req: RulRequest) -> dict:
    if not config.RUL_MODEL_PATH.exists():
        raise HTTPException(503, "RUL model not trained. Run pipeline/train/train_rul.py.")
    window = [p.model_dump() for p in req.window]
    if any(p["day"] is None for p in window):
        raise HTTPException(400, "Each telemetry point needs 'day' (system age) for RUL.")
    from app.services.maintenance import predict_rul
    try:
        return predict_rul(window)
    except ValueError as err:
        raise HTTPException(400, str(err))


@router.post("/anomaly", summary="Flag anomalous telemetry rows")
def anomaly(req: AnomalyRequest) -> dict:
    if not config.ANOMALY_MODEL_PATH.exists():
        raise HTTPException(503, "Anomaly model not trained. Run pipeline/train/train_anomaly.py.")
    from app.services.maintenance import score_anomaly
    records = [p.model_dump() for p in req.records]
    results = score_anomaly(records)
    return {"results": results, "n_anomalies": sum(1 for r in results if r["anomaly"])}
