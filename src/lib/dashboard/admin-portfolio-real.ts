/**
 * Pure, real-data aggregation helpers for the admin Resilience Intelligence
 * dashboard. These take already-fetched arrays (comprehensive facilities,
 * assessment snapshots, NASA climate exposure) and produce the render shapes in
 * `admin-portfolio-types.ts`. No React, no fetch, no demo seed - fully
 * deterministic and unit-testable.
 *
 * Join key is always the real `facilities.id`. Facilities without a saved
 * climate assessment are `assessed: false`; aggregates that depend on RCS skip
 * them rather than inventing a number (plan decision 3).
 */
import type { ChildServiceKey } from "@/lib/dashboard/facility-demo-data"
import type { AssessmentSnapshotRow } from "@/hooks/use-admin-portfolio-assessments"
import type { ComprehensiveFacility } from "@/hooks/use-admin-facilities-comprehensive"
import type { PortfolioClimateRow } from "@/hooks/use-admin-portfolio-climate"
import {
  tierFromRcs,
  type PortfolioFacility,
  type PortfolioSummary,
  type RegionGroup,
  type CategoryGroup,
  type RcsTrendPoint,
  type ServiceRollup,
  type ChildServiceStatus,
  type ColdChainProjectionRow,
  type ColdChainRisk,
  type ResilienceTier,
} from "@/lib/dashboard/admin-portfolio-types"

const UNGROUPED = "Unspecified"

/**
 * Join the three real sources into PortfolioFacility rows. `assessments` and
 * `climate` may be undefined/empty while their queries are still loading -
 * facilities simply carry null assessment/climate until then.
 */
export function buildPortfolioFacilities(
  comprehensive: ComprehensiveFacility[] | undefined,
  assessments: AssessmentSnapshotRow[] | undefined,
  climate: PortfolioClimateRow[] | undefined,
): PortfolioFacility[] {
  const assessmentById = new Map((assessments ?? []).map((a) => [a.facilityId, a]))
  const climateById = new Map((climate ?? []).map((c) => [c.facilityId, c]))

  return (comprehensive ?? []).map((f) => {
    const a = assessmentById.get(f.id)
    const c = climateById.get(f.id)
    const climateRcs = a?.climateRcs ?? null
    const assessed = Boolean(a?.hasClimateSnapshot)

    return {
      id: f.id,
      name: f.name,
      region: f.region,
      city: f.city,
      category: f.category,
      status: f.status,
      lat: f.latitude,
      lon: f.longitude,
      deviceCount: f.deviceCount,
      activeDevices: f.activeDevices,
      userCount: f.userCount,
      assessed,
      hasEnergySnapshot: Boolean(a?.hasEnergySnapshot),
      hasClimateSnapshot: assessed,
      climateRcs,
      tier: climateRcs != null ? tierFromRcs(climateRcs) : null,
      climateCriticalAttention: Boolean(a?.climateCriticalAttention),
      energyBmiPercent: a?.energyBmiPercent ?? null,
      climateAssessmentDate: a?.climateAssessmentDate ?? null,
      energyAssessmentDate: a?.energyAssessmentDate ?? null,
      climate:
        c && !c.degraded
          ? {
              byHazard: c.byHazard,
              composite: c.composite,
              hesScore: c.hesScore,
              topHazard: c.topHazard,
              hazardScores: c.hazardScores,
              coordsSource: c.coordsSource,
              degraded: false,
            }
          : null,
    }
  })
}

function avg(values: number[]): number | null {
  return values.length ? Math.round(values.reduce((s, v) => s + v, 0) / values.length) : null
}

function isCritical(f: PortfolioFacility): boolean {
  return f.tier === "Critical" || f.climateCriticalAttention
}

export function summarize(rows: PortfolioFacility[]): PortfolioSummary {
  const assessedRows = rows.filter((r) => r.climateRcs != null)
  const tierCounts: Record<ResilienceTier, number> = {
    Resilient: 0,
    Developing: 0,
    "At risk": 0,
    Critical: 0,
  }
  for (const r of assessedRows) if (r.tier) tierCounts[r.tier] += 1

  return {
    facilities: rows.length,
    assessed: assessedRows.length,
    regions: new Set(rows.map((r) => r.region || UNGROUPED)).size,
    categories: new Set(rows.map((r) => r.category || UNGROUPED)).size,
    avgRcs: avg(assessedRows.map((r) => r.climateRcs as number)),
    tierCounts,
    criticalCount: rows.filter(isCritical).length,
  }
}

function groupBy(
  rows: PortfolioFacility[],
  keyOf: (r: PortfolioFacility) => string,
): { key: string; facilities: PortfolioFacility[] }[] {
  const map = new Map<string, PortfolioFacility[]>()
  for (const r of rows) {
    const k = keyOf(r) || UNGROUPED
    const list = map.get(k) ?? []
    list.push(r)
    map.set(k, list)
  }
  return [...map.entries()].map(([key, facilities]) => ({ key, facilities }))
}

