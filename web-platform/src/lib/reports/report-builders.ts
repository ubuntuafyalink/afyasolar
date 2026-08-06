/**
 * Build a `ReportDocument` from the REAL admin portfolio data (NASA POWER climate
 * exposure, CRiPHC resilience scoring, and energy/power sizing). Pure functions —
 * no React, no fetch — so they are deterministic and unit-testable, and the same
 * document feeds every export renderer.
 */
import { formatCurrency } from "@/lib/utils"
import { projectCvi } from "@/lib/climate/nasa-power"
import type { ResiHealthCvi } from "@/lib/dashboard/facility-demo-data"
import type { PortfolioFacility } from "@/lib/dashboard/admin-portfolio-types"
import type { PortfolioClimateAggregate } from "@/hooks/use-admin-portfolio-climate"
import type { ReportDocument, ReportScope, ReportSection } from "./report-model"

const UNGROUPED = "Unspecified"
const SOURCE = "NASA POWER climate data + AfyaSolar CRiPHC scoring"
const DISCLAIMER =
  "Climate indices derive from NASA POWER satellite reanalysis (free, no API key). " +
  "Resilience (RCS/CRiPHC) and energy figures come from saved facility assessments. " +
  "Facilities without a saved assessment or reachable climate coordinate are shown as not assessed."

const r0 = (n: number) => Math.round(n)
const pct = (n: number | null | undefined) => (n != null ? `${r0(n)} / 100` : "—")
const kw = (n: number | null | undefined) => (n != null ? `${n.toFixed(1)} kW` : "—")
const kwh = (n: number | null | undefined) => (n != null ? `${n.toFixed(1)} kWh` : "—")

// --- scope helpers -----------------------------------------------------------

function scopedFacilities(facilities: PortfolioFacility[], scope: ReportScope): PortfolioFacility[] {
  if (scope.kind === "region") return facilities.filter((f) => (f.region || UNGROUPED) === scope.region)
  if (scope.kind === "facility") return facilities.filter((f) => f.id === scope.facilityId)
  return facilities
}

function scopeLabel(scoped: PortfolioFacility[], scope: ReportScope): string {
  if (scope.kind === "facility") return scoped[0]?.name ?? "Facility"
  if (scope.kind === "region") return scope.region
  return "All facilities"
}

function scopeSubtitle(scoped: PortfolioFacility[], scope: ReportScope): string {
  const kind = scope.kind === "facility" ? "Facility" : scope.kind === "region" ? "Region" : "Portfolio"
  if (scope.kind === "facility") return `${kind} · ${scopeLabel(scoped, scope)}`
  return `${kind} · ${scopeLabel(scoped, scope)} · ${scoped.length} ${scoped.length === 1 ? "facility" : "facilities"}`
}

function climateFacilities(scoped: PortfolioFacility[]): PortfolioFacility[] {
  return scoped.filter((f) => f.climate && !f.climate.degraded)
}

function avg(values: number[]): number | null {
  return values.length ? values.reduce((s, v) => s + v, 0) / values.length : null
}

/** Average composite + per-hazard CVI across the scoped facilities with real climate. */
function avgCvi(scoped: PortfolioFacility[]): ResiHealthCvi | null {
  const fac = climateFacilities(scoped)
  if (!fac.length) return null
  const mean = (pick: (f: PortfolioFacility) => number) => r0(fac.reduce((s, f) => s + pick(f), 0) / fac.length)
  return {
    composite: mean((f) => f.climate!.composite),
    byHazard: {
      flood: mean((f) => f.climate!.byHazard.flood),
      drought: mean((f) => f.climate!.byHazard.drought),
      heat: mean((f) => f.climate!.byHazard.heat),
      storm: mean((f) => f.climate!.byHazard.storm),
    },
  }
}

