"""Runtime configuration for the AI Engine, overridable via environment vars."""
from __future__ import annotations

import os
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent      # ai-engine/
PIPELINE = ROOT / "pipeline"

# Where fine-tuned predictors and their context datasets live. Defaults point at
# the in-repo pipeline outputs; override in production (e.g. a mounted volume or
# a path populated from a HuggingFace model repo).
MODEL_DIR = Path(os.getenv("AI_ENGINE_MODEL_DIR", str(PIPELINE / "train" / "outputs")))
PROCESSED_DIR = Path(os.getenv("AI_ENGINE_PROCESSED_DIR", str(PIPELINE / "datasets" / "processed")))
DATA_FORMAT = os.getenv("AI_ENGINE_DATA_FORMAT", "parquet")  # parquet | csv

HORIZONS = ("daily", "monthly")

# Predictive-maintenance model artifacts (Phase 3).
RUL_MODEL_PATH = Path(os.getenv(
    "AI_ENGINE_RUL_MODEL", str(MODEL_DIR / "rul" / "model.json")))
ANOMALY_MODEL_PATH = Path(os.getenv(
    "AI_ENGINE_ANOMALY_MODEL", str(MODEL_DIR / "anomaly" / "model.joblib")))

# LLM advisory layer. Uses an OpenAI-compatible chat API; defaults to Groq
# (open-weights models, DPG-friendly). Leave LLM_API_KEY empty to fall back to a
# deterministic rule-based summary (the endpoint still works without a key).
LLM_API_KEY = os.getenv("LLM_API_KEY", "")
LLM_BASE_URL = os.getenv("LLM_BASE_URL", "https://api.groq.com/openai/v1")
LLM_MODEL = os.getenv("LLM_MODEL", "llama-3.3-70b-versatile")
LLM_TIMEOUT = float(os.getenv("LLM_TIMEOUT", "30"))

API_TITLE = "AfyaSolar AI Engine"
API_VERSION = "0.1.0"
