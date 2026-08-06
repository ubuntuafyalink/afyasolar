"""Solar energy-yield estimation from a forecasted irradiance series."""
from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.services.energy_yield import DEFAULT_PERFORMANCE_RATIO, estimate_yield

router = APIRouter(prefix="/yield", tags=["yield"])


class YieldRequest(BaseModel):
    irradiance_psh: list[float] = Field(
        ..., description="Forecasted ALLSKY_SFC_SW_DWN (kWh/m^2/day = peak sun hours)",
        examples=[[5.8, 6.1, 4.2, 5.5]],
    )
    system_kw: float = Field(..., gt=0, examples=[6.0])
    performance_ratio: float = Field(DEFAULT_PERFORMANCE_RATIO, gt=0, le=1)


@router.post("", summary="Modeled PV generation (kWh) per step + totals")
def compute_yield(req: YieldRequest) -> dict:
    try:
        return estimate_yield(req.irradiance_psh, req.system_kw, req.performance_ratio)
    except ValueError as err:
        raise HTTPException(400, str(err))
