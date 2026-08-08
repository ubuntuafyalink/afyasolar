/**
 * Portfolio-level advisory: join the fleet's predictive-maintenance outputs
 * (battery RUL + anomalies) with its climate outlook (composite hazard) per
 * facility, rank the highest-risk sites in plain code, then ask the AI service
 * for a single plain-language weekly fleet briefing.
 *
 * Reuses computePortfolioMaintenance() + computePortfolioForecast() (each already
 * runs the per-facility AI work with bounded concurrency). Read-only.
 */
import { computePortfolioMaintenance } from "./portfolio-maintenance-server"
import { computePortfolioForecast } from "@/lib/climate/portfolio-forecast-server"
import {
  fetchPortfolioAdvisoryServer,
  type PortfolioAdvisorySummary,
} from "./advisory-portfolio-server"

export type AdvisoryPriorityFacility = {
  facilityId: string
  name: string
  rulDays: number
  status: "critical" | "warning" | "healthy"
  anomalies: number
  hazardComposite: number
  riskScore: number
}

export type PortfolioAdvisoryAggregate = {
  facilities: number
  atRisk: number
  avgRulDays: number
  totalAnomalies: number
}

export type PortfolioAdvisoryResult = {
  advisory: string
  source: "llm" | "fallback"
  model?: string
  generatedAt: string
  aggregate: PortfolioAdvisoryAggregate
  top: AdvisoryPriorityFacility[]
}

const TOP_N = 5

/** Plain-code risk score — deterministic, so the LLM only writes the narrative. */
function riskScore(status: string, rulDays: number, anomalies: number, hazard: number): number {
  const statusWeight = status === "critical" ? 100 : status === "warning" ? 50 : 0
  // Lower battery life -> higher risk; ~1800d nominal life scales to 0.
  const rulPenalty = Math.max(0, 60 - rulDays / 30)
  return statusWeight + rulPenalty + anomalies * 10 + hazard * 0.4
}

export async function computePortfolioAdvisory(): Promise<PortfolioAdvisoryResult> {
  const [maint, forecast] = await Promise.all([
    computePortfolioMaintenance(),
    computePortfolioForecast(),
  ])

  const hazardByFacility = new Map<string, number>()
  for (const f of forecast.data) {
    if (!f.degraded) hazardByFacility.set(f.facilityId, f.hazards.composite)
  }

  // Join maintenance + climate per facility (maintenance drives the fleet risk).
  const joined: AdvisoryPriorityFacility[] = maint.data
    .filter((m) => !m.degraded)
    .map((m) => {
      const hazardComposite = hazardByFacility.get(m.facilityId) ?? 0
      return {
        facilityId: m.facilityId,
        name: m.name,
        rulDays: m.rulDays,
        status: m.status,
        anomalies: m.anomalies,
        hazardComposite,
        riskScore: Math.round(riskScore(m.status, m.rulDays, m.anomalies, hazardComposite)),
      }
    })
    .sort((a, b) => b.riskScore - a.riskScore)

  const top = joined.slice(0, TOP_N)

  const aggregate: PortfolioAdvisoryAggregate = {
    facilities: maint.aggregate.facilitiesForecast,
    atRisk: maint.aggregate.facilitiesAtRisk,
    avgRulDays: maint.aggregate.avgRulDays,
    totalAnomalies: maint.aggregate.totalAnomalies,
  }

  const summary: PortfolioAdvisorySummary = {
    n_facilities: aggregate.facilities,
    n_at_risk: aggregate.atRisk,
    avg_rul_days: aggregate.avgRulDays,
    total_anomalies: aggregate.totalAnomalies,
    top: top.map((f) => ({
      name: f.name,
      rul_days: f.rulDays,
      status: f.status,
      anomalies: f.anomalies,
      hazard_composite: f.hazardComposite,
    })),
  }

  // Narrative is best-effort: on an AI-service failure, still return the ranked
  // data with a short rule-based note so the page always renders.
  try {
    const narrative = await fetchPortfolioAdvisoryServer(summary)
    return {
      advisory: narrative.advisory,
      source: narrative.source,
      model: narrative.model,
      generatedAt: narrative.generated_at,
      aggregate,
      top,
    }
  } catch {
    return {
      advisory:
        `${aggregate.atRisk} of ${aggregate.facilities} facilities need attention this week. ` +
        (top.length ? `Highest priority: ${top[0].name}.` : ""),
      source: "fallback",
      generatedAt: new Date().toISOString(),
      aggregate,
      top,
    }
  }
}
