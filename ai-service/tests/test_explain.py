"""Tests for the /explain prediction-explainer endpoint."""
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_explain_battery_rul():
    r = client.post("/explain", json={
        "metric": "battery_rul", "value": 85, "unit": " days", "lang": "en",
        "context": {"status": "critical",
                    "top_factors": [{"label": "System age", "value": 700, "importance": 0.4}]},
    })
    assert r.status_code == 200
    j = r.json()
    assert isinstance(j["explanation"], str) and j["explanation"].strip()
    assert j["source"] in ("llm", "fallback")
    assert j["meaning"]["band"] == "critical"


def test_explain_climate_hazard_band():
    r = client.post("/explain", json={
        "metric": "climate_hazard", "value": 100, "lang": "en",
        "context": {"hazard": "flood", "driverVariable": "rainfall"},
    })
    assert r.status_code == 200
    j = r.json()
    assert j["meaning"]["band"] == "severe"
    assert j["explanation"].strip()


def test_explain_swahili_label():
    r = client.post("/explain", json={"metric": "composite_hazard", "value": 20, "lang": "sw"})
    assert r.status_code == 200
    j = r.json()
    # 20/100 -> low band; Swahili label is "Chini".
    assert j["meaning"]["band"] == "low"
    assert j["meaning"]["label"] == "Chini"


def test_explain_rejects_bad_metric():
    r = client.post("/explain", json={"metric": "not_a_metric", "value": 1})
    assert r.status_code == 422
