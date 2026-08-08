"""Liveness + model-availability endpoints (no heavy deps, always boots)."""
from __future__ import annotations

from fastapi import APIRouter

from app import config
from app.services.artifacts import model_available

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
    """Report which fine-tuned horizons are available to serve.

    In HF-repo mode "available" means configured to serve from the repo
    (verified against the local snapshot cache once one exists); the probe
    never downloads anything.
    """
    models = {h: model_available(h) for h in config.HORIZONS}
    return {
        "status": "ok",
        "models_available": models,
        "model_source": "huggingface" if config.MODEL_REPO else "local",
        "model_repo": config.MODEL_REPO or None,
        "data_repo": config.DATA_REPO or None,
    }
