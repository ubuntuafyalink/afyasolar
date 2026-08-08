"""
Climate outlook report: turn already-computed hazard scores into an explicit
"what should I do" layer - concrete per-hazard recommended actions when any
hazard is high, or an explicit "safe outlook" statement when none is.

The action lists and summary are deterministic and bilingual (en/sw), so the
report is fully functional without an LLM key. When a key is configured, the
LLM only rewrites the narrative summary - it can never add, remove or alter
the recommended actions.
"""
from __future__ import annotations

from app import config
from app.services.llm import BAND_LABELS, call_llm, hazard_band

HAZARD_KEYS = ("heat", "flood", "storm", "drought")

# Same band thresholds as the web app's computeBand (25/50/75): actions trigger
# at "high" (>= 50); "moderate" (25..49) hazards are listed as watch items.
TRIGGER_SCORE = 50
WATCH_SCORE = 25

HAZARD_NAMES = {
    "heat": {"en": "Heat", "sw": "Joto"},
    "flood": {"en": "Flood", "sw": "Mafuriko"},
    "storm": {"en": "Storm", "sw": "Dhoruba"},
    "drought": {"en": "Drought", "sw": "Ukame"},
}

# Deterministic recommended actions per hazard, bilingual. Ordered by priority.
OUTLOOK_ACTIONS: dict[str, list[dict[str, str]]] = {
    "flood": [
        {"en": "Raise batteries, inverters and charge controllers above likely flood level.",
         "sw": "Inua betri, inverter na vidhibiti vya chaji juu ya kiwango kinachoweza kufikiwa na mafuriko."},
        {"en": "Check and clear drainage around the solar array and battery room.",
         "sw": "Kagua na safisha mifereji ya maji kuzunguka paneli za jua na chumba cha betri."},
        {"en": "Protect outdoor wiring, sockets and combiner boxes with waterproof covers.",
         "sw": "Kinga nyaya za nje, soketi na masanduku ya umeme kwa vifuniko visivyopitisha maji."},
        {"en": "Move critical medical equipment and supplies off the floor.",
         "sw": "Ondoa vifaa muhimu vya tiba na dawa kutoka sakafuni."},
    ],
    "heat": [
        {"en": "Improve ventilation or shading for the battery room - heat shortens battery life.",
         "sw": "Boresha upitishaji hewa au kivuli cha chumba cha betri - joto hupunguza maisha ya betri."},
        {"en": "Check vaccine fridge and cold-chain temperatures more frequently.",
         "sw": "Kagua mara kwa mara zaidi joto la jokofu la chanjo na mnyororo wa baridi."},
        {"en": "Schedule heavy electrical loads for cooler morning or evening hours.",
         "sw": "Panga mizigo mikubwa ya umeme kwa saa za asubuhi au jioni zenye ubaridi."},
    ],
    "storm": [
        {"en": "Inspect panel mounting bolts and secure any loose racking.",
         "sw": "Kagua nati zinazoshikilia paneli na imarisha fremu zilizolegea."},
        {"en": "Trim branches that could fall on panels or power lines.",
         "sw": "Punguza matawi yanayoweza kuangukia paneli au nyaya za umeme."},
        {"en": "Charge batteries fully ahead of forecast storm days.",
         "sw": "Chaji betri zijae kabla ya siku za dhoruba zilizotabiriwa."},
    ],
    "drought": [
        {"en": "Expect dust build-up - clean panels more often to protect solar yield.",
         "sw": "Tarajia vumbi kuongezeka - safisha paneli mara kwa mara zaidi kulinda uzalishaji wa umeme."},
        {"en": "Review water storage for panel cleaning and facility needs.",
         "sw": "Kagua hifadhi ya maji kwa ajili ya usafi wa paneli na mahitaji ya kituo."},
        {"en": "Watch battery temperatures - dry seasons often bring extra heat stress.",
         "sw": "Fuatilia joto la betri - misimu ya ukame mara nyingi huja na joto la ziada."},
    ],
}

OUTLOOK_SYSTEM_PROMPT = (
    "You write the summary line of a climate outlook report for a solar-powered "
    "health facility service in Tanzania. Given hazard scores (0-100), their "
    "severity bands, and the already-decided recommended actions, write <=90 "
    "words of plain language: state which hazards need attention (or that the "
    "outlook is clear), and reinforce - never contradict, add to or remove - the "
    "given actions. No markdown, no lists, no headings."
)


