import { describe, it, expect } from "vitest"
import { buildOpenResilienceFeed, MIN_REGION_FACILITIES } from "./open-resilience-feed"
import type { PortfolioClimateResult } from "@/lib/climate/portfolio-climate-server"

function facility(over: Partial<PortfolioClimateResult["data"][number]>) {
  return {
    facilityId: "SECRET-FAC-123",
    region: "Dar es Salaam",
    lat: -6.79,
    lon: 39.21,
    coordsSource: "facility" as const,
    byHazard: { flood: 10, drought: 20, heat: 30, storm: 40 },
    composite: 25,
    hesScore: 75,
    topHazard: { type: "Wind / storm", score: 40 },
    hazardScores: [],
    solar: null,
    degraded: false,
    ...over,
  }
}

const RESULT: PortfolioClimateResult = {
  data: [
    // Dar es Salaam has 3 facilities, so it clears the suppression threshold.
    facility({ facilityId: "FAC-A1", region: "Dar es Salaam", composite: 20, hesScore: 80 }),
    facility({ facilityId: "FAC-A2", region: "Dar es Salaam", composite: 40, hesScore: 60 }),
    facility({ facilityId: "FAC-A3", region: "Dar es Salaam", composite: 30, hesScore: 70 }),
    // Morogoro has a single facility and must be withheld.
    facility({ facilityId: "FAC-B1", region: "Morogoro", composite: 70, hesScore: 30 }),
    facility({ facilityId: "FAC-DEGRADED", region: "Pwani", degraded: true, composite: 0, hesScore: 0 }),
  ],
  aggregate: {
    trend: [],
    byHazard: { flood: 0, drought: 0, heat: 0, storm: 0 },
    composite: 0,
    facilitiesWithClimate: 4,
  },
}

describe("buildOpenResilienceFeed", () => {
  it("aggregates by region and excludes degraded facilities", () => {
    const feed = buildOpenResilienceFeed(RESULT, "2026-07-29T00:00:00.000Z")
    const dar = feed.regions.find((r) => r.region === "Dar es Salaam")!
    expect(dar.facilities).toBe(3)
    expect(dar.hazardExposure).toBe(30) // mean(20,40,30)
    expect(dar.resilienceProxy).toBe(70) // mean(80,60,70)
    expect(dar.resilienceBand).toBe("Developing")
    // Pwani had only a degraded facility -> not present
    expect(feed.regions.find((r) => r.region === "Pwani")).toBeUndefined()
  })

  it("withholds regions below the small-cell threshold", () => {
    const feed = buildOpenResilienceFeed(RESULT, "2026-07-29T00:00:00.000Z")
    expect(MIN_REGION_FACILITIES).toBeGreaterThanOrEqual(3)
    expect(feed.regions.find((r) => r.region === "Morogoro")).toBeUndefined()
    expect(feed.minRegionFacilities).toBe(MIN_REGION_FACILITIES)
    expect(feed.suppressedRegions).toBe(1)
    expect(feed.suppressedFacilities).toBe(1)
    // Every region that IS published must clear the threshold.
    for (const r of feed.regions) {
      expect(r.facilities).toBeGreaterThanOrEqual(MIN_REGION_FACILITIES)
    }
  })

  it("keeps withheld regions out of the portfolio so they cannot be recovered by subtraction", () => {
    const feed = buildOpenResilienceFeed(RESULT, "2026-07-29T00:00:00.000Z")
    // Only the 3 Dar es Salaam facilities count; the lone Morogoro site does not.
    expect(feed.portfolio.facilitiesWithClimate).toBe(3)
    // Portfolio equals the sum of published regions exactly, leaving no residual.
    const publishedCount = feed.regions.reduce((n, r) => n + r.facilities, 0)
    expect(publishedCount).toBe(feed.portfolio.facilitiesWithClimate)
    const weighted =
      feed.regions.reduce((s, r) => s + r.hazardExposure * r.facilities, 0) / publishedCount
    expect(Math.round(weighted)).toBe(feed.portfolio.hazardExposure)
  })

  it("NEVER leaks facility identifiers, names or coordinates", () => {
    const feed = buildOpenResilienceFeed(RESULT, "2026-07-29T00:00:00.000Z")
    const json = JSON.stringify(feed)
    expect(json).not.toContain("FAC-A1")
    expect(json).not.toContain("FAC-A2")
    expect(json).not.toContain("FAC-A3")
    expect(json).not.toContain("FAC-B1")
    expect(json).not.toContain("facilityId")
    expect(json).not.toContain("39.21") // longitude
    expect(json).not.toContain("-6.79") // latitude
  })

  it("stamps version metadata and a privacy disclaimer", () => {
    const feed = buildOpenResilienceFeed(RESULT, "2026-07-29T00:00:00.000Z")
    expect(feed.generatedAt).toBe("2026-07-29T00:00:00.000Z")
    expect(feed.formulaVersion).toBe("criphc-v1")
    expect(feed.normalizationVersion).toBe("v1")
    expect(feed.disclaimer.toLowerCase()).toContain("de-identified")
  })

  it("handles an all-degraded / empty portfolio safely", () => {
    const empty = buildOpenResilienceFeed({ ...RESULT, data: [] }, "t")
    expect(empty.portfolio.facilitiesWithClimate).toBe(0)
    expect(empty.portfolio.resilienceBand).toBe("Critical")
    expect(empty.regions).toEqual([])
  })
})
