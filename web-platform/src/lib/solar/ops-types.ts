import type { EstimateSource } from "@/lib/solar/ops-estimate"

/** Per-facility admin Solar Operations row (assessment + climate + modeled estimate). */
export type FacilitySolarOps = {
  facilityId: string
  facilityName: string
  region: string | null
  city: string | null
  facilityStatus: string | null
  // subscription / system
  systemKw: number | null
  subscriptionStatus: string | null
  packageName: string | null
  // energy assessment
  hasEnergyAssessment: boolean
  energyAssessmentDate: string | null
  bmiPercent: number | null
  sectionScores: { reliability: number; wastage: number; thermal: number; behavior: number } | null
  dailyLoadKwh: number | null
  annualSavingsTzs: number | null
  // climate assessment
  hasClimateAssessment: boolean
  climateAssessmentDate: string | null
  rcs: number | null
  tier: number | null
  criticalAttention: boolean
  // climate exposure (NASA hazards) + solar resource
  hazardComposite: number | null
  topHazard: { type: string; score: number } | null
  peakSunHours: number | null
  // derived ESTIMATED generation (design + climate, not metered)
  estimatedSource: EstimateSource
  estimatedDailyKwh: number | null
  estimatedAnnualKwh: number | null
  estimatedAnnualCo2Kg: number | null
  estimatedAnnualSavingsTzs: number | null
}
