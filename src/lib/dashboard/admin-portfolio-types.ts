/**
 * Shared TypeScript vocabulary for the REAL admin "Resilience Intelligence"
 * portfolio layer. This is the parallel, real-data counterpart to the demo
 * shapes in `admin-portfolio-data.ts` / `ngo-portfolio-data.ts` (which stay
 * intact for the NGO dashboard).
 *
 * Everything here is keyed to the real `facilities.id`. Demo-only attributes
 * (faith network, women-led, district) are intentionally absent: real
 * facilities have no such columns (see plan decision 2 - group by region +
 * category instead). Facilities without a saved assessment carry `assessed:
 * false` so sections can render an honest "Not assessed yet" state rather than
 * a seeded number (plan decision 3).
 */
import type { ChildServiceKey } from "@/lib/dashboard/facility-demo-data"

export type ResilienceTier = "Resilient" | "Developing" | "At risk" | "Critical"

/**
 * Canonical RCS -> tier mapping (mirrors computeCrphcResult in
 * facility-demo-data.ts). We derive the tier label from the real numeric
 * `climateRcs` rather than the DB `score.tier` integer so labels stay
 * consistent with the facility dashboard.
 */
export function tierFromRcs(rcs: number): ResilienceTier {
  if (rcs >= 75) return "Resilient"
  if (rcs >= 55) return "Developing"
  if (rcs >= 35) return "At risk"
  return "Critical"
}

/** Per-hazard 0..100 exposure indices from real NASA POWER data. */
export type HazardSlice = { flood: number; drought: number; heat: number; storm: number }

export type HazardScoreLite = {
  type: string
  score: number
  trend: "rising" | "stable" | "falling" | string
  note: string
}

/** Real climate exposure for one facility (from the portfolio-climate route). */
export type PortfolioClimate = {
  byHazard: HazardSlice
  /** Composite Climate Vulnerability Index (0..100, higher = more exposed). */
  composite: number
  /** Hazard Exposure capacity score = 100 - composite (feeds RCS HES). */
  hesScore: number
  topHazard: { type: string; score: number }
  hazardScores: HazardScoreLite[]
  coordsSource: "facility" | "region" | "default"
  /** true when NASA POWER was unreachable for this coordinate (no real data). */
  degraded: boolean
}

/**
 * One real portfolio facility: comprehensive metadata + latest assessment
 * snapshot + optional real climate exposure. `climate` is null until the
 * portfolio-climate route resolves (or when it is degraded).
 */
export type PortfolioFacility = {
  id: string
  name: string
  region: string | null
  city: string | null
  category: string | null
  status: string | null
  lat: number | null
  lon: number | null
  deviceCount: number
  activeDevices: number
  userCount: number
  // assessment snapshot
  assessed: boolean
  hasEnergySnapshot: boolean
  hasClimateSnapshot: boolean
  climateRcs: number | null
  tier: ResilienceTier | null
  climateCriticalAttention: boolean
  energyBmiPercent: number | null
  climateAssessmentDate: string | null
  energyAssessmentDate: string | null
  /** CRiPHC capacity dimensions (0..100, higher is better) from the saved climate
   *  assessment; null when the facility has no climate assessment. */
  dimensions: ClimateDimensions | null
  /** Power-sizing metrics from the saved energy assessment; null when not assessed. */
  energy: EnergySizing | null
  // real climate exposure (NASA POWER); null when unavailable
  climate: PortfolioClimate | null
}

/** CRiPHC capacity dimensions (each 0..100, higher = more resilient). */
export type ClimateDimensions = { hes: number | null; csf: number | null; ecpq: number | null; edc: number | null; rrc: number | null }

/** Lightweight power-sizing metrics from the energy assessment. */
export type EnergySizing = {
  solarArraySize: number | null
  dailyLoad: number | null
  requiredKw: number | null
  annualSavings: number | null
}

// --- aggregate render shapes ------------------------------------------------

export type PortfolioSummary = {
  facilities: number
  assessed: number
  regions: number
  categories: number
  /** Average RCS across assessed facilities only; null when none assessed. */
  avgRcs: number | null
  tierCounts: Record<ResilienceTier, number>
  criticalCount: number
}

export type RegionGroup = {
  region: string
  facilities: number
  assessed: number
  avgRcs: number | null
  criticalSites: number
}

export type CategoryGroup = {
  category: string
  facilities: number
  assessed: number
  avgRcs: number | null
  criticalSites: number
}

/** A single real "current" RCS point (no historical series exists in the DB). */
export type RcsTrendPoint = { label: string; rcs: number }

export type ChildServiceStatus = "failing" | "at-risk" | "ok" | "not-assessed"

export type ServiceRollup = {
  key: ChildServiceKey
  failing: number
  atRisk: number
  ok: number
  notAssessed: number
}

export type ColdChainRisk = "low" | "elevated" | "high" | "unknown"

/** Cold-chain risk PROJECTED from real climate heat exposure (no telemetry). */
export type ColdChainProjectionRow = {
  facility: PortfolioFacility
  heatScore: number | null
  risk: ColdChainRisk
  note: string
}
