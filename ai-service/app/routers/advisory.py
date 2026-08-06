"""LLM advisory endpoint - explains the engine's outputs in plain language."""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel, ConfigDict, Field

from app.services.llm import build_advisory

router = APIRouter(prefix="/advisory", tags=["advisory"])


class AdvisoryRequest(BaseModel):
    # Accepts the outputs of the other endpoints. `yield` is a Python keyword, so
    # the field is `energy_yield` with an incoming alias of "yield".
    model_config = ConfigDict(populate_by_name=True)

    facility_id: str | None = None
    hazards: dict[str, Any] | None = None
    energy_yield: dict[str, Any] | None = Field(None, alias="yield")
    rul: dict[str, Any] | None = None
    anomaly: list[dict[str, Any]] | dict[str, Any] | None = None


@router.post("", summary="Plain-language advisory from the model outputs")
def advisory(req: AdvisoryRequest) -> dict:
    context = {
        "facility_id": req.facility_id,
        "hazards": req.hazards,
        "yield": req.energy_yield,
        "rul": req.rul,
        "anomaly": req.anomaly,
    }
    context = {k: v for k, v in context.items() if v is not None}
    return build_advisory(context)