function metaFor(scoped: PortfolioFacility[], scope: ReportScope, now: Date): { label: string; value: string }[] {
  const withClimate = climateFacilities(scoped).length
  const energyAssessed = scoped.filter((f) => f.hasEnergySnapshot).length
  return [
    { label: "Generated", value: now.toLocaleDateString("en-GB", { year: "numeric", month: "long", day: "numeric" }) },
    { label: "Scope", value: scopeSubtitle(scoped, scope) },
    { label: "Data source", value: SOURCE },
    { label: "NASA climate coverage", value: `${withClimate} / ${scoped.length} facilities` },
    { label: "Energy-assessed", value: `${energyAssessed} / ${scoped.length} facilities` },
  ]
}

// --- section builders --------------------------------------------------------

function climateSections(
  scoped: PortfolioFacility[],
  aggregate: PortfolioClimateAggregate | null,
  scope: ReportScope,
): ReportSection[] {
  const sections: ReportSection[] = []
  const fac = climateFacilities(scoped)

  if (!fac.length) {
    sections.push({
      kind: "stats",
      heading: "Climate hazard (NASA POWER)",
      items: [{ label: "Status", value: "No reachable NASA climate data for this scope yet." }],
    })
    return sections
  }

  const cvi = avgCvi(scoped)!
  sections.push({
    kind: "stats",
    heading: "Climate hazard exposure (NASA POWER)",
    items: [
      { label: "Composite CVI", value: pct(cvi.composite) },
      { label: "Hazard Exposure capacity (HES)", value: pct(100 - cvi.composite) },
      { label: "Heat", value: pct(cvi.byHazard.heat) },
      { label: "Flood", value: pct(cvi.byHazard.flood) },
      { label: "Drought", value: pct(cvi.byHazard.drought) },
      { label: "Storm", value: pct(cvi.byHazard.storm) },
    ],
    note: "Climate Vulnerability Index — higher = more exposed. HES capacity = 100 − CVI.",
  })

  sections.push({
    kind: "bars",
    heading: "Average hazard indices",
    items: [
      { label: "Heat", value: cvi.byHazard.heat },
      { label: "Flood", value: cvi.byHazard.flood },
      { label: "Drought", value: cvi.byHazard.drought },
      { label: "Storm", value: cvi.byHazard.storm },
    ],
  })

  // Forward projection 2030 / 2050.
  const now2030 = projectCvi(cvi, 2030)
  const fut2050 = projectCvi(cvi, 2050)
  sections.push({
    kind: "table",
    heading: "Projected Climate Vulnerability Index",
    columns: ["Hazard", "Now", "2030", "2050"],
    rows: [
      ["Composite", cvi.composite, now2030.composite, fut2050.composite],
      ["Heat", cvi.byHazard.heat, now2030.byHazard.heat, fut2050.byHazard.heat],
      ["Flood", cvi.byHazard.flood, now2030.byHazard.flood, fut2050.byHazard.flood],
      ["Drought", cvi.byHazard.drought, now2030.byHazard.drought, fut2050.byHazard.drought],
      ["Storm", cvi.byHazard.storm, now2030.byHazard.storm, fut2050.byHazard.storm],
    ],
    note: "Projection per AfyaSolar climate model (2050 applies a conservative exposure increase).",
  })

  if (scope.kind === "facility") {
    const hs = scoped[0]?.climate?.hazardScores ?? []
    if (hs.length) {
      sections.push({
        kind: "table",
        heading: "Hazard detail & trend",
        columns: ["Hazard", "Index", "Trend", "Note"],
        rows: hs.map((h) => [h.type, r0(h.score), h.trend, h.note]),
      })
    }
  } else {
    sections.push({
      kind: "table",
      heading: "Per-facility hazard exposure",
      columns: ["Facility", "Region", "Heat", "Flood", "Drought", "Storm", "CVI", "HES", "Top hazard"],
      rows: fac.map((f) => [
        f.name,
        f.region ?? "—",
        r0(f.climate!.byHazard.heat),
        r0(f.climate!.byHazard.flood),
        r0(f.climate!.byHazard.drought),
        r0(f.climate!.byHazard.storm),
        r0(f.climate!.composite),
        r0(f.climate!.hesScore),
        f.climate!.topHazard.type,
      ]),
    })

    // Portfolio-weighted NASA trend (only meaningful at portfolio scope).
    if (scope.kind === "portfolio" && aggregate?.trend?.length) {
      sections.push({
        kind: "table",
        heading: "NASA hazard trend (portfolio-weighted)",
        columns: ["Year", "Heat", "Flood", "Drought", "Storm"],
        rows: aggregate.trend.map((t) => [t.year, r0(t.heat), r0(t.flood), r0(t.drought), r0(t.storm)]),
      })
    }
  }

  return sections
}

