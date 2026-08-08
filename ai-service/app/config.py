"""Runtime configuration for the AI Engine, overridable via environment vars."""
from __future__ import annotations

import os
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent      # ai-engine/
PIPELINE = ROOT / "pipeline"

# Load a local .env (git-ignored) if present, without overriding vars already set
# in the real environment. Keeps secrets like LLM_API_KEY out of the codebase.
try:
    from dotenv import load_dotenv

    load_dotenv(ROOT / ".env")
except ImportError:  # python-dotenv is optional; env vars still work without it
    pass

# Where fine-tuned predictors and their context datasets live. Defaults point at
# the in-repo pipeline outputs; override in production (e.g. a mounted volume or
# a path populated from a HuggingFace model repo).
# Optional: pull the climate model from a HuggingFace repo instead of a local dir
# (portable production deploys). When set, it is snapshot-downloaded + cached and
# used as the model base; otherwise MODEL_DIR (local files) is used.
MODEL_REPO = os.getenv("AI_ENGINE_MODEL_REPO", "")

# Same idea for the context data: pull the processed series + grid locations
# from a HuggingFace *dataset* repo instead of local files. When set, it is
# snapshot-downloaded (only processed/* and grid_locations.json) + cached and
# supersedes PROCESSED_DIR / LOCATIONS_PATH; otherwise the local paths are used.
DATA_REPO = os.getenv("AI_ENGINE_DATA_REPO", "")

# Which climate model to serve from the predictor:
#   "finetuned" (default) | "zeroshot" | "best" (AutoGluon's top) | exact model name.
CLIMATE_MODEL = os.getenv("AI_ENGINE_CLIMATE_MODEL", "finetuned")

MODEL_DIR = Path(os.getenv("AI_ENGINE_MODEL_DIR", str(PIPELINE / "train" / "outputs")))
PROCESSED_DIR = Path(os.getenv("AI_ENGINE_PROCESSED_DIR", str(PIPELINE / "datasets" / "processed")))
DATA_FORMAT = os.getenv("AI_ENGINE_DATA_FORMAT", "parquet")  # parquet | csv

# The location list nearest_location() maps facilities onto. Must match the
# location ids present in PROCESSED_DIR (defaults to the in-repo training points).
LOCATIONS_PATH = Path(os.getenv("AI_ENGINE_LOCATIONS", str(PIPELINE / "data" / "locations.json")))

HORIZONS = ("daily", "monthly")

# Predictive-maintenance model artifacts (Phase 3).
RUL_MODEL_PATH = Path(os.getenv(
    "AI_ENGINE_RUL_MODEL", str(MODEL_DIR / "rul" / "model.json")))
ANOMALY_MODEL_PATH = Path(os.getenv(
    "AI_ENGINE_ANOMALY_MODEL", str(MODEL_DIR / "anomaly" / "model.joblib")))

# LLM advisory layer. Uses an OpenAI-compatible chat API; defaults to Groq
# (open-weights models, DPG-friendly). Leave the key empty to fall back to a
# deterministic rule-based summary (the endpoint still works without a key).
# GROQ_API_KEY is accepted as an alias so the same key can be shared with the
# web platform's .env.
LLM_API_KEY = os.getenv("LLM_API_KEY") or os.getenv("GROQ_API_KEY", "")
LLM_BASE_URL = os.getenv("LLM_BASE_URL", "https://api.groq.com/openai/v1")
LLM_MODEL = os.getenv("LLM_MODEL", "llama-3.3-70b-versatile")
LLM_TIMEOUT = float(os.getenv("LLM_TIMEOUT", "30"))

API_TITLE = "AfyaSolar AI Engine"
API_VERSION = "0.1.0"
