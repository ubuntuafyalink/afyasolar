"""Prediction explainer endpoint - plain-language, per-metric, bilingual.

Distinct from /advisory (a facility-wide synthesis + actions): /explain educates
about ONE prediction - what it measures, what the value means, why, and what to
watch - reusing the same LLM layer with a deterministic bilingual fallback.
"""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.services.llm import build_explanation

router = APIRouter(prefix="/explain", tags=["explain"])

_METRICS = ("composite_hazard", "climate_hazard", "solar_yield", "battery_rul", "anomaly")


class ExplainRequest(BaseModel):
    metric: str = Field(..., pattern="^(composite_hazard|climate_hazard|solar_yield|battery_rul|anomaly)$")
    value: float | None = None
    unit: str | None = None
    lang: str = Field("en", pattern="^(en|sw)$")
    context: dict[str, Any] | None = None


@router.post("", summary="Explain one AI prediction in plain language (en/sw)")
def explain(req: ExplainRequest) -> dict:
    return build_explanation(req.model_dump(exclude_none=True))
