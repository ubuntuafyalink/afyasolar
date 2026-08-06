/**
 * Pure rules that turn a facility's real NASA POWER hazard exposure (0..100
 * indices) into candidate climate alerts. No DB, no React - deterministic and
 * unit-testable. The generate-alerts route applies these, dedupes against
 * existing active alerts, and writes real device_alerts rows.
 */
export type HazardSlice = { flood: number; drought: number; heat: number; storm: number }

export type ClimateAlertCandidate = {
  /** Stable code used for dedupe (one active alert per facility + code). */
  code: string
  /** Free-form alert type rendered as a chip in the console. */
  alertType: string
  severity: "critical" | "high"
  title: string
  message: string
  hazard: keyof HazardSlice
  score: number
  threshold: number
}

/** Exposure at/above this 0..100 index raises an alert. */
export const ALERT_THRESHOLD = 66
/** At/above this index the alert is critical rather than high. */
export const CRITICAL_THRESHOLD = 80

function severityFor(score: number): "critical" | "high" {
  return score >= CRITICAL_THRESHOLD ? "critical" : "high"
}

type RuleDef = {
  hazard: keyof HazardSlice
  code: string
  alertType: string
  title: string
  message: (facility: string, score: number) => string
}

const RULES: RuleDef[] = [
  {
    hazard: "heat",
    code: "CLIMATE_HEAT_COLDCHAIN",
    alertType: "cold-chain",
    title: "Cold-chain heat risk",
    message: (f, s) =>
      `High heat exposure (${s}/100) at ${f} - vaccine cold-chain at elevated failure risk. Stage backup cold boxes and generator fuel.`,
  },
  {
    hazard: "flood",
    code: "CLIMATE_FLOOD",
    alertType: "flood",
    title: "Flood risk",
    message: (f, s) =>
      `High flood exposure (${s}/100) at ${f} - raise equipment, protect power, and check drainage.`,
  },
  {
    hazard: "storm",
    code: "CLIMATE_STORM",
    alertType: "storm",
    title: "Storm risk",
    message: (f, s) =>
      `High wind/storm exposure (${s}/100) at ${f} - secure roofing and solar panels, stage backup power.`,
  },
  {
    hazard: "drought",
    code: "CLIMATE_DROUGHT_WATER",
    alertType: "drought",
    title: "Water / drought risk",
    message: (f, s) =>
      `High drought exposure (${s}/100) at ${f} - secure water storage and backup pumping.`,
  },
]

/**
 * Evaluate all climate rules for one facility's hazard exposure. Returns one
 * candidate per hazard at/above the threshold, highest score first.
 */
export function evaluateClimateAlerts(byHazard: HazardSlice, facilityName: string): ClimateAlertCandidate[] {
  const out: ClimateAlertCandidate[] = []
  for (const rule of RULES) {
    const score = byHazard[rule.hazard]
    if (score >= ALERT_THRESHOLD) {
      out.push({
        code: rule.code,
        alertType: rule.alertType,
        severity: severityFor(score),
        title: rule.title,
        message: rule.message(facilityName, score),
        hazard: rule.hazard,
        score,
        threshold: ALERT_THRESHOLD,
      })
    }
  }
  return out.sort((a, b) => b.score - a.score)
}
