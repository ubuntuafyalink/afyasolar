/**
 * Adapters: map REAL platform data into the risk model's normalized features,
 * tracking which features were backed by real data (→ completeness → confidence).
 * Keeping this separate keeps risk-model.ts pure/dependency-free.
 *
 * A feature provided here (including a real 0) counts toward completeness; a
 * feature left out is imputed to its neutral value and recorded as a data gap.
 */
import {
  NEUTRAL_FEATURES,
  assessRisk,
  type RiskFeatureKey,
  type RiskFeatures,
  type RiskResult,
} from "@/lib/intelligence/risk-model"
import { clamp } from "@/lib/climate/climate-stats"
import { BATTERY_DOD } from "@/lib/dashboard/power-model"
import type { PortfolioFacility } from "@/lib/dashboard/admin-portfolio-types"

const ALL_KEYS = Object.keys(NEUTRAL_FEATURES) as RiskFeatureKey[]

/** Short human labels for the "what's missing" list. */
const GAP_LABEL: Record<RiskFeatureKey, string> = {
  hazardExposure: "climate data",
  heatPressure: "climate data",
  serviceFragility: "climate assessment",
  energyContinuityGap: "climate assessment",
  readinessGap: "climate assessment",
  autonomyDeficit: "energy assessment",
  efficiencyDeficit: "efficiency data",
  deviceOffline: "device telemetry",
  criticalAttention: "assessment",
  adaptationOffset: "adaptation records",
}

export type AssembledFeatures = { features: RiskFeatures; completeness: number; dataGaps: string[] }

/**
 * Build the feature vector from a sparse map of real values. Keys present (not
 * null/undefined/NaN) are used and count toward completeness; keys absent are
 * imputed neutral and their source is added to dataGaps (deduped).
 */
function assemble(provided: Partial<Record<RiskFeatureKey, number>>): AssembledFeatures {
  const features = { ...NEUTRAL_FEATURES }
  let real = 0
  const gaps = new Set<string>()
  for (const k of ALL_KEYS) {
    const v = provided[k]
    if (v != null && Number.isFinite(v)) {
      features[k] = clamp(v, 0, 1)
      real += 1
    } else {
      gaps.add(GAP_LABEL[k])
    }
  }
  return { features, completeness: real / ALL_KEYS.length, dataGaps: [...gaps] }
}

const inv = (score: number | null | undefined): number | undefined =>
  score != null && Number.isFinite(score) ? clamp((100 - score) / 100, 0, 1) : undefined

/** ADMIN: features from a real PortfolioFacility (no per-facility autonomy/adaptation here). */
export function featuresFromPortfolioFacility(f: PortfolioFacility): AssembledFeatures {
  const d = f.dimensions
  return assemble({
    hazardExposure: f.climate ? clamp(f.climate.composite / 100, 0, 1) : undefined,
    heatPressure: f.climate ? clamp(f.climate.byHazard.heat / 100, 0, 1) : undefined,
    serviceFragility: inv(d?.csf),
    energyContinuityGap: inv(d?.ecpq),
    readinessGap: inv(d?.rrc),
    // autonomyDeficit + adaptationOffset are not available portfolio-wide → gaps.
    efficiencyDeficit:
      f.energyBmiPercent != null ? clamp((60 - f.energyBmiPercent) / 60, 0, 1) : undefined,
    deviceOffline:
      f.deviceCount > 0 ? clamp(1 - f.activeDevices / f.deviceCount, 0, 1) : undefined,
    // criticalAttention is a real assessment flag only meaningful once assessed.
    criticalAttention: f.assessed ? (f.climateCriticalAttention ? 1 : 0) : undefined,
  })
}

/** ADMIN convenience: full risk assessment for a portfolio facility. */
export function assessPortfolioFacilityRisk(f: PortfolioFacility): RiskResult {
  const { features, completeness, dataGaps } = featuresFromPortfolioFacility(f)
  return assessRisk(features, completeness, dataGaps)
}

/** FACILITY card inputs (all optional; provide what the page has loaded). */
export type FacilityRiskInputs = {
  rcs?: { csf: number; ecpq: number; rrc: number; criticalAttention: boolean } | null
  cvi?: { composite: number; byHazard: { heat: number } } | null
  energy?: { batteryCapacityKwh: number; criticalLoadKw: number } | null
  efficiencyPercent?: number | null
  /** Realized estimated adaptation gain points (protective). */
  adaptationRealizedGain?: number | null
  devices?: { deviceCount: number; activeDevices: number } | null
}

/** Autonomy hours = usable battery (kWh) · DoD · 90% / critical load (kW). */
function autonomyHours(batteryKwh: number, criticalKw: number): number | undefined {
  if (!(criticalKw > 0)) return undefined
  return (batteryKwh * BATTERY_DOD * 0.9) / criticalKw
}

/** FACILITY: richer feature set from the facility dashboard's already-loaded data. */
export function featuresFromFacilityData(input: FacilityRiskInputs): AssembledFeatures {
  const autonomy = input.energy ? autonomyHours(input.energy.batteryCapacityKwh, input.energy.criticalLoadKw) : undefined
  return assemble({
    hazardExposure: input.cvi ? clamp(input.cvi.composite / 100, 0, 1) : undefined,
    heatPressure: input.cvi ? clamp(input.cvi.byHazard.heat / 100, 0, 1) : undefined,
    serviceFragility: inv(input.rcs?.csf),
    energyContinuityGap: inv(input.rcs?.ecpq),
    readinessGap: inv(input.rcs?.rrc),
    autonomyDeficit: autonomy != null ? clamp(1 - autonomy / 72, 0, 1) : undefined,
    efficiencyDeficit:
      input.efficiencyPercent != null ? clamp((60 - input.efficiencyPercent) / 60, 0, 1) : undefined,
    deviceOffline:
      input.devices && input.devices.deviceCount > 0
        ? clamp(1 - input.devices.activeDevices / input.devices.deviceCount, 0, 1)
        : undefined,
    criticalAttention: input.rcs ? (input.rcs.criticalAttention ? 1 : 0) : undefined,
    adaptationOffset:
      input.adaptationRealizedGain != null ? clamp(input.adaptationRealizedGain / 15, 0, 1) : undefined,
  })
}
