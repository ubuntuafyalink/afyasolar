"""
LLM advisory layer: turn the engine's model outputs (hazards, yield, RUL,
anomalies) into a concise plain-language advisory for a facility manager.

Provider-agnostic via any OpenAI-compatible chat API; defaults to Groq
(open-weights models, DPG-friendly). With no API key configured it falls back to
a deterministic rule-based summary, so the endpoint always returns something
useful. Uses plain requests - no vendor SDK.
"""
from __future__ import annotations

import json

import requests

from app import config

SYSTEM_PROMPT = (
    "You are an energy-resilience advisor for solar-powered health facilities in "
    "Tanzania. Given the model outputs, write a concise, practical advisory (<=120 "
    "words) for a facility manager covering: current climate hazards, expected "
    "solar yield, equipment health / maintenance risk, and 1-3 recommended "
    "actions. Plain language, no jargon, no markdown headings."
)


def build_advisory(context: dict) -> dict:
    if config.LLM_API_KEY:
        try:
            return {"advisory": _call_llm(context), "source": "llm",
                    "model": config.LLM_MODEL}
        except Exception as err:  # noqa: BLE001 - never fail the request on LLM issues
            return {"advisory": _fallback(context), "source": "fallback",
                    "error": str(err)}
    return {"advisory": _fallback(context), "source": "fallback"}


def _call_llm(context: dict) -> str:
    url = config.LLM_BASE_URL.rstrip("/") + "/chat/completions"
    payload = {
        "model": config.LLM_MODEL,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": json.dumps(context, default=str)},
        ],
        "temperature": 0.3,
        "max_tokens": 320,
    }
    resp = requests.post(
        url,
        headers={"Authorization": f"Bearer {config.LLM_API_KEY}",
                 "Content-Type": "application/json"},
        json=payload,
        timeout=config.LLM_TIMEOUT,
    )
    resp.raise_for_status()
    return resp.json()["choices"][0]["message"]["content"].strip()


def _fallback(context: dict) -> str:
    """Deterministic summary when no LLM is configured."""
    parts: list[str] = []

    hazards = context.get("hazards")
    if hazards:
        keys = ("heat", "flood", "storm", "drought")
        top = max(keys, key=lambda k: hazards.get(k, 0))
        parts.append(
            f"Climate: composite hazard {hazards.get('composite', '?')}/100; "
            f"highest is {top} ({hazards.get(top, '?')}/100).")

    yld = context.get("yield")
    if yld:
        parts.append(f"Solar: about {yld.get('mean_daily_kwh', '?')} kWh/day expected.")

    rul = context.get("rul")
    if rul and rul.get("rul_days") is not None:
        d = rul["rul_days"]
        tail = " Plan a battery replacement soon." if isinstance(d, (int, float)) and d < 180 else ""
        parts.append(f"Battery: ~{d} days to end-of-life.{tail}")

    anomaly = context.get("anomaly")
    if anomaly:
        n = (sum(1 for x in anomaly if x.get("anomaly")) if isinstance(anomaly, list)
             else int(bool(anomaly.get("anomaly"))))
        if n:
            parts.append(f"Alerts: {n} anomalous reading(s) - inspect the system.")

    return " ".join(parts) or "No advisory inputs provided."
