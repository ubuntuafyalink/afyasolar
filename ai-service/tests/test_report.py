"""Tests for the /predict/outlook-report endpoint and its deterministic core.

Every test forces the keyless path (monkeypatching LLM_API_KEY) so they exercise
the deterministic fallback regardless of any configured Groq key.
"""
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def _post(hazards, monkeypatch, **extra):
    from app import config
    monkeypatch.setattr(config, "LLM_API_KEY", "")
    return client.post("/predict/outlook-report",
                       json={"hazards": hazards, **extra})


def test_outlook_report_action_needed_en(monkeypatch):
    r = _post({"heat": 55, "flood": 78, "storm": 20, "drought": 10, "composite": 41},
              monkeypatch)
    assert r.status_code == 200
    j = r.json()
    assert j["status"] == "action_needed"
    assert j["source"] == "fallback"
    # Sorted by score descending: flood (78) before heat (55).
    assert [t["hazard"] for t in j["triggered"]] == ["flood", "heat"]
    flood = j["triggered"][0]
    assert flood["band"] == "severe" and flood["band_label"] == "Severe"
    assert len(flood["actions"]) >= 3
    assert all(isinstance(a, str) and a.strip() for a in flood["actions"])
    assert "flood" in j["summary"].lower()
    assert "generated_at" in j


def test_outlook_report_all_clear_sw(monkeypatch):
    r = _post({"heat": 10, "flood": 20, "storm": 5, "drought": 15, "composite": 12},
              monkeypatch, lang="sw")
    assert r.status_code == 200
    j = r.json()
    assert j["status"] == "all_clear"
    assert j["triggered"] == []
    assert j["lang"] == "sw"
    # Swahili safe-outlook summary, deterministic.
    assert "salama" in j["summary"].lower()


def test_outlook_report_moderate_is_watch_not_triggered(monkeypatch):
    r = _post({"heat": 40, "flood": 10, "storm": 5, "drought": 0, "composite": 14},
              monkeypatch)
    j = r.json()
    assert j["status"] == "all_clear"
    assert j["triggered"] == []
    assert [w["hazard"] for w in j["watch"]] == ["heat"]
    assert j["watch"][0]["band"] == "moderate"
    assert "actions" not in j["watch"][0]
    assert "heat" in j["summary"].lower()  # safe summary still names watch items


def test_outlook_report_threshold_boundaries(monkeypatch):
    # Exactly 50 triggers (band "high"); exactly 25 is a watch item; 24 is neither.
    j = _post({"heat": 50, "flood": 25, "storm": 24, "drought": 0, "composite": 25},
              monkeypatch).json()
    assert [t["hazard"] for t in j["triggered"]] == ["heat"]
    assert [w["hazard"] for w in j["watch"]] == ["flood"]


def test_outlook_report_portfolio_mentions_count(monkeypatch):
    r = _post({"heat": 60, "flood": 30, "storm": 10, "drought": 20, "composite": 30},
              monkeypatch, scope="portfolio", context={"facility_count": 14})
    j = r.json()
    assert j["scope"] == "portfolio"
    assert "14" in j["summary"]


def test_outlook_report_swahili_actions(monkeypatch):
    j = _post({"heat": 80, "flood": 10, "storm": 5, "drought": 0, "composite": 24},
              monkeypatch, lang="sw").json()
    heat = j["triggered"][0]
    assert heat["band_label"] == "Kali"          # severe, Swahili label
    assert any("betri" in a for a in heat["actions"])  # localized action text


def test_outlook_report_validation(monkeypatch):
    from app import config
    monkeypatch.setattr(config, "LLM_API_KEY", "")
    # Score out of range.
    r = client.post("/predict/outlook-report", json={
        "hazards": {"heat": 101, "flood": 0, "storm": 0, "drought": 0, "composite": 0}})
    assert r.status_code == 422
    # Missing hazards entirely.
    assert client.post("/predict/outlook-report", json={}).status_code == 422
    # Bad language code.
    r = client.post("/predict/outlook-report", json={
        "hazards": {"heat": 1, "flood": 1, "storm": 1, "drought": 1, "composite": 1},
        "lang": "fr"})
    assert r.status_code == 422
