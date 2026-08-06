/**
 * Build a compact, information-dense grounding string for the admin Assistant
 * from the REAL portfolio data, so the model can answer specifically ("which
 * facilities are most at risk and why", "where to prioritise investment") rather
 * than from four aggregate sentences. Pure functions — no React, no fetch.
 *
 * The route slices `context` to 4000 chars; we stay under ~3600 for headroom.
 */
import { formatCurrency } from "@/lib/utils"
import { summarize, byRegion } from "@/lib/dashboard/admin-portfolio-real"
import type { PortfolioFacility } from "@/lib/dashboard/admin-portfolio-types"
import type { PortfolioClimateAggregate } from "@/hooks/use-admin-portfolio-climate"

const MAX_CHARS = 3600
const r0 = (n: number) => Math.round(n)

/** Lower = more urgent (Critical/flagged → at-risk → assessed → unassessed). */
function riskRank(f: PortfolioFacility): number {
  if (f.tier === "Critical" || f.climateCriticalAttention) return 0
  if (f.tier === "At risk") return 1
  if (f.climateRcs != null) return 2
  return 3
}

function facilityLine(f: PortfolioFacility): string {
  const parts: string[] = []
  parts.push(f.climateRcs != null ? `RCS ${r0(f.climateRcs)}` : "not assessed")
  if (f.tier) parts.push(f.tier)
  const top = f.climate?.topHazard
  if (top && top.score >= 50) parts.push(`top hazard ${top.type} ${r0(top.score)}/100`)
  if (f.climateCriticalAttention) parts.push("critical attention")
  if (f.energyBmiPercent != null && f.energyBmiPercent < 50) parts.push(`low efficiency ${r0(f.energyBmiPercent)}%`)
  return `- ${f.name} (${f.region || "Unspecified"}): ${parts.join("; ")}`
}

export function buildAdminAssistantContext(
  facilities: PortfolioFacility[],
  aggregate: PortfolioClimateAggregate | null,
): string {
  const s = summarize(facilities)
  const t = s.tierCounts

  const priority = [...facilities]
    .sort((a, b) => {
      const rr = riskRank(a) - riskRank(b)
      if (rr !== 0) return rr
      const ra = a.climateRcs ?? 999
      const rb = b.climateRcs ?? 999
      if (ra !== rb) return ra - rb
      return (b.climate?.composite ?? 0) - (a.climate?.composite ?? 0)
    })
    .slice(0, 12)

  const sized = facilities.filter((f) => f.energy)
  const sumEnergy = (pick: (f: PortfolioFacility) => number | null | undefined) =>
    sized.reduce((acc, f) => acc + (pick(f) ?? 0), 0)
  const lowEff = facilities.filter((f) => f.energyBmiPercent != null && f.energyBmiPercent < 50).length
  const noEnergy = facilities.filter((f) => !f.hasEnergySnapshot).length
  const noClimate = facilities.filter((f) => !f.hasClimateSnapshot).length

  const regionLines = byRegion(facilities)
    .slice(0, 10)
    .map(
      (g) =>
        `- ${g.region}: ${g.facilities} facilities, ${g.assessed} assessed, avg RCS ${g.avgRcs ?? "—"}, ${g.criticalSites} critical`,
    )

  const lines: string[] = [
    "You are advising a portfolio administrator overseeing ALL of these health facilities.",
    "Be specific: name facilities and regions and cite the numbers below. Give prioritised, actionable guidance. If data is missing, say so — never invent numbers.",
    "",
    "PORTFOLIO SUMMARY:",
    `Facilities ${s.facilities}; assessed ${s.assessed}; regions ${s.regions}; categories ${s.categories}.`,
    `Average RCS ${s.avgRcs ?? "—"}/100. Tiers — Resilient ${t.Resilient}, Developing ${t.Developing}, At risk ${t["At risk"]}, Critical ${t.Critical}. Critical/flagged sites ${s.criticalCount}.`,
    "",
    "ENERGY: " +
      `total solar ${sumEnergy((f) => f.energy?.solarArraySize).toFixed(1)} kW; ` +
      `total modelled annual savings ${formatCurrency(sumEnergy((f) => f.energy?.annualSavings))}; ` +
      `${lowEff} low-efficiency (<50%); ${noEnergy} without an energy assessment.`,
  ]

  if (aggregate) {
    const h = aggregate.byHazard
    lines.push(
      "",
      "CLIMATE (NASA POWER): " +
        `avg heat ${r0(h.heat)}, flood ${r0(h.flood)}, drought ${r0(h.drought)}, storm ${r0(h.storm)} (0–100); ` +
        `composite CVI ${r0(aggregate.composite)}; ${aggregate.facilitiesWithClimate} facilities with climate data; ${noClimate} not climate-assessed.`,
    )
  }

  lines.push("", "PRIORITY FACILITIES (most at risk first):", ...priority.map(facilityLine))
  lines.push("", "BY REGION:", ...regionLines)

  return lines.join("\n").slice(0, MAX_CHARS)
}

/** Portfolio-aware suggestion chips. */
export function buildAdminSuggestions(facilities: PortfolioFacility[]): string[] {
  const out = ["Which facilities are most at risk and why?", "Where should we prioritise investment?"]
  const mostCritical = [...facilities]
    .filter((f) => f.tier === "Critical" || f.climateCriticalAttention)
    .sort((a, b) => (a.climateRcs ?? 999) - (b.climateRcs ?? 999))[0]
  if (mostCritical) out.push(`What should I do about ${mostCritical.name}?`)
  out.push("Summarise the portfolio's resilience right now.")
  if (facilities.some((f) => !f.hasClimateSnapshot || !f.hasEnergySnapshot)) {
    out.push("Which facilities still need assessment?")
  }
  return out
}
