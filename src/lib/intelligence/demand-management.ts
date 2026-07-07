/**
 * Advisory demand-management ("load plan"): from a facility's real energy state,
 * recommend WHICH loads to shed or schedule and WHEN, to protect critical services
 * and ride through low-solar / outage windows.
 *
 * This is ADVISORY ONLY — the platform has no relay/hardware actuation, so we never
 * claim to switch anything. It tells staff what to do (like surge-recommendations
 * does for climate). Pure + bilingual (EN/SW); deterministic and unit-testable.
 */
import { SOLAR_PR } from "@/lib/dashboard/power-model"

export type Bilingual = { en: string; sw: string }
export type DemandPriority = "critical" | "high" | "advisory"

export type DemandAction = {
  priority: DemandPriority
  title: Bilingual
  detail: Bilingual
}

export type DemandInput = {
  /** Critical-load battery autonomy, hours. */
  autonomyHours: number
  /** Today's solar resource (peak-sun-hours). */
  peakSunHours: number
  sky: "sunny" | "partly" | "cloudy"
  criticalLoadKw: number
  solarCapacityKw: number
  dailyLoadKwh: number
  /** Elevated climate hazard (keep more reserve). */
  hazardHigh?: boolean
}

const PRIORITY_RANK: Record<DemandPriority, number> = { critical: 0, high: 1, advisory: 2 }

/**
 * Build prioritized load-management actions. Always includes the solar-scheduling
 * and protect-critical advisories; escalates as battery autonomy / solar fall.
 */
export function buildDemandActions(input: DemandInput): DemandAction[] {
  const actions: DemandAction[] = []
  const expectedSolarKwh = Math.max(0, input.solarCapacityKw * input.peakSunHours * SOLAR_PR)
  const surplus = input.dailyLoadKwh > 0 && expectedSolarKwh > input.dailyLoadKwh * 1.1

  // Protect critical services — always first.
  actions.push({
    priority: "critical",
    title: { en: "Keep critical loads protected", sw: "Linda mizigo muhimu" },
    detail: {
      en: "Never shed cold-chain (vaccine fridge), maternity, theatre or oxygen. Shed only non-critical loads.",
      sw: "Usikate kamwe mnyororo baridi (friji ya chanjo), uzazi, chumba cha upasuaji au oksijeni. Kata mizigo isiyo muhimu tu.",
    },
  })

  if (input.autonomyHours < 6) {
    actions.push({
      priority: "critical",
      title: { en: "Shed non-critical loads now", sw: "Kata mizigo isiyo muhimu sasa" },
      detail: {
        en: `Battery autonomy is low (~${input.autonomyHours.toFixed(1)} h). Turn off lighting in unused rooms, ICT and non-urgent equipment to preserve reserve for critical care.`,
        sw: `Uwezo wa betri ni mdogo (~${input.autonomyHours.toFixed(1)} h). Zima taa kwenye vyumba visivyotumika, ICT na vifaa visivyo vya dharura ili kulinda akiba kwa huduma muhimu.`,
      },
    })
  } else if (input.autonomyHours < 12) {
    actions.push({
      priority: "high",
      title: { en: "Reduce discretionary loads this evening", sw: "Punguza matumizi yasiyo ya lazima jioni" },
      detail: {
        en: `Autonomy is moderate (~${input.autonomyHours.toFixed(1)} h). Defer heavy or optional loads overnight to keep a safe reserve.`,
        sw: `Uwezo ni wa wastani (~${input.autonomyHours.toFixed(1)} h). Ahirisha mizigo mizito au ya hiari usiku ili kuweka akiba salama.`,
      },
    })
  }

  if (input.sky === "cloudy" || input.peakSunHours < 4) {
    actions.push({
      priority: "high",
      title: { en: "Low solar today — conserve battery", sw: "Sola ndogo leo — hifadhi betri" },
      detail: {
        en: "Weak solar resource expected. Defer autoclave, pumping and laundry, and minimise midday discretionary use.",
        sw: "Sola dhaifu inatarajiwa. Ahirisha mashine ya kuua vijidudu, kusukuma maji na kufua, na punguza matumizi yasiyo ya lazima mchana.",
      },
    })
  }

  // Scheduling advisory (always useful).
  actions.push({
    priority: "advisory",
    title: { en: "Schedule heavy loads to solar peak", sw: "Panga mizigo mizito kwenye kilele cha sola" },
    detail: {
      en: "Run autoclave, water pumping and laundry between about 10:00–15:00 so they draw directly from the sun, not the battery or generator.",
      sw: "Endesha mashine ya kuua vijidudu, kusukuma maji na kufua kati ya saa 10:00–15:00 ili zitumie jua moja kwa moja, si betri au jenereta.",
    },
  })

  if (surplus) {
    actions.push({
      priority: "advisory",
      title: { en: "Surplus solar midday — use it", sw: "Sola ya ziada mchana — itumie" },
      detail: {
        en: "Expected daytime generation exceeds your load. Midday is a good time for pumping to storage, sterilising and charging devices.",
        sw: "Uzalishaji wa mchana unaotarajiwa unazidi mahitaji yako. Mchana ni wakati mzuri wa kusukuma maji hifadhini, kuua vijidudu na kuchaji vifaa.",
      },
    })
  }

  if (input.hazardHigh) {
    actions.push({
      priority: "high",
      title: { en: "Elevated hazard — hold extra reserve", sw: "Hatari imeongezeka — weka akiba zaidi" },
      detail: {
        en: "With elevated climate hazard, keep a larger battery reserve for critical care and pre-position backup cold boxes and fuel.",
        sw: "Kwa hatari ya hali ya hewa iliyoongezeka, weka akiba kubwa ya betri kwa huduma muhimu na andaa masanduku baridi ya akiba na mafuta.",
      },
    })
  }

  return actions.sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority])
}
