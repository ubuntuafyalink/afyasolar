/**
 * Frontend seed/aggregations for the admin "Resilience Intelligence" sections.
 *
 * Reuses the same per-facility + portfolio seed as the other dashboards (so a
 * facility's numbers match everywhere) and adds operator-level aggregations:
 * cold-chain fleet, telemetry registry, assessment cycles, alerts console,
 * adaptation pipeline, impact summary, financing overview. Deterministic per
 * facilityId; no backend / network / side-effects. All consumers must surface a
 * <DemoDataBadge/>.
 */
import {
  NGO_FACILITIES,
  getPortfolioRows,
  getPortfolioSummary,
  type NgoFacility,
  type PortfolioRow,
  type PortfolioSummary,
  type ResilienceTier,
} from "@/lib/dashboard/ngo-portfolio-data"
import {
  getRcsExplainer,
  getFridgeStatus,
  getColdChainPrediction,
  getFacilityAlerts,
  type AlertSeverity,
} from "@/lib/dashboard/facility-demo-data"
import { ECM_CATALOGUE } from "@/lib/dashboard/ecm-catalogue"

// --- deterministic helpers (no Math.random) ---------------------------------
function hashStr(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}
/** Stable pseudo-random in [0,1) from a string key. */
function rand01(key: string): number {
  const x = Math.sin(hashStr(key)) * 43758.5453
  return x - Math.floor(x)
}

// --- summary + trend --------------------------------------------------------

/** Portfolio KPIs for the admin overview (wraps the shared portfolio summary). */
export function getAdminPortfolioSummary(): PortfolioSummary {
  return getPortfolioSummary()
}

export type RcsTrendPoint = { label: string; rcs: number }

/** Quarterly portfolio-average RCS, trending up to today's average. */
export function getPortfolioRcsTrend(): RcsTrendPoint[] {
  const rows = getPortfolioRows()
  const current = rows.length ? Math.round(rows.reduce((s, r) => s + r.rcs, 0) / rows.length) : 0
  const now = new Date()
  const n = 6
  const baseline = Math.max(0, current - 10)
  const points: RcsTrendPoint[] = []
  for (let i = n - 1; i >= 0; i--) {
    const progress = (n - 1 - i) / (n - 1)
    const value =
      i === 0
        ? current
        : Math.max(
            0,
            Math.min(100, Math.round(baseline + (current - baseline) * progress + (rand01(`trend-${i}`) - 0.5) * 4)),
          )
    const d = new Date(now.getFullYear(), now.getMonth() - i * 3, 1)
    const quarter = Math.floor(d.getMonth() / 3) + 1
    points.push({ label: `Q${quarter} ${d.getFullYear()}`, rcs: value })
  }
  return points
}

// --- cold-chain fleet -------------------------------------------------------

export type ColdChainFleetRow = {
  facility: NgoFacility
  tempC: number
  status: "safe" | "danger"
  atRisk: boolean
  etaDaysMin: number
  etaDaysMax: number
  confidencePct: number
}

/** Vaccine-fridge status across the whole portfolio, most urgent first. */
export function getColdChainFleet(): ColdChainFleetRow[] {
  return NGO_FACILITIES.map((facility) => {
    const fs = getFridgeStatus(facility.id)
    const p = getColdChainPrediction(facility.id)
    return {
      facility,
      tempC: fs.tempC,
      status: fs.status,
      atRisk: p.atRisk,
      etaDaysMin: p.etaDaysMin,
      etaDaysMax: p.etaDaysMax,
      confidencePct: p.confidencePct,
    }
  }).sort((a, b) => Number(b.status === "danger") - Number(a.status === "danger") || Number(b.atRisk) - Number(a.atRisk))
}

// --- telemetry registry -----------------------------------------------------

export type TelemetryRow = {
  facility: NgoFacility
  meterSerial: string
  online: boolean
  lastSeenMinsAgo: number
}

