/**
 * Shapes the internal portfolio-climate result into the PUBLIC, de-identified
 * open-data resilience feed (spec §8.8 real-time open-data API; §10 privacy).
 *
 * This is the digital-public-good surface: it MUST NOT expose any facility
 * identifier, name, or precise coordinates. Data is aggregated to the region
 * level (the intended atlas granularity) and reports only climate-derived
 * hazard exposure and a resilience proxy. The shaping is a pure function so the
 * de-identification guarantee is unit-testable.
 */
import type { PortfolioClimateResult } from "@/lib/climate/portfolio-climate-server"
import { NORMALIZATION_VERSION } from "@/lib/climate/nasa-power"
import { CRIPHC_FORMULA_VERSION, rcsTierLabel } from "@/lib/climate/criphc-scoring"

export type ResilienceBand = "Resilient" | "Developing" | "At risk" | "Critical"

export type OpenRegionResilience = {
  region: string
  facilities: number
  /** Mean hazard-exposure composite, 0..100 (higher = more exposed). */
  hazardExposure: number
  /** Mean HES resilience proxy, 0..100 (higher = more resilient). */
  resilienceProxy: number
  resilienceBand: ResilienceBand
  byHazard: { flood: number; drought: number; heat: number; storm: number }
}

export type OpenResilienceFeed = {
  generatedAt: string
  source: string
  formulaVersion: string
  normalizationVersion: string
  /** Smallest number of facilities a region must contain to be reported. */
  minRegionFacilities: number
  /** Regions withheld because they fell below `minRegionFacilities`. */
  suppressedRegions: number
  /** Facilities in those withheld regions. Excluded from every figure below. */
  suppressedFacilities: number
  portfolio: {
    facilitiesWithClimate: number
    hazardExposure: number
    resilienceProxy: number
    resilienceBand: ResilienceBand
    byHazard: { flood: number; drought: number; heat: number; storm: number }
  }
  regions: OpenRegionResilience[]
  disclaimer: string
}

const UNSPECIFIED_REGION = "Unspecified"

/**
 * Small-cell suppression threshold. A region reporting fewer than this many
 * facilities would describe individual sites closely enough to re-identify
 * them, so it is withheld entirely.
 */
export const MIN_REGION_FACILITIES = 3

type Acc = {
  n: number
  composite: number
  proxy: number
  flood: number
  drought: number
  heat: number
  storm: number
}

function emptyAcc(): Acc {
  return { n: 0, composite: 0, proxy: 0, flood: 0, drought: 0, heat: 0, storm: 0 }
}

function round(n: number): number {
  return Math.round(n)
}

/**
 * Build the public feed from the internal portfolio result. Degraded facilities
 * (no usable climate data) are excluded. Output contains ONLY region-level
 * aggregates — no facilityId, name, or lat/lon is ever included.
 *
 * Regions holding fewer than `MIN_REGION_FACILITIES` facilities are withheld,
 * and their facilities are also left out of the portfolio totals. Both halves
 * matter: publishing a portfolio mean alongside every reportable region mean
 * would let a reader recover the withheld group by subtraction, which for a
 * single-facility region discloses that facility exactly.
 */
export function buildOpenResilienceFeed(
  result: PortfolioClimateResult,
  generatedAt: string,
): OpenResilienceFeed {
  const byRegion = new Map<string, Acc>()

  for (const f of result.data) {
    if (f.degraded) continue
    const region = f.region && f.region.trim() ? f.region.trim() : UNSPECIFIED_REGION
    const acc = byRegion.get(region) ?? emptyAcc()
    acc.n += 1
    acc.composite += f.composite
    acc.proxy += f.hesScore
    acc.flood += f.byHazard.flood
    acc.drought += f.byHazard.drought
    acc.heat += f.byHazard.heat
    acc.storm += f.byHazard.storm
    byRegion.set(region, acc)
  }

  const reportable = [...byRegion.entries()].filter(([, a]) => a.n >= MIN_REGION_FACILITIES)
  const withheld = [...byRegion.entries()].filter(([, a]) => a.n < MIN_REGION_FACILITIES)
  const suppressedFacilities = withheld.reduce((sum, [, a]) => sum + a.n, 0)

  const portfolio = emptyAcc()
  for (const [, a] of reportable) {
    portfolio.n += a.n
    portfolio.composite += a.composite
    portfolio.proxy += a.proxy
    portfolio.flood += a.flood
    portfolio.drought += a.drought
    portfolio.heat += a.heat
    portfolio.storm += a.storm
  }

  const regions: OpenRegionResilience[] = reportable
    .map(([region, a]) => {
      const proxy = round(a.proxy / a.n)
      return {
        region,
        facilities: a.n,
        hazardExposure: round(a.composite / a.n),
        resilienceProxy: proxy,
        resilienceBand: rcsTierLabel(proxy),
        byHazard: {
          flood: round(a.flood / a.n),
          drought: round(a.drought / a.n),
          heat: round(a.heat / a.n),
          storm: round(a.storm / a.n),
        },
      }
    })
    .sort((a, b) => a.region.localeCompare(b.region))

  const pProxy = portfolio.n ? round(portfolio.proxy / portfolio.n) : 0

  return {
    generatedAt,
    source: "NASA POWER climate reanalysis, de-identified and aggregated by region",
    formulaVersion: CRIPHC_FORMULA_VERSION,
    normalizationVersion: NORMALIZATION_VERSION,
    minRegionFacilities: MIN_REGION_FACILITIES,
    suppressedRegions: withheld.length,
    suppressedFacilities,
    portfolio: {
      facilitiesWithClimate: portfolio.n,
      hazardExposure: portfolio.n ? round(portfolio.composite / portfolio.n) : 0,
      resilienceProxy: pProxy,
      resilienceBand: rcsTierLabel(pProxy),
      byHazard: {
        flood: portfolio.n ? round(portfolio.flood / portfolio.n) : 0,
        drought: portfolio.n ? round(portfolio.drought / portfolio.n) : 0,
        heat: portfolio.n ? round(portfolio.heat / portfolio.n) : 0,
        storm: portfolio.n ? round(portfolio.storm / portfolio.n) : 0,
      },
    },
    regions,
    disclaimer:
      "Public open data. Aggregated and de-identified: contains no facility identifiers, " +
      "names, or precise locations. Regions with fewer than " +
      `${MIN_REGION_FACILITIES} facilities are withheld, and those facilities are excluded ` +
      "from the portfolio totals, so withheld values cannot be recovered by subtraction. " +
      "Hazard exposure and resilience are derived from NASA POWER climate reanalysis. " +
      "Not personal data.",
  }
}
