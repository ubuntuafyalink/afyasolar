/**
 * Turn a facility's real hazard exposure (0..100 indices) into concrete,
 * prioritized PRE-POSITIONING / surge-preparedness actions. This is the "what to
 * do" companion to climate-alert-rules.ts ("what's wrong"): both use the same
 * ALERT_THRESHOLD / CRITICAL_THRESHOLD so an alert and its actions stay in sync.
 *
 * Pure + bilingual (EN/SW); no DB, no React. Deterministic and unit-testable.
 */
import {
  ALERT_THRESHOLD,
  CRITICAL_THRESHOLD,
  type HazardSlice,
} from "@/lib/intelligence/climate-alert-rules"

export type Bilingual = { en: string; sw: string }

export type SurgeRecommendation = {
  hazard: keyof HazardSlice
  title: Bilingual
  score: number
  severity: "critical" | "high"
  /** Concrete pre-positioning actions, most important first. */
  actions: Bilingual[]
}

type SurgeDef = {
  hazard: keyof HazardSlice
  title: Bilingual
  actions: Bilingual[]
}

const SURGE_DEFS: SurgeDef[] = [
  {
    hazard: "heat",
    title: { en: "Heat / cold-chain surge", sw: "Msukumo wa joto / mnyororo baridi" },
    actions: [
      { en: "Stage backup cold boxes and ice packs for vaccines and medicines.", sw: "Andaa masanduku baridi ya akiba na barafu kwa chanjo na dawa." },
      { en: "Top up generator fuel and test automatic changeover.", sw: "Jaza mafuta ya jenereta na jaribu ubadilishaji wa kiotomatiki." },
      { en: "Check fridge seals and temperature logs twice daily.", sw: "Kagua mihuri ya friji na kumbukumbu za joto mara mbili kwa siku." },
      { en: "Brief staff on heat-stress care for patients and infants.", sw: "Elimisha wafanyakazi kuhusu huduma ya joto kali kwa wagonjwa na watoto." },
    ],
  },
  {
    hazard: "flood",
    title: { en: "Flood surge", sw: "Msukumo wa mafuriko" },
    actions: [
      { en: "Raise electrical panels, batteries and inverters above flood level.", sw: "Inua paneli za umeme, betri na inverta juu ya kiwango cha mafuriko." },
      { en: "Clear drainage and sandbag vulnerable entrances.", sw: "Safisha mifereji na weka magunia ya mchanga kwenye milango hatarishi." },
      { en: "Pre-stock clean water, ORS and diarrhoeal-disease supplies.", sw: "Hifadhi mapema maji safi, ORS na vifaa vya magonjwa ya kuhara." },
      { en: "Move drug stock and records off the floor to a dry store.", sw: "Hamisha dawa na kumbukumbu kutoka sakafuni kwenda ghala kavu." },
    ],
  },
  {
    hazard: "storm",
    title: { en: "Storm / wind surge", sw: "Msukumo wa dhoruba / upepo" },
    actions: [
      { en: "Secure roofing and tie down solar panels and mounts.", sw: "Imarisha paa na funga paneli za sola na vifaa vyake." },
      { en: "Stage backup power and charge all battery banks fully.", sw: "Andaa umeme wa akiba na chaji betri zote kikamilifu." },
      { en: "Protect windows and store loose outdoor equipment.", sw: "Linda madirisha na hifadhi vifaa vilivyo nje." },
    ],
  },
  {
    hazard: "drought",
    title: { en: "Water / drought surge", sw: "Msukumo wa maji / ukame" },
    actions: [
      { en: "Fill and secure water storage; service backup pumping.", sw: "Jaza na linda hifadhi ya maji; huduma pampu ya akiba." },
      { en: "Ration and prioritise water for maternity, theatre and WASH.", sw: "Gawanya na tanguliza maji kwa uzazi, upasuaji na usafi." },
      { en: "Pre-position hygiene supplies to prevent disease spread.", sw: "Andaa mapema vifaa vya usafi kuzuia kuenea kwa magonjwa." },
    ],
  },
]

/**
 * Build prioritized preparedness actions for each hazard at/above ALERT_THRESHOLD,
 * highest exposure first. Returns [] when nothing crosses the threshold (honest
 * "no action needed right now" empty state).
 */
export function buildSurgeRecommendations(byHazard: HazardSlice): SurgeRecommendation[] {
  const out: SurgeRecommendation[] = []
  for (const def of SURGE_DEFS) {
    const score = byHazard[def.hazard]
    if (score >= ALERT_THRESHOLD) {
      out.push({
        hazard: def.hazard,
        title: def.title,
        score,
        severity: score >= CRITICAL_THRESHOLD ? "critical" : "high",
        actions: def.actions,
      })
    }
  }
  return out.sort((a, b) => b.score - a.score)
}
