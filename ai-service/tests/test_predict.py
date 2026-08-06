"""Tests for the combined /predict/climate endpoint and location resolution."""
from fastapi.testclient import TestClient

from app.main import app
from app.services.hazards import hazard_trajectory
from app.services.locations import haversine_km, location_exists, nearest_location

client = TestClient(app)


def test_hazard_trajectory_shape_and_bounds():
    ts = ["2025-01-01", "2025-02-01", "2025-03-01"]
    series = {
        "T2M_MAX": [31, 34, 42],
        "PRECTOTCORR": [0.0, 8.0, 200.0],
        "WS10M": [5, 10, 15],
    }
    traj = hazard_trajectory(ts, series, temporal="monthly")
    assert len(traj) == 3
    for step in traj:
        for key in ("heat", "flood", "storm", "drought"):
            assert 0 <= step[key] <= 100
    # dry month (0 precip) -> high drought, low flood; very wet month -> inverse
    assert traj[0]["drought"] == 100 and traj[0]["flood"] == 0
    assert traj[2]["flood"] == 100 and traj[2]["drought"] == 0


def test_nearest_location_dar_es_salaam():
    # tz-2 is Dar es Salaam at (-6.79, 39.21); an exact hit -> ~0 km.
    loc_id, dist = nearest_location(-6.79, 39.21)
    assert loc_id == "tz-2"
    assert dist < 1.0


def test_nearest_location_picks_closest_not_arbitrary():
    # A point near Arusha (-3.39, 36.68 = tz-1) should resolve there.
    loc_id, _ = nearest_location(-3.4, 36.7)
    assert loc_id == "tz-1"


def test_haversine_zero_distance():
    assert haversine_km(-6.79, 39.21, -6.79, 39.21) == 0.0


def test_location_exists():
    assert location_exists("tz-2")
    assert not location_exists("does-not-exist")


def test_predict_requires_location_or_coords():
    r = client.post("/predict/climate", json={"horizon": "monthly"})
    assert r.status_code == 400


def test_predict_unknown_location_id():
    r = client.post("/predict/climate", json={"location_id": "nope", "horizon": "monthly"})
    assert r.status_code == 400


def test_predict_requires_trained_model():
    # With no model artifact present, resolving a valid location returns 503.
    r = client.post("/predict/climate", json={"lat": -6.79, "lon": 39.21, "horizon": "monthly"})
    assert r.status_code in (503, 200)  # 503 before artifacts exist; 200 once built


def test_predict_climate_months_window():
    # The months window restricts the trajectory to at most N steps.
    r = client.post("/predict/climate",
                    json={"lat": -6.79, "lon": 39.21, "horizon": "monthly", "months": 3})
    assert r.status_code in (503, 200)
    if r.status_code == 200:
        j = r.json()
        assert len(j["hazards_monthly"]) <= 3
        for key in ("heat", "flood", "storm", "drought", "composite"):
            assert 0 <= j["hazards"][key] <= 100


def test_predict_climate_rejects_bad_months():
    r = client.post("/predict/climate",
                    json={"lat": -6.79, "lon": 39.21, "horizon": "monthly", "months": 0})
    assert r.status_code == 422  # ge=1


def test_predict_maintenance():
    r = client.post("/predict/maintenance",
                    json={"facility_id": "fac-1", "age_days": 600, "system_kw": 6})
    # 503 if the RUL/anomaly models are not trained; otherwise a full result.
    assert r.status_code in (503, 200)
    if r.status_code == 200:
        j = r.json()
        assert "rul_days" in j["rul"]
        assert j["health"]["status"] in ("critical", "warning", "healthy")
        assert isinstance(j["anomaly"]["n"], int)
        assert j["based_on"] == "simulated"


def test_predict_maintenance_rejects_empty_facility():
    r = client.post("/predict/maintenance", json={"facility_id": "", "system_kw": 6})
    assert r.status_code == 422  # pydantic min_length


def test_predict_advisory_returns_advisory():
    # Composes climate (best-effort) + maintenance (best-effort), then the LLM/
    # fallback advisory. Always 200: legs are optional and the fallback is keyless.
    r = client.post("/predict/advisory",
                    json={"facility_id": "fac-1", "lat": -6.79, "lon": 39.21,
                          "age_days": 700, "system_kw": 6})
    assert r.status_code == 200
    j = r.json()
    assert isinstance(j["advisory"], str) and j["advisory"].strip()
    assert j["source"] in ("llm", "fallback")
    assert "inputs" in j and "generated_at" in j


def test_predict_advisory_rejects_empty_facility():
    r = client.post("/predict/advisory", json={"facility_id": ""})
    assert r.status_code == 422  # pydantic min_length


def test_predict_portfolio_advisory_returns_briefing():
    r = client.post("/predict/portfolio-advisory", json={
        "n_facilities": 12,
        "n_at_risk": 3,
        "avg_rul_days": 420,
        "total_anomalies": 5,
        "top": [
            {"name": "Bagamoyo DH", "rul_days": 85, "status": "critical",
             "anomalies": 2, "hazard_composite": 62},
            {"name": "Kigamboni HC", "rul_days": 150, "status": "warning",
             "anomalies": 1, "hazard_composite": 40},
        ],
    })
    assert r.status_code == 200
    j = r.json()
    assert isinstance(j["advisory"], str) and j["advisory"].strip()
    assert j["source"] in ("llm", "fallback")
    assert "generated_at" in j


def test_predict_portfolio_advisory_rejects_bad_body():
    # n_at_risk must be a non-negative int; a negative value fails validation.
    r = client.post("/predict/portfolio-advisory", json={"n_at_risk": -1})
    assert r.status_code == 422