def build_outlook_report(hazards: dict, lang: str = "en",
                         scope: str = "facility",
                         context: dict | None = None) -> dict:
    """Build the outlook report from pre-computed hazard indices (0..100).

    ``hazards`` must carry heat/flood/storm/drought (+ composite). The caller
    passes the same numbers it displays, so report and chart always agree.
    """
    lang = "sw" if str(lang).lower().startswith("sw") else "en"
    scope = "portfolio" if scope == "portfolio" else "facility"
    context = context or {}

    scored = []
    for key in HAZARD_KEYS:
        try:
            score = int(round(float(hazards.get(key, 0))))
        except (TypeError, ValueError):
            score = 0
        band = hazard_band(score)
        scored.append({
            "hazard": key,
            "name": HAZARD_NAMES[key][lang],
            "score": score,
            "band": band,
            "band_label": BAND_LABELS[band][lang],
        })

    triggered = sorted((dict(s, actions=[a[lang] for a in OUTLOOK_ACTIONS[s["hazard"]]])
                        for s in scored if s["score"] >= TRIGGER_SCORE),
                       key=lambda s: s["score"], reverse=True)
    watch = sorted((s for s in scored
                    if WATCH_SCORE <= s["score"] < TRIGGER_SCORE),
                   key=lambda s: s["score"], reverse=True)
    status = "action_needed" if triggered else "all_clear"

    summary = _fallback_summary(status, triggered, watch, lang, scope, context)
    result = {
        "status": status,
        "triggered": triggered,
        "watch": watch,
        "summary": summary,
        "source": "fallback",
        "lang": lang,
        "scope": scope,
    }

    if config.LLM_API_KEY:
        try:
            prompt = OUTLOOK_SYSTEM_PROMPT + (
                " Respond in Swahili (Kiswahili)." if lang == "sw" else " Respond in English.")
            payload = {
                "scope": scope,
                "hazards": hazards,
                "bands": {s["hazard"]: s["band"] for s in scored},
                "recommended_actions": {t["hazard"]: t["actions"] for t in triggered},
                "status": status,
                **({"facility_count": context.get("facility_count")}
                   if context.get("facility_count") else {}),
            }
            result.update(summary=call_llm(payload, prompt), source="llm",
                          model=config.LLM_MODEL)
        except Exception as err:  # noqa: BLE001 - never fail the report on LLM issues
            result["error"] = str(err)

    return result


def _fmt_hazards(items: list[dict]) -> str:
    return ", ".join(f"{s['name'].lower()} ({s['score']}/100, {s['band_label'].lower()})"
                     for s in items)


def _fallback_summary(status: str, triggered: list[dict], watch: list[dict],
                      lang: str, scope: str, context: dict) -> str:
    """Deterministic bilingual summary; portfolio scope mentions the fleet size."""
    sw = lang == "sw"
    n = context.get("facility_count")

    if scope == "portfolio":
        prefix = (f"Katika vituo {n} vilivyotabiriwa, " if sw
                  else f"Across {n} forecast facilities, ") if n else ""
    else:
        prefix = ""

    if status == "action_needed":
        listed = _fmt_hazards(triggered)
        if sw:
            head = (f"{prefix}hatari za tabianchi zinahitaji hatua: {listed}."
                    if prefix else f"Hatari za tabianchi zinahitaji hatua: {listed}.")
            tail = " Fuata hatua zilizopendekezwa hapa chini kulinda mfumo wa jua na huduma za afya."
        else:
            head = (f"{prefix}climate hazards need attention: {listed}."
                    if prefix else f"Climate hazards need attention: {listed}.")
            tail = (" Follow the recommended actions below to protect the solar "
                    "system and health services.")
        return head + tail

    if sw:
        head = (f"{prefix}hakuna hatari kubwa za tabianchi zilizotabiriwa - mwelekeo ni salama."
                if prefix else
                "Hakuna hatari kubwa za tabianchi zilizotabiriwa kwa miezi ijayo - mwelekeo ni salama.")
        tail = (f" Endelea kufuatilia: {_fmt_hazards(watch)}." if watch
                else " Endelea na matengenezo ya kawaida ya mfumo.")
    else:
        head = (f"{prefix}no high climate hazards are forecast - the outlook is safe."
                if prefix else
                "No high climate hazards are forecast for the months ahead - the outlook is safe.")
        tail = (f" Keep an eye on: {_fmt_hazards(watch)}." if watch
                else " Continue routine system maintenance.")
    return head + tail
