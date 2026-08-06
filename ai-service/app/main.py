"""
AfyaSolar AI Engine - FastAPI entrypoint.

Serves the climate-forecasting models (fine-tuned Chronos) and, later, the
predictive-maintenance models (RUL + anomaly). Kept as a standalone service so
the Next.js app calls it over HTTP rather than embedding Python/ML.

Run locally:
    uvicorn app.main:app --reload
Interactive docs at http://127.0.0.1:8000/docs
"""
from __future__ import annotations

from fastapi import FastAPI

from app import config
from app.routers import advisory, energy, forecast, hazards, health, maintenance

app = FastAPI(
    title=config.API_TITLE,
    version=config.API_VERSION,
    description=(
        "AfyaSolar's AI/ML over HTTP: climate forecasting (Chronos, fine-tuned on "
        "NASA POWER), derived hazard indices and solar yield, predictive "
        "maintenance (RUL + anomaly), and an LLM advisory layer."
    ),
)

app.include_router(health.router)
app.include_router(forecast.router)   # /forecast  - raw NASA variable forecasts
app.include_router(hazards.router)    # /hazards   - heat/flood/storm/drought
app.include_router(energy.router)     # /yield     - solar generation estimate
app.include_router(maintenance.router)  # /maintenance/rul, /maintenance/anomaly
app.include_router(advisory.router)   # /advisory  - LLM plain-language summary
