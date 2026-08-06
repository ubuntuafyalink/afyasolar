"""API smoke tests that do not depend on any trained model."""
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_ok():
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_hazards_endpoint():
    r = client.post("/hazards", json={
        "series": {"T2M_MAX": [35], "PRECTOTCORR": [0], "WS10M": [12]},
        "temporal": "monthly",
    })
    assert r.status_code == 200
    body = r.json()
    assert 0 <= body["composite"] <= 100
    assert body["heat"] > 0 and body["storm"] > 0


def test_yield_endpoint():
    r = client.post("/yield", json={"irradiance_psh": [5.5, 6.0], "system_kw": 4.2})
    assert r.status_code == 200
    assert r.json()["total_kwh"] > 0


def test_yield_rejects_bad_system():
    r = client.post("/yield", json={"irradiance_psh": [5.5], "system_kw": 0})
    assert r.status_code == 422  # pydantic gt=0 validation


def test_forecast_requires_model():
    r = client.post("/forecast", json={"location_id": "tz-2", "horizon": "monthly"})
    assert r.status_code == 503  # no fine-tuned Chronos present


def test_advisory_fallback_without_llm_key():
    r = client.post("/advisory", json={
        "facility_id": "tz-2",
        "hazards": {"heat": 60, "flood": 10, "storm": 80, "drought": 20, "composite": 42},
        "yield": {"mean_daily_kwh": 22.5},
    })
    assert r.status_code == 200
    body = r.json()
    assert body["source"] == "fallback"
    assert "hazard" in body["advisory"].lower()