/** Simulated smart-meter registry: which sites are reporting telemetry. */
export function getTelemetryRegistry(): TelemetryRow[] {
  return NGO_FACILITIES.map((facility) => {
    const online = rand01(`meter-${facility.id}`) > 0.18
    return {
      facility,
      meterSerial: `AS-${(hashStr(facility.id) % 90000) + 10000}`,
      online,
      lastSeenMinsAgo: online ? Math.floor(rand01(`seen-${facility.id}`) * 9) + 1 : Math.floor(rand01(`seen-${facility.id}`) * 2880) + 120,
    }
  }).sort((a, b) => Number(a.online) - Number(b.online))
}

// --- assessment cycles ------------------------------------------------------

export type AssessmentStatus = "complete" | "in-progress" | "not-started"
export type AssessmentCycleRow = {
  facility: NgoFacility
  status: AssessmentStatus
  lastUpdatedIso: string
}

/** Per-facility assessment-cycle status for lifecycle management. */
export function getAssessmentCycles(): AssessmentCycleRow[] {
  const now = Date.now()
  return NGO_FACILITIES.map((facility) => {
    const r = rand01(`cycle-${facility.id}`)
    const status: AssessmentStatus = r > 0.62 ? "complete" : r > 0.3 ? "in-progress" : "not-started"
    const daysAgo = Math.floor(rand01(`cycle-date-${facility.id}`) * 120) + 2
    return {
      facility,
      status,
      lastUpdatedIso: new Date(now - daysAgo * 86_400_000).toISOString(),
    }
  })
}

// --- alerts / incidents console --------------------------------------------

export type IncidentStatus = "open" | "ack" | "resolved"
export type PortfolioIncident = {
  id: string
  facility: NgoFacility
  kind: string
  severity: AlertSeverity
  title: string
  detail: string
  status: IncidentStatus
}

/** Flattened active alerts across all facilities, with a workflow status. */
export function getPortfolioAlerts(): PortfolioIncident[] {
  const out: PortfolioIncident[] = []
  for (const facility of NGO_FACILITIES) {
    for (const a of getFacilityAlerts(facility.id)) {
      if (!a.active) continue
      const r = rand01(`incident-${facility.id}-${a.kind}`)
      const status: IncidentStatus = r > 0.66 ? "resolved" : r > 0.33 ? "ack" : "open"
      out.push({
        id: `${facility.id}-${a.kind}`,
        facility,
        kind: a.kind,
        severity: a.severity,
        title: a.title,
        detail: `${a.detail} (${a.leadTime})`,
        status,
      })
    }
  }
  const sev: Record<AlertSeverity, number> = { danger: 0, warning: 1, info: 2 }
  return out.sort((a, b) => sev[a.severity] - sev[b.severity])
}

// --- adaptation pipeline ----------------------------------------------------

export type PipelineStatus = "planned" | "in-progress" | "done"
export type PipelineItem = {
  facility: NgoFacility
  ecmCode: string
  ecmTitle: string
  resilienceGainPoints: number
  status: PipelineStatus
}

export type AdaptationPipeline = {
  items: PipelineItem[]
  byStatus: Record<PipelineStatus, number>
  pointsPlanned: number
  pointsDone: number
}