export function byRegion(rows: PortfolioFacility[]): RegionGroup[] {
  return groupBy(rows, (r) => r.region || UNGROUPED)
    .map(({ key, facilities }) => ({
      region: key,
      facilities: facilities.length,
      assessed: facilities.filter((f) => f.climateRcs != null).length,
      avgRcs: avg(facilities.filter((f) => f.climateRcs != null).map((f) => f.climateRcs as number)),
      criticalSites: facilities.filter(isCritical).length,
    }))
    .sort((a, b) => (a.avgRcs ?? 999) - (b.avgRcs ?? 999))
}

export function byCategory(rows: PortfolioFacility[]): CategoryGroup[] {
  return groupBy(rows, (r) => r.category || UNGROUPED)
    .map(({ key, facilities }) => ({
      category: key,
      facilities: facilities.length,
      assessed: facilities.filter((f) => f.climateRcs != null).length,
      avgRcs: avg(facilities.filter((f) => f.climateRcs != null).map((f) => f.climateRcs as number)),
      criticalSites: facilities.filter(isCritical).length,
    }))
    .sort((a, b) => (a.avgRcs ?? 999) - (b.avgRcs ?? 999))
}

/**
 * A single real "current" RCS point. There is no historical RCS time series in
 * the DB, so we do NOT fabricate a multi-quarter ramp; callers should pair this
 * with a "history begins this quarter" note.
 */
export function currentRcsTrend(rows: PortfolioFacility[], now: Date = new Date()): RcsTrendPoint[] {
  const summary = summarize(rows)
  if (summary.avgRcs == null) return []
  const quarter = Math.floor(now.getMonth() / 3) + 1
  return [{ label: `Q${quarter} ${now.getFullYear()}`, rcs: summary.avgRcs }]
}

// --- child services (real where climate-derivable, else not-assessed) -------

const CHILD_SERVICE_ORDER: ChildServiceKey[] = [
  "cold-chain",
  "maternity",
  "neonatal",
  "diagnostics",
  "water-pumping",
]

/** Map a 0..100 hazard exposure to a service status (higher = worse). */
function statusFromHazard(score: number): ChildServiceStatus {
  if (score >= 66) return "failing"
  if (score >= 40) return "at-risk"
  return "ok"
}

/**
 * Per-facility status for a child service. Only cold-chain (heat) and
 * water-pumping (drought/flood) have a real climate signal; the rest have no
 * real source yet and return "not-assessed".
 */
export function childServiceStatus(f: PortfolioFacility, key: ChildServiceKey): ChildServiceStatus {
  if (!f.climate) return "not-assessed"
  const h = f.climate.byHazard
  if (key === "cold-chain") return statusFromHazard(h.heat)
  if (key === "water-pumping") return statusFromHazard(Math.max(h.drought, h.flood))
  return "not-assessed"
}

export function childServiceRollup(rows: PortfolioFacility[]): ServiceRollup[] {
  return CHILD_SERVICE_ORDER.map((key) => {
    const roll: ServiceRollup = { key, failing: 0, atRisk: 0, ok: 0, notAssessed: 0 }
    for (const f of rows) {
      const s = childServiceStatus(f, key)
      if (s === "failing") roll.failing += 1
      else if (s === "at-risk") roll.atRisk += 1
      else if (s === "ok") roll.ok += 1
      else roll.notAssessed += 1
    }
    return roll
  })
}

// --- cold-chain projection (from real heat exposure; no telemetry) ----------

function coldChainRisk(heat: number): ColdChainRisk {
  if (heat >= 66) return "high"
  if (heat >= 40) return "elevated"
  return "low"
}

/**
 * Cold-chain risk PROJECTED from real climate heat exposure. There is NO fridge
 * telemetry, so this is an exposure proxy, not a measured temperature - the UI
 * must label it as projected.
 */
export function coldChainProjection(rows: PortfolioFacility[]): ColdChainProjectionRow[] {
  return rows
    .map((facility) => {
      const heat = facility.climate?.byHazard.heat ?? null
      const risk: ColdChainRisk = heat == null ? "unknown" : coldChainRisk(heat)
      const note =
        heat == null
          ? "No climate data"
          : risk === "high"
            ? "High heat exposure - cold-chain at elevated failure risk"
            : risk === "elevated"
              ? "Moderate heat exposure"
              : "Low heat exposure"
      return { facility, heatScore: heat, risk, note }
    })
    .sort((a, b) => {
      const order: Record<ColdChainRisk, number> = { high: 0, elevated: 1, low: 2, unknown: 3 }
      return order[a.risk] - order[b.risk]
    })
}
