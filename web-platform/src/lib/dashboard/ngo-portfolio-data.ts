/**
 * Frontend portfolio seed for the NGO / faith-based dashboard.
 *
 * Models a network operator (e.g. CSSC) overseeing many facilities. Rather than
 * depend on the DB `simulatedFacilities` table, this is a deterministic,
 * backend-free seed of 13 facilities (matching the validated pilot) whose
 * resilience figures are derived from the SAME per-facility seed functions the
 * facility dashboard uses (keyed by facilityId), so a facility's numbers are
 * identical whether viewed here or in its own dashboard.
 *
 * No network/DB/side-effects. Marked with <DemoDataBadge /> wherever rendered.
 */
import {
  getRcsExplainer,
  getChildServicesAtRisk,
  getChildServicesSummary,
  getHazardScores,
  type ChildServiceKey,
  type ChildServiceStatus,
} from "@/lib/dashboard/facility-demo-data"

export type FacilityType = "Dispensary" | "Health Centre" | "Polyclinic"

export type NgoFacility = {
  id: string
  name: string
  region: string
  district: string
  type: FacilityType
  /** Faith network / operator the facility belongs to. */
  network: string
  /** Women-led or maternity-serving (application: ~62% of the pilot). */
  womenLed: boolean
}

/**
 * The 13 pilot facilities across Dar es Salaam, Pwani and Morogoro. 8 of 13
 * (~62%) are women-led / maternity-serving, matching the application's figure.
 * The first two ids match src/lib/facility-data.ts for continuity.
 */
export const NGO_FACILITIES: NgoFacility[] = [
  { id: "st-therese", name: "St. Therese Dispensary", region: "Pwani", district: "Kisarawe", type: "Dispensary", network: "CSSC Catholic", womenLed: true },
  { id: "arafa-majumba-sita", name: "Arafa Majumba Sita Health Centre", region: "Dar es Salaam", district: "Temeke", type: "Health Centre", network: "Independent", womenLed: false },
  { id: "bagamoyo-mission", name: "Bagamoyo Mission Dispensary", region: "Pwani", district: "Bagamoyo", type: "Dispensary", network: "CSSC Catholic", womenLed: true },
  { id: "mkuranga-hc", name: "Mkuranga Health Centre", region: "Pwani", district: "Mkuranga", type: "Health Centre", network: "CSSC Lutheran", womenLed: true },
  { id: "kibaha-lutheran", name: "Kibaha Lutheran Dispensary", region: "Pwani", district: "Kibaha", type: "Dispensary", network: "CSSC Lutheran", womenLed: false },
  { id: "morogoro-mji", name: "Morogoro Mji Dispensary", region: "Morogoro", district: "Morogoro Urban", type: "Dispensary", network: "CSSC Anglican", womenLed: true },
  { id: "kilosa-mission", name: "Kilosa Mission Health Centre", region: "Morogoro", district: "Kilosa", type: "Health Centre", network: "CSSC Catholic", womenLed: true },
  { id: "mvomero-disp", name: "Mvomero Dispensary", region: "Morogoro", district: "Mvomero", type: "Dispensary", network: "Independent", womenLed: false },
  { id: "ifakara-st-francis", name: "Ifakara St. Francis Polyclinic", region: "Morogoro", district: "Kilombero", type: "Polyclinic", network: "CSSC Catholic", womenLed: true },
  { id: "temeke-anglican", name: "Temeke Anglican Dispensary", region: "Dar es Salaam", district: "Temeke", type: "Dispensary", network: "CSSC Anglican", womenLed: true },
  { id: "kinondoni-community", name: "Kinondoni Community Dispensary", region: "Dar es Salaam", district: "Kinondoni", type: "Dispensary", network: "Independent", womenLed: false },
  { id: "ilala-maternity", name: "Ilala Maternity Dispensary", region: "Dar es Salaam", district: "Ilala", type: "Dispensary", network: "CSSC Catholic", womenLed: true },
  { id: "rufiji-mission", name: "Rufiji Mission Health Centre", region: "Pwani", district: "Rufiji", type: "Health Centre", network: "CSSC Lutheran", womenLed: false },
]

export type ResilienceTier = "Resilient" | "Developing" | "At risk" | "Critical"

