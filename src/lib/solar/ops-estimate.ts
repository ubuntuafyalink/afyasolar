/**
 * Pure, IO-free derivation of ESTIMATED solar generation/savings for the admin
 * Solar Operations views. There is no metered telemetry; figures are either taken
 * from a facility's energy assessment (design estimate) or modeled from system size
 * x NASA peak-sun-hours. Always labeled with `source` so the UI can mark estimates.
 */

/** Performance ratio for the modeled fallback (matches SOLAR_PR in lib/dashboard/power-model.ts). */
export const SOLAR_PR = 0.78
/** Documented derivation factors (same as the prior analytics route). */
export const CO2_KG_PER_KWH = 0.5
export const TZS_PER_KWH = 150

export type EstimateSource = "assessment" | "modeled" | "none"

function round1(n: number): number {
  return Math.round(n * 10) / 10
}

/**
 * Choose the estimated daily generation: prefer the assessment's own design figure,
 * else model systemKw x peakSunHours x performanceRatio, else none.
 */
export function resolveEstimatedDailyKwh(opts: {
  assessmentDailyKwh?: number | null
  systemKw?: number | null
  peakSunHours?: number | null
  pr?: number
}): { estimatedDailyKwh: number | null; source: EstimateSource } {
  const { assessmentDailyKwh, systemKw, peakSunHours, pr = SOLAR_PR } = opts
  if (assessmentDailyKwh != null && assessmentDailyKwh > 0) {
    return { estimatedDailyKwh: round1(assessmentDailyKwh), source: "assessment" }
  }
  if (systemKw != null && systemKw > 0 && peakSunHours != null && peakSunHours > 0) {
    return { estimatedDailyKwh: round1(systemKw * peakSunHours * pr), source: "modeled" }
  }
  return { estimatedDailyKwh: null, source: "none" }
}

/**
 * Annualize a daily estimate into kWh / CO2 / savings. When an assessment annual
 * savings figure is provided it is used verbatim; otherwise savings are modeled
 * from the estimated annual kWh.
 */
export function deriveAnnuals(
  estimatedDailyKwh: number | null,
  annualSavingsOverride?: number | null,
): {
  estimatedAnnualKwh: number | null
  estimatedAnnualCo2Kg: number | null
  estimatedAnnualSavingsTzs: number | null
} {
  if (estimatedDailyKwh == null) {
    return {
      estimatedAnnualKwh: null,
      estimatedAnnualCo2Kg: null,
      estimatedAnnualSavingsTzs: annualSavingsOverride != null ? Math.round(annualSavingsOverride) : null,
    }
  }
  const annual = estimatedDailyKwh * 365
  return {
    estimatedAnnualKwh: Math.round(annual),
    estimatedAnnualCo2Kg: Math.round(annual * CO2_KG_PER_KWH),
    estimatedAnnualSavingsTzs:
      annualSavingsOverride != null ? Math.round(annualSavingsOverride) : Math.round(annual * TZS_PER_KWH),
  }
}

/** Letter grade from a 0-100 score (BMI or RCS), for the readiness view. */
export function gradeFromScore(score: number | null | undefined): string {
  if (score == null) return "N/A"
  if (score >= 90) return "A+"
  if (score >= 80) return "A"
  if (score >= 70) return "B"
  if (score >= 60) return "C"
  if (score >= 45) return "D"
  return "E"
}
