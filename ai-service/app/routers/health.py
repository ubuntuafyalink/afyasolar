"""Liveness + model-availability endpoints (no heavy deps, always boots)."""
from __future__ import annotations

from fastapi import APIRouter

from app import config

router = APIRouter(tags=["health"])


@router.get("/")
def root() -> dict:
    return {
        "service": "afyasolar-ai-engine",
        "version": config.API_VERSION,
        "docs": "/docs",
    }


@router.get("/health")
def health() -> dict:
    """Report which fine-tuned horizons are available to serve."""
    models = {h: (config.MODEL_DIR / h).exists() for h in config.HORIZONS}
    return {"status": "ok", "models_available": models}
