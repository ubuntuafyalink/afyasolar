"""
Resolve where model/data artifacts come from: local dirs or HuggingFace repos.

Deliberately light (config + huggingface_hub only - no pandas/torch) so routers
and /health can import it at boot. Both AfyaSolar repos are public, so serving
needs no HF token; only publishing does (pipeline/data/hf_upload.py, notebook).
"""
from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from huggingface_hub import snapshot_download  # top-level: light + test-patchable

from app import config

# Serving needs only these files; skips the large raw CSV in the dataset repo.
_DATA_PATTERNS = ["processed/*", "grid_locations.json"]


@lru_cache(maxsize=1)
def data_base() -> Path | None:
    """Snapshot dir of the HF dataset repo, or None when serving local files."""
    if not config.DATA_REPO:
        return None
    return Path(snapshot_download(config.DATA_REPO, repo_type="dataset",
                                  allow_patterns=_DATA_PATTERNS))


# Predictor warm-up state, written by predictor.warm_start() and read by
# /health. Lives here (not in predictor.py) so /health never imports pandas.
_WARM_STATE: dict[str, str] = {h: "pending" for h in config.HORIZONS}
_WARM_STATUSES = ("pending", "warming", "ready", "failed")


def warm_state() -> dict[str, str]:
    return dict(_WARM_STATE)


def set_warm_state(horizon: str, status: str) -> None:
    if status not in _WARM_STATUSES:
        raise ValueError(f"Unknown warm status '{status}'")
    _WARM_STATE[horizon] = status


def model_available(horizon: str) -> bool:
    """Cheap availability probe for the route guards and /health. NEVER downloads.

    Repo mode (MODEL_REPO set): trust-but-verify. If a snapshot is already in
    the local HF cache, verify the horizon dir exists in it; if nothing is
    cached yet, report available and let the first predict do the download and
    surface real errors (a cache-miss raises LocalEntryNotFoundError, which is
    a FileNotFoundError and maps to the routers' existing 503 handling).
    Local mode: the horizon dir must exist under MODEL_DIR.
    """
    if config.MODEL_REPO:
        try:
            base = snapshot_download(config.MODEL_REPO, local_files_only=True)
            return (Path(base) / horizon).exists()
        except FileNotFoundError:  # not cached yet -> trust, verify on predict
            return True
    return (config.MODEL_DIR / horizon).exists()