export type PortfolioRow = NgoFacility & {
  rcs: number
  tier: string
  /** Child services failing now (of 5). */
  childFailing: number
  /** Child services at risk (of 5). */
  childAtRisk: number
  /** Highest hazard for the site. */
  topHazard: { type: string; score: number }
}

/** Per-facility portfolio rows, derived from the shared per-facility seed. */
export function getPortfolioRows(): PortfolioRow[] {
  return NGO_FACILITIES.map((f) => {
    const { rcs, tier } = getRcsExplainer(f.id)
    const cs = getChildServicesSummary(f.id)
    const hazards = getHazardScores(f.id)
    const topHazard = hazards.reduce(
      (max, h) => (h.score > max.score ? { type: h.type, score: h.score } : max),
      { type: hazards[0]?.type ?? "", score: hazards[0]?.score ?? 0 },
    )
    return {
      ...f,
      rcs,
      tier,
      childFailing: cs.failing,
      childAtRisk: cs.atRisk,
      topHazard,
    }
  })
}

export type PortfolioSummary = {
  facilities: number
  regions: number
  networks: number
  womenLedPct: number
  avgRcs: number
  tierCounts: Record<ResilienceTier, number>
  /** Facilities with at least one failing child service. */
  failingSites: number
  /** Facilities with at least one at-risk (but not failing) child service. */
  atRiskSites: number
}

export function getPortfolioSummary(): PortfolioSummary {
  const rows = getPortfolioRows()
  const tierCounts: Record<ResilienceTier, number> = {
    Resilient: 0,
    Developing: 0,
    "At risk": 0,
    Critical: 0,
  }
  let rcsSum = 0
  let failingSites = 0
  let atRiskSites = 0
  for (const r of rows) {
    rcsSum += r.rcs
    if (r.tier in tierCounts) tierCounts[r.tier as ResilienceTier] += 1
    if (r.childFailing > 0) failingSites += 1
    else if (r.childAtRisk > 0) atRiskSites += 1
  }
  const womenLed = rows.filter((r) => r.womenLed).length
  return {
    facilities: rows.length,
    regions: new Set(rows.map((r) => r.region)).size,
    networks: new Set(rows.map((r) => r.network)).size,
    womenLedPct: Math.round((womenLed / rows.length) * 100),
    avgRcs: Math.round(rcsSum / rows.length),
    tierCounts,
    failingSites,
    atRiskSites,
  }
}

export type ServiceRollup = {
  key: ChildServiceKey
  failing: number
  atRisk: number
  ok: number
}

/** Across the portfolio, how many sites have each child service failing/at-risk/ok. */
export function getPortfolioChildServiceRollup(): ServiceRollup[] {
  const acc = new Map<ChildServiceKey, ServiceRollup>()
  for (const f of NGO_FACILITIES) {
    for (const s of getChildServicesAtRisk(f.id)) {
      const cur =
        acc.get(s.key) ?? { key: s.key, failing: 0, atRisk: 0, ok: 0 }
      const bump: Record<ChildServiceStatus, keyof ServiceRollup> = {
        failing: "failing",
        "at-risk": "atRisk",
        ok: "ok",
      }
      ;(cur[bump[s.status]] as number) += 1
      acc.set(s.key, cur)
    }
  }
  // Preserve a stable service order.
  const order: ChildServiceKey[] = [
    "cold-chain",
    "maternity",
    "neonatal",
    "diagnostics",
    "water-pumping",
  ]
  return order.map((k) => acc.get(k) ?? { key: k, failing: 0, atRisk: 0, ok: 0 })
}

export type RegionGroup = {
  region: string
  facilities: number
  avgRcs: number
  /** Sites with at least one failing or at-risk child service. */
  atRiskSites: number
}

/** Portfolio grouped by region, for prioritising where to invest. */
export function getPortfolioByRegion(): RegionGroup[] {
  const rows = getPortfolioRows()
  const map = new Map<string, PortfolioRow[]>()
  for (const r of rows) {
    const list = map.get(r.region) ?? []
    list.push(r)
    map.set(r.region, list)
  }
  return [...map.entries()]
    .map(([region, list]) => ({
      region,
      facilities: list.length,
      avgRcs: Math.round(list.reduce((s, r) => s + r.rcs, 0) / list.length),
      atRiskSites: list.filter((r) => r.childFailing > 0 || r.childAtRisk > 0).length,
    }))
    .sort((a, b) => a.avgRcs - b.avgRcs)
}
