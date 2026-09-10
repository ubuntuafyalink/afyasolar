"""The optional shared-secret gate in front of the service."""
from __future__ import annotations

import importlib

import pytest
from fastapi.testclient import TestClient


def _client(monkeypatch, token: str | None):
    """Rebuild the app so middleware picks up the env at import time."""
    if token is None:
        monkeypatch.delenv("AI_SERVICE_TOKEN", raising=False)
    else:
        monkeypatch.setenv("AI_SERVICE_TOKEN", token)
    from app import config, main, security
    importlib.reload(config)
    importlib.reload(security)
    importlib.reload(main)
    return TestClient(main.app)


def test_no_token_configured_leaves_the_service_open(monkeypatch):
    """Existing deployments must keep working when the variable is unset."""
    client = _client(monkeypatch, None)
    assert client.get("/health").status_code == 200
    # A gated path is reachable without credentials.
    assert client.post("/hazards", json={}).status_code != 401


def test_token_configured_rejects_unauthenticated_calls(monkeypatch):
    client = _client(monkeypatch, "s3cret")
    res = client.post("/hazards", json={})
    assert res.status_code == 401
    assert res.headers.get("WWW-Authenticate") == "Bearer"


def test_health_stays_open_so_probes_do_not_need_the_secret(monkeypatch):
    client = _client(monkeypatch, "s3cret")
    assert client.get("/health").status_code == 200
    assert client.get("/").status_code == 200


def test_generated_schema_is_gated_too(monkeypatch):
    """/docs describes every endpoint, so it should not be readable without the secret."""
    client = _client(monkeypatch, "s3cret")
    assert client.get("/openapi.json").status_code == 401


def test_correct_token_is_accepted(monkeypatch):
    client = _client(monkeypatch, "s3cret")
    res = client.post("/hazards", json={}, headers={"Authorization": "Bearer s3cret"})
    assert res.status_code != 401


@pytest.mark.parametrize(
    "header",
    ["", "s3cret", "Basic s3cret", "Bearer", "Bearer ", "Bearer wrong", "bearer wrong"],
)
def test_malformed_or_wrong_credentials_are_rejected(monkeypatch, header):
    client = _client(monkeypatch, "s3cret")
    res = client.post("/hazards", json={}, headers={"Authorization": header})
    assert res.status_code == 401


def test_non_ascii_configured_token_still_rejects_cleanly(monkeypatch):
    """An operator may set a non-ASCII secret.

    compare_digest raises TypeError when handed non-ASCII str, which would turn
    every request into a 500 instead of a 401. Comparing bytes avoids that. A
    caller cannot present such a token — HTTP headers are ASCII — so the only
    reachable behaviour is a clean rejection.
    """
    client = _client(monkeypatch, "t\u00f6k\u00e9n")
    res = client.post("/hazards", json={}, headers={"Authorization": "Bearer wrong"})
    assert res.status_code == 401


def test_scheme_is_case_insensitive(monkeypatch):
    client = _client(monkeypatch, "s3cret")
    res = client.post("/hazards", json={}, headers={"Authorization": "bearer s3cret"})
    assert res.status_code != 401
