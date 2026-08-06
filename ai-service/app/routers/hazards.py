"""Derive hazard indices from forecasted (or observed) climate variables."""
from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.services.hazards import hazard_indices

router = APIRouter(prefix="/hazards", tags=["hazards"])


class HazardRequest(BaseModel):
    series: dict[str, list[float]] = Field(
        ...,
        description="Forecasted variable series, e.g. {'T2M_MAX':[...], "
                    "'PRECTOTCORR':[...], 'WS10M':[...]}",
        examples=[{"T2M_MAX": [31.2, 32.0, 33.5], "PRECTOTCORR": [0.1, 0.0, 12.0],
                   "WS10M": [4.1, 9.2, 6.0]}],
    )
    temporal: str = Field("monthly", pattern="^(daily|monthly)$")


@router.post("", summary="Heat/flood/storm/drought indices (0..100) + composite")
def derive_hazards(req: HazardRequest) -> dict:
    return hazard_indices(req.series, req.temporal)
