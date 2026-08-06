/**
 * Frontend seed for the District Health Office dashboard.
 *
 * Models a government district health office overseeing the facilities in its
 * catchment, focused on PROACTIVE SURGE PLANNING (application Area 3) and
 * resource allocation (Area 1). Reuses the same per-facility seed functions as
 * the facility dashboard (so a facility's numbers match everywhere) and the
 * NGO facility list, grouped by region as the district unit.
 *
 * No backend / network / side-effects.
 */
import {
  NGO_FACILITIES,
  type NgoFacility,
} from "@/lib/dashboard/ngo-portfolio-data"
import {
  getRcsExplainer,
  getResiHealthCvi,
  getChildServicesAtRisk,
  getChildServicesSummary,
  type ChildServiceKey,
  type CviByHazard,
} from "@/lib/dashboard/facility-demo-data"

/** Surge hazards align with the climate-vulnerability index hazards. */
export type SurgeHazard = keyof CviByHazard // "flood" | "drought" | "heat" | "storm"
export const SURGE_HAZARDS: SurgeHazard[] = ["flood", "heat", "storm", "drought"]

/** Districts available (regions act as the district unit in this seed). */
export function getDistricts(): string[] {
  return Array.from(new Set(NGO_FACILITIES.map((f) => f.region)))
}

export function getDistrictFacilities(district: string): NgoFacility[] {
  return NGO_FACILITIES.filter((f) => f.region === district)
}

export type SurgeImpact = {
  facility: NgoFacility
  rcs: number
  tier: string
  /** Climate vulnerability for the hazard (0100, higher = more exposed). */
  exposure: number
  /** Combined surge-impact score (0100, higher = harder hit). */
  impactScore: number
  /** Inverse readiness for quick reference (0100). */
  readiness: number
  /** Child services that would be hit (currently at-risk/failing). */
  affectedServices: ChildServiceKey[]
}

/** Per-facility surge impact for a given hazard. */
export function getSurgeImpact(facility: NgoFacility, hazard: SurgeHazard): SurgeImpact {
  const { rcs, tier } = getRcsExplainer(facility.id)
  const exposure = getResiHealthCvi(facility.id).byHazard[hazard]
  const services = getChildServicesAtRisk(facility.id)
  const affectedServices = services.filter((s) => s.status !== "ok").map((s) => s.key)
  const fragility = services.reduce(
    (sum, s) => sum + (s.status === "failing" ? 2 : s.status === "at-risk" ? 1 : 0),
    0,
  )
  const fragilityScaled = Math.min(100, fragility * 14)
  const impactScore = Math.max(0, Math.min(100, Math.round(0.6 * exposure + 0.4 * fragilityScaled)))
  return { facility, rcs, tier, exposure, impactScore, readiness: 100 - impactScore, affectedServices }
}

export type AffectedServiceCount = { key: ChildServiceKey; sites: number }

export type DistrictSurgePlan = {
  hazard: SurgeHazard
  /** Facilities sorted most-impacted first the prioritisation order. */
  facilities: SurgeImpact[]
  highImpactCount: number
  affectedServiceCounts: AffectedServiceCount[]
}

const SERVICE_ORDER: ChildServiceKey[] = [
  "cold-chain",
  "maternity",
  "neonatal",
  "diagnostics",
  "water-pumping",
]

/** District-wide surge plan for a hazard scenario. */
export function getDistrictSurgePlan(district: string, hazard: SurgeHazard): DistrictSurgePlan {
  const facilities = getDistrictFacilities(district)
    .map((f) => getSurgeImpact(f, hazard))
    .sort((a, b) => b.impactScore - a.impactScore)
  const highImpactCount = facilities.filter((f) => f.impactScore >= 60).length
  const counts = new Map<ChildServiceKey, number>()
  for (const f of facilities) {
    for (const key of f.affectedServices) counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  const affectedServiceCounts = SERVICE_ORDER.map((key) => ({ key, sites: counts.get(key) ?? 0 })).filter(
    (x) => x.sites > 0,
  )
  return { hazard, facilities, highImpactCount, affectedServiceCounts }
}

export type DistrictSummary = {
  facilities: number
  avgRcs: number
  /** Facilities below the "Developing" tier (RCS < 55). */
  lowResilienceSites: number
  /** Facilities with at least one child service failing or at risk. */
  childAtRiskSites: number
}

export function getDistrictSummary(district: string): DistrictSummary {
  const facilities = getDistrictFacilities(district)
  let rcsSum = 0
  let lowResilienceSites = 0
  let childAtRiskSites = 0
  for (const f of facilities) {
    const { rcs } = getRcsExplainer(f.id)
    rcsSum += rcs
    if (rcs < 55) lowResilienceSites += 1
    const cs = getChildServicesSummary(f.id)
    if (cs.failing > 0 || cs.atRisk > 0) childAtRiskSites += 1
  }
  return {
    facilities: facilities.length,
    avgRcs: facilities.length ? Math.round(rcsSum / facilities.length) : 0,
    lowResilienceSites,
    childAtRiskSites,
  }
}

/** Recommended pre-positioning resource per affected child service (i18n keys). */
export const SERVICE_RESOURCE_KEY: Record<ChildServiceKey, string> = {
  "cold-chain": "district.resource.cold-chain",
  maternity: "district.resource.maternity",
  neonatal: "district.resource.neonatal",
  diagnostics: "district.resource.diagnostics",
  "water-pumping": "district.resource.water-pumping",
}
