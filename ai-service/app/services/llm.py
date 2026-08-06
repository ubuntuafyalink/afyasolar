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

PORTFOLIO_SYSTEM_PROMPT = (
    "You are a fleet operations advisor for a network of solar-powered health "
    "facilities in Tanzania. Given a portfolio summary and the highest-risk "
    "facilities, write a concise weekly briefing (<=140 words) for the network "
    "operator: state how many facilities need attention, name the top facilities "
    "and why (battery life, anomalies, climate hazard), and give 1-3 fleet-wide "
    "actions to prioritise this week. Plain language, no jargon, no markdown headings."
)

EXPLAIN_SYSTEM_PROMPT = (
    "You explain a single AI prediction to a non-technical manager of a "
    "solar-powered health facility in Tanzania. Given one metric, its value and "
    "the drivers behind it, write a short plain-language explanation (<=110 words) "
    "covering: what this metric measures, what THIS value indicates (is it good or "
    "concerning), the main reasons behind it, and what to watch. Refer to the metric "
    "by the plain-language name in the input (e.g. its 'label'), never by a code like "
    "'battery_rul'. No jargon, no markdown headings, no bullet lists - just 2-4 clear "
    "sentences."
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


def build_portfolio_advisory(context: dict) -> dict:
    """Fleet-level briefing over a portfolio summary + its highest-risk facilities."""
    if config.LLM_API_KEY:
        try:
            return {"advisory": _call_llm(context, PORTFOLIO_SYSTEM_PROMPT),
                    "source": "llm", "model": config.LLM_MODEL}
        except Exception as err:  # noqa: BLE001 - never fail the request on LLM issues
            return {"advisory": _portfolio_fallback(context), "source": "fallback",
                    "error": str(err)}
    return {"advisory": _portfolio_fallback(context), "source": "fallback"}


def build_explanation(payload: dict) -> dict:
    """Explain one prediction (metric + value + drivers) in plain language.

    ``payload`` = {metric, value, unit?, lang?, context?}. Always returns a
    ``meaning`` (severity band + label) computed deterministically, plus an
    ``explanation`` from the LLM (in the requested language) or the rule-based
    fallback.
    """
    lang = "sw" if str(payload.get("lang", "en")).lower().startswith("sw") else "en"
    meaning = _explain_meaning(payload.get("metric", ""), payload.get("value"), lang)
    result = {"meaning": meaning}

    if config.LLM_API_KEY:
        try:
            prompt = EXPLAIN_SYSTEM_PROMPT + (
                " Respond in Swahili (Kiswahili)." if lang == "sw"
                else " Respond in English.")
            result.update(explanation=_call_llm(payload, prompt), source="llm",
                          model=config.LLM_MODEL)
            return result
        except Exception as err:  # noqa: BLE001 - never fail the request on LLM issues
            result.update(explanation=_explain_fallback(payload, meaning, lang),
                          source="fallback", error=str(err))
            return result
    result.update(explanation=_explain_fallback(payload, meaning, lang), source="fallback")
    return result


def _call_llm(context: dict, system_prompt: str = SYSTEM_PROMPT) -> str:
    url = config.LLM_BASE_URL.rstrip("/") + "/chat/completions"
    payload = {
        "model": config.LLM_MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
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


def _portfolio_fallback(context: dict) -> str:
    """Deterministic fleet briefing when no LLM is configured."""
    n = context.get("n_facilities", 0)
    at_risk = context.get("n_at_risk", 0)
    parts: list[str] = [
        f"{at_risk} of {n} facilities need attention this week."
        if n else "No facilities reported."
    ]

    top = context.get("top") or []
    if top:
        names = []
        for f in top[:3]:
            bits = []
            if f.get("rul_days") is not None:
                bits.append(f"battery ~{f['rul_days']}d")
            if f.get("anomalies"):
                bits.append(f"{f['anomalies']} anomaly(ies)")
            if f.get("hazard_composite"):
                bits.append(f"hazard {f['hazard_composite']}/100")
            detail = f" ({', '.join(bits)})" if bits else ""
            names.append(f"{f.get('name', 'facility')}{detail}")
        parts.append("Priority: " + "; ".join(names) + ".")

    avg_rul = context.get("avg_rul_days")
    if avg_rul is not None:
        parts.append(f"Average battery life across the fleet is ~{avg_rul} days.")

    total_anom = context.get("total_anomalies")
    if total_anom:
        parts.append(f"{total_anom} anomalous reading(s) detected fleet-wide - "
                     "schedule inspections for the flagged sites.")

    return " ".join(parts)


# --- Prediction explainer (deterministic bilingual scaffolding) ----------------

# Severity band labels per band key, English + Swahili.
_BAND_LABELS = {
    "low": {"en": "Low", "sw": "Chini"},
    "moderate": {"en": "Moderate", "sw": "Wastani"},
    "high": {"en": "High", "sw": "Juu"},
    "severe": {"en": "Severe", "sw": "Kali"},
    "critical": {"en": "Critical", "sw": "Hatari"},
    "watch": {"en": "Watch", "sw": "Angalia"},
    "healthy": {"en": "Healthy", "sw": "Nzuri"},
    "normal": {"en": "Normal", "sw": "Kawaida"},
    "flagged": {"en": "Flagged", "sw": "Onyo"},
    "info": {"en": "Estimate", "sw": "Makadirio"},
}

# One-line definitions per metric, English + Swahili.
_METRIC_DEF = {
    "composite_hazard": {
        "en": "The composite hazard blends heat, flood, storm and drought risk into one 0-100 score for the months ahead.",
        "sw": "Kipimo cha jumla cha hatari huchanganya joto, mafuriko, dhoruba na ukame kuwa alama moja 0-100 kwa miezi ijayo.",
    },
    "climate_hazard": {
        "en": "This 0-100 score rates one climate hazard over the forecast window, derived from the predicted weather.",
        "sw": "Alama hii ya 0-100 hupima hatari moja ya hali ya hewa kwa kipindi cha utabiri, kutokana na hali ya hewa iliyotabiriwa.",
    },
    "solar_yield": {
        "en": "The average solar energy your system is expected to generate per day, from the forecast sunlight.",
        "sw": "Wastani wa nishati ya jua mfumo wako unatarajiwa kuzalisha kwa siku, kutokana na mwanga wa jua uliotabiriwa.",
    },
    "battery_rul": {
        "en": "The estimated days until the battery reaches end-of-life, from its age and recent charge and temperature behaviour.",
        "sw": "Makadirio ya siku hadi betri kufikia mwisho wa maisha, kutokana na umri wake na tabia ya hivi karibuni ya kuchaji na joto.",
    },
    "anomaly": {
        "en": "The number of unusual battery or inverter readings in recent days that do not match normal patterns.",
        "sw": "Idadi ya visomo visivyo vya kawaida vya betri au inverter siku za hivi karibuni ambavyo havilingani na mifumo ya kawaida.",
    },
}


def _hazard_band(value: float) -> str:
    if value < 25:
        return "low"
    if value < 50:
        return "moderate"
    if value < 75:
        return "high"
    return "severe"


def _explain_meaning(metric: str, value, lang: str) -> dict:
    """Deterministic severity band + localized label for a metric value."""
    try:
        v = float(value) if value is not None else None
    except (TypeError, ValueError):
        v = None

    if metric in ("composite_hazard", "climate_hazard") and v is not None:
        band = _hazard_band(v)
    elif metric == "battery_rul" and v is not None:
        band = "critical" if v < 90 else "watch" if v < 180 else "healthy"
    elif metric == "anomaly" and v is not None:
        band = "flagged" if v >= 1 else "normal"
    else:
        band = "info"

    return {"band": band, "label": _BAND_LABELS[band][lang]}


def _explain_fallback(payload: dict, meaning: dict, lang: str) -> str:
    """Deterministic explanation when no LLM is configured."""
    metric = payload.get("metric", "")
    value = payload.get("value")
    unit = payload.get("unit") or ""
    ctx = payload.get("context") or {}
    definition = _METRIC_DEF.get(metric, {}).get(lang, "")
    label = meaning["label"]

    val_str = f"{value}{unit}".strip()
    if lang == "sw":
        line2 = f"Thamani ya sasa ni {val_str} ({label})." if value is not None else ""
    else:
        line2 = f"The current value is {val_str} ({label})." if value is not None else ""

    driver = ""
    if metric == "climate_hazard" and ctx.get("driverVariable"):
        dv = ctx["driverVariable"]
        driver = (f" Inatokana zaidi na {dv} iliyotabiriwa." if lang == "sw"
                  else f" It is driven mainly by the forecast {dv}.")
    elif metric == "battery_rul" and ctx.get("top_factors"):
        top = ctx["top_factors"][0]
        name = top.get("label") or top.get("feature", "")
        driver = (f" Kichocheo kikuu ni {name}." if lang == "sw"
                  else f" The main driver is {name}.")
    elif metric == "anomaly" and value:
        driver = (" Kagua betri na inverter kwa dalili zisizo za kawaida." if lang == "sw"
                  else " Inspect the battery and inverter for unusual behaviour.")

    return " ".join(p for p in (definition, line2 + driver) if p).strip()