function resilienceSections(scoped: PortfolioFacility[], scope: ReportScope): ReportSection[] {
  const sections: ReportSection[] = []
  const assessed = scoped.filter((f) => f.climateRcs != null)

  const tierCounts = { Resilient: 0, Developing: 0, "At risk": 0, Critical: 0 }
  for (const f of assessed) if (f.tier) tierCounts[f.tier] += 1

  sections.push({
    kind: "stats",
    heading: "Climate resilience (RCS / CRiPHC)",
    items: [
      { label: "Climate-assessed", value: `${assessed.length} / ${scoped.length} facilities` },
      { label: "Average RCS", value: pct(avg(assessed.map((f) => f.climateRcs as number))) },
      { label: "Resilient", value: String(tierCounts.Resilient) },
      { label: "Developing", value: String(tierCounts.Developing) },
      { label: "At risk", value: String(tierCounts["At risk"]) },
      { label: "Critical", value: String(tierCounts.Critical) },
    ],
    note: "RCS 0–100; tiers: Resilient ≥75, Developing ≥55, At risk ≥35, else Critical.",
  })

  if (scope.kind === "facility") {
    const d = scoped[0]?.dimensions
    if (d) {
      sections.push({
        kind: "bars",
        heading: "CRiPHC capacity dimensions",
        items: [
          { label: "Hazard Exposure (HES)", value: d.hes ?? 0 },
          { label: "Critical Service Fragility (CSF)", value: d.csf ?? 0 },
          { label: "Energy Continuity & Power Quality (ECPQ)", value: d.ecpq ?? 0 },
          { label: "Efficiency & Demand Control (EDC)", value: d.edc ?? 0 },
          { label: "Readiness & Response (RRC)", value: d.rrc ?? 0 },
        ],
        note: "Each 0–100; higher = more resilient.",
      })
    }
  } else {
    sections.push({
      kind: "table",
      heading: "Per-facility resilience",
      columns: ["Facility", "Region", "RCS", "Tier", "HES", "CSF", "ECPQ", "EDC", "RRC"],
      rows: scoped.map((f) => [
        f.name,
        f.region ?? "—",
        f.climateRcs != null ? r0(f.climateRcs) : "—",
        f.tier ?? "Not assessed",
        f.dimensions?.hes != null ? r0(f.dimensions.hes) : "—",
        f.dimensions?.csf != null ? r0(f.dimensions.csf) : "—",
        f.dimensions?.ecpq != null ? r0(f.dimensions.ecpq) : "—",
        f.dimensions?.edc != null ? r0(f.dimensions.edc) : "—",
        f.dimensions?.rrc != null ? r0(f.dimensions.rrc) : "—",
      ]),
    })
  }

  return sections
}

