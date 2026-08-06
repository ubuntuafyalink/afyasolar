"""Climate-forecast endpoint backed by the fine-tuned Chronos predictors."""
from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app import config

router = APIRouter(prefix="/forecast", tags=["forecast"])


class ForecastRequest(BaseModel):
    location_id: str = Field(..., examples=["tz-2"],
                             description="Location id from pipeline/data/locations.json")
    horizon: str = Field("monthly", pattern="^(daily|monthly)$")
    variables: list[str] | None = Field(
        None, description="NASA variables to forecast; omit for all trained ones.",
        examples=[["ALLSKY_SFC_SW_DWN", "T2M_MAX"]],
    )


@router.post("", summary="Forecast raw NASA climate variables for a location")
def forecast(req: ForecastRequest) -> dict:
    if not (config.MODEL_DIR / req.horizon).exists():
        raise HTTPException(
            status_code=503,
            detail=f"No trained model for horizon '{req.horizon}'. Fine-tune it first "
                   "(see pipeline/train).",
        )
    # Heavy ML deps are imported lazily so the service boots without them.
    try:
        from app.services.predictor import forecast_location
    except ImportError as err:
        raise HTTPException(500, f"Serving dependencies not installed: {err}")

    try:
        return forecast_location(req.horizon, req.location_id, req.variables)
    except FileNotFoundError as err:
        raise HTTPException(503, str(err))
    except ValueError as err:
        raise HTTPException(400, str(err))