/** Adaptation measures across the portfolio, bucketed by status. */
export function getAdaptationPipeline(): AdaptationPipeline {
  const items: PipelineItem[] = []
  for (const facility of NGO_FACILITIES) {
    // 1–3 measures per facility, deterministic pick from the catalogue.
    const count = 1 + Math.floor(rand01(`pipe-n-${facility.id}`) * 3)
    for (let i = 0; i < count; i++) {
      const ecm = ECM_CATALOGUE[(hashStr(`${facility.id}-${i}`) % ECM_CATALOGUE.length)]
      const r = rand01(`pipe-st-${facility.id}-${i}`)
      const status: PipelineStatus = r > 0.66 ? "done" : r > 0.33 ? "in-progress" : "planned"
      items.push({
        facility,
        ecmCode: ecm.code,
        ecmTitle: ecm.title,
        resilienceGainPoints: ecm.resilienceGainPoints,
        status,
      })
    }
  }
  const byStatus: Record<PipelineStatus, number> = { planned: 0, "in-progress": 0, done: 0 }
  let pointsPlanned = 0
  let pointsDone = 0
  for (const it of items) {
    byStatus[it.status] += 1
    pointsPlanned += it.resilienceGainPoints
    if (it.status === "done") pointsDone += it.resilienceGainPoints
  }
  return { items, byStatus, pointsPlanned, pointsDone }
}

// --- impact summary ---------------------------------------------------------

export type ImpactSummary = {
  facilitiesAssessed: number
  servicesProtected: number
  resiliencePointsGained: number
  co2AvoidedTons: number
}

/** Headline impact figures derived from the portfolio + pipeline. */
export function getImpactSummary(): ImpactSummary {
  const rows = getPortfolioRows()
  const pipeline = getAdaptationPipeline()
  const servicesProtected = rows.reduce((s, r) => s + (5 - r.childFailing - r.childAtRisk), 0)
  const co2AvoidedTons = Math.round(rows.length * 4.2 + pipeline.pointsDone * 0.3)
  return {
    facilitiesAssessed: rows.length,
    servicesProtected,
    resiliencePointsGained: pipeline.pointsDone,
    co2AvoidedTons,
  }
}

// --- financing overview -----------------------------------------------------

export type FinancingOverview = {
  deployments: number
  onTimePaymentPct: number
  defaults: number
  financedTotalTsh: number
  byNetwork: { network: string; deployments: number; financedTsh: number }[]
}

/** Medical Credit Fund financing snapshot (matches application §7 figures). */
export function getFinancingOverview(): FinancingOverview {
  const byNetworkMap = new Map<string, { deployments: number; financedTsh: number }>()
  let financedTotalTsh = 0
  for (const f of NGO_FACILITIES) {
    const financed = 6_000_000 + Math.floor(rand01(`fin-${f.id}`) * 9_000_000)
    financedTotalTsh += financed
    const cur = byNetworkMap.get(f.network) ?? { deployments: 0, financedTsh: 0 }
    cur.deployments += 1
    cur.financedTsh += financed
    byNetworkMap.set(f.network, cur)
  }
  return {
    deployments: NGO_FACILITIES.length,
    onTimePaymentPct: 93,
    defaults: 0,
    financedTotalTsh,
    byNetwork: [...byNetworkMap.entries()].map(([network, v]) => ({ network, ...v })),
  }
}

// --- region + network breakdown --------------------------------------------

export type NetworkGroup = {
  network: string
  facilities: number
  avgRcs: number
  atRiskSites: number
}

/** Portfolio grouped by faith network / operator. */
export function getPortfolioByNetwork(): NetworkGroup[] {
  const rows = getPortfolioRows()
  const map = new Map<string, PortfolioRow[]>()
  for (const r of rows) {
    const list = map.get(r.network) ?? []
    list.push(r)
    map.set(r.network, list)
  }
  return [...map.entries()]
    .map(([network, list]) => ({
      network,
      facilities: list.length,
      avgRcs: Math.round(list.reduce((s, r) => s + r.rcs, 0) / list.length),
      atRiskSites: list.filter((r) => r.childFailing > 0 || r.childAtRisk > 0).length,
    }))
    .sort((a, b) => a.avgRcs - b.avgRcs)
}

// Re-exports so intelligence components import from one place.
export {
  NGO_FACILITIES,
  getPortfolioRows,
  getPortfolioSummary,
  type NgoFacility,
  type PortfolioRow,
  type PortfolioSummary,
  type ResilienceTier,
}
export { getRcsExplainer } from "@/lib/dashboard/facility-demo-data"