function energySections(scoped: PortfolioFacility[], scope: ReportScope): ReportSection[] {
  const sections: ReportSection[] = []
  const assessed = scoped.filter((f) => f.hasEnergySnapshot)
  const sized = scoped.filter((f) => f.energy)
  const sum = (pick: (f: PortfolioFacility) => number | null | undefined) =>
    sized.reduce((s, f) => s + (pick(f) ?? 0), 0)
  const effVals = scoped.map((f) => f.energyBmiPercent).filter((v): v is number => v != null)

  sections.push({
    kind: "stats",
    heading: "Energy & power",
    items: [
      { label: "Energy-assessed", value: `${assessed.length} / ${scoped.length} facilities` },
      { label: "Average efficiency (BMI)", value: effVals.length ? `${r0(avg(effVals)!)}%` : "—" },
      { label: "Total solar capacity", value: `${sum((f) => f.energy?.solarArraySize).toFixed(1)} kW` },
      { label: "Total daily load", value: `${sum((f) => f.energy?.dailyLoad).toFixed(1)} kWh/day` },
      { label: "Total modelled annual savings", value: formatCurrency(sum((f) => f.energy?.annualSavings)) },
    ],
  })

  if (scope.kind !== "facility" || scoped[0]?.energy) {
    sections.push({
      kind: "table",
      heading: "Per-facility energy",
      columns: ["Facility", "Region", "Efficiency", "Solar", "Daily load", "Power need", "Annual savings"],
      rows: scoped.map((f) => [
        f.name,
        f.region ?? "—",
        f.energyBmiPercent != null ? `${r0(f.energyBmiPercent)}%` : "—",
        kw(f.energy?.solarArraySize),
        kwh(f.energy?.dailyLoad),
        kw(f.energy?.requiredKw),
        f.energy?.annualSavings != null ? formatCurrency(f.energy.annualSavings) : "—",
      ]),
    })
  }

  return sections
}

// --- public builders ---------------------------------------------------------

export type BuildInput = {
  facilities: PortfolioFacility[]
  aggregate: PortfolioClimateAggregate | null
  scope: ReportScope
  now?: Date
}

export function buildClimateHazardReport({ facilities, aggregate, scope, now = new Date() }: BuildInput): ReportDocument {
  const scoped = scopedFacilities(facilities, scope)
  return {
    title: "Climate Hazard & NASA Report",
    subtitle: scopeSubtitle(scoped, scope),
    meta: metaFor(scoped, scope, now),
    sections: climateSections(scoped, aggregate, scope),
    disclaimer: DISCLAIMER,
  }
}

export function buildResilienceReport({ facilities, scope, now = new Date() }: BuildInput): ReportDocument {
  const scoped = scopedFacilities(facilities, scope)
  return {
    title: "Climate Resilience (RCS) Report",
    subtitle: scopeSubtitle(scoped, scope),
    meta: metaFor(scoped, scope, now),
    sections: resilienceSections(scoped, scope),
    disclaimer: DISCLAIMER,
  }
}

export function buildEnergyReport({ facilities, scope, now = new Date() }: BuildInput): ReportDocument {
  const scoped = scopedFacilities(facilities, scope)
  return {
    title: "Energy & Power Report",
    subtitle: scopeSubtitle(scoped, scope),
    meta: metaFor(scoped, scope, now),
    sections: energySections(scoped, scope),
    disclaimer: DISCLAIMER,
  }
}

export function buildFullReport({ facilities, aggregate, scope, now = new Date() }: BuildInput): ReportDocument {
  const scoped = scopedFacilities(facilities, scope)
  return {
    title: "Full Resilience & Energy Assessment",
    subtitle: scopeSubtitle(scoped, scope),
    meta: metaFor(scoped, scope, now),
    sections: [
      ...climateSections(scoped, aggregate, scope),
      ...resilienceSections(scoped, scope),
      ...energySections(scoped, scope),
    ],
    disclaimer: DISCLAIMER,
  }
}

export function buildReport(type: string, input: BuildInput): ReportDocument {
  switch (type) {
    case "climate":
      return buildClimateHazardReport(input)
    case "resilience":
      return buildResilienceReport(input)
    case "energy":
      return buildEnergyReport(input)
    default:
      return buildFullReport(input)
  }
}
