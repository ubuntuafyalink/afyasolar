"""Offline tests for HuggingFace-backed artifact resolution (no network).

snapshot_download is monkeypatched at the artifacts module level; every test
runs against a fake snapshot directory built in tmp_path.
"""
import json

import pandas as pd
import pytest
from fastapi.testclient import TestClient

from app import config
from app.main import app
from app.services import artifacts, locations, predictor

client = TestClient(app)


@pytest.fixture(autouse=True)
def _clear_caches():
    """The fake snapshot must never leak into the real-grid tests (and vice
    versa): clear every lru_cache that memoizes artifact resolution."""
    def clear():
        artifacts.data_base.cache_clear()
        locations._locations.cache_clear()
        predictor._model_base.cache_clear()
        predictor.deployed_model_name.cache_clear()
    clear()
    yield
    clear()


@pytest.fixture
def fake_snapshot(tmp_path, monkeypatch):
    (tmp_path / "processed").mkdir()
    pd.DataFrame({
        "item_id": ["ea_m7_39|T2M_MAX|M"] * 3,
        "timestamp": pd.date_range("2024-01-01", periods=3, freq="MS"),
        "target": [1.0, 2.0, 3.0],
    }).to_parquet(tmp_path / "processed" / "monthly.parquet")
    (tmp_path / "grid_locations.json").write_text(json.dumps(
        {"locations": [{"id": "ea_m7_39", "lat": -7.0, "lon": 39.0}]}),
        encoding="utf-8")
    monkeypatch.setattr(config, "DATA_REPO", "afyalink/fake-dataset")
    monkeypatch.setattr(artifacts, "snapshot_download", lambda *a, **k: str(tmp_path))
    return tmp_path


def test_data_base_none_without_repo(monkeypatch):
    monkeypatch.setattr(config, "DATA_REPO", "")
    assert artifacts.data_base() is None


def test_load_context_reads_repo_snapshot(fake_snapshot):
    df = predictor._load_context("monthly")
    assert list(df.columns) == ["item_id", "timestamp", "target"]
    assert len(df) == 3
    assert df["item_id"].iloc[0] == "ea_m7_39|T2M_MAX|M"


def test_load_context_missing_file_raises(fake_snapshot):
    with pytest.raises(FileNotFoundError):
        predictor._load_context("daily")  # only monthly exists in the fake


def test_locations_resolve_from_repo_snapshot(fake_snapshot):
    loc_id, dist = locations.nearest_location(-7.0, 39.0)
    assert loc_id == "ea_m7_39"
    assert dist == 0.0
    assert locations.location_exists("ea_m7_39")
    assert not locations.location_exists("nope")


def test_model_available_repo_mode_uncached(monkeypatch):
    monkeypatch.setattr(config, "MODEL_REPO", "afyalink/fake-model")

    def raise_not_cached(*a, **k):
        raise FileNotFoundError("not in cache")
    monkeypatch.setattr(artifacts, "snapshot_download", raise_not_cached)
    # Nothing cached yet -> trust the config; the first predict is the proof.
    assert artifacts.model_available("monthly") is True
    assert artifacts.model_available("daily") is True


def test_model_available_repo_mode_cached_verifies(tmp_path, monkeypatch):
    monkeypatch.setattr(config, "MODEL_REPO", "afyalink/fake-model")
    (tmp_path / "monthly").mkdir()
    monkeypatch.setattr(artifacts, "snapshot_download", lambda *a, **k: str(tmp_path))
    assert artifacts.model_available("monthly") is True
    assert artifacts.model_available("daily") is False


def test_model_available_local_mode(tmp_path, monkeypatch):
    monkeypatch.setattr(config, "MODEL_REPO", "")
    monkeypatch.setattr(config, "MODEL_DIR", tmp_path)
    assert artifacts.model_available("monthly") is False
    (tmp_path / "monthly").mkdir()
    assert artifacts.model_available("monthly") is True


def test_health_reports_repo_mode(tmp_path, monkeypatch):
    monkeypatch.setattr(config, "MODEL_REPO", "afyalink/fake-model")
    monkeypatch.setattr(config, "DATA_REPO", "afyalink/fake-dataset")
    monkeypatch.setattr(config, "MODEL_DIR", tmp_path / "empty")

    def raise_not_cached(*a, **k):
        raise FileNotFoundError("not in cache")
    monkeypatch.setattr(artifacts, "snapshot_download", raise_not_cached)

    body = client.get("/health").json()
    assert body["status"] == "ok"
    assert body["models_available"] == {"daily": True, "monthly": True}
    assert body["model_source"] == "huggingface"
    assert body["model_repo"] == "afyalink/fake-model"
    assert body["data_repo"] == "afyalink/fake-dataset"


def test_health_reports_local_mode(tmp_path, monkeypatch):
    monkeypatch.setattr(config, "MODEL_REPO", "")
    monkeypatch.setattr(config, "MODEL_DIR", tmp_path / "empty")
    body = client.get("/health").json()
    assert body["models_available"] == {"daily": False, "monthly": False}
    assert body["model_source"] == "local"
    assert body["model_repo"] is None
