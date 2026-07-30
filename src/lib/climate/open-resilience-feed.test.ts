import { describe, it, expect } from "vitest"
import { buildOpenResilienceFeed } from "./open-resilience-feed"
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
    facility({ facilityId: "FAC-A1", region: "Dar es Salaam", composite: 20, hesScore: 80 }),
    facility({ facilityId: "FAC-A2", region: "Dar es Salaam", composite: 40, hesScore: 60 }),
    facility({ facilityId: "FAC-B1", region: "Morogoro", composite: 70, hesScore: 30 }),
    facility({ facilityId: "FAC-DEGRADED", region: "Pwani", degraded: true, composite: 0, hesScore: 0 }),
  ],
  aggregate: {
    trend: [],
    byHazard: { flood: 0, drought: 0, heat: 0, storm: 0 },
    composite: 0,
    facilitiesWithClimate: 3,
  },
}

describe("buildOpenResilienceFeed", () => {
  it("aggregates by region and excludes degraded facilities", () => {
    const feed = buildOpenResilienceFeed(RESULT, "2026-07-29T00:00:00.000Z")
    expect(feed.portfolio.facilitiesWithClimate).toBe(3) // degraded excluded
    const dar = feed.regions.find((r) => r.region === "Dar es Salaam")!
    expect(dar.facilities).toBe(2)
    expect(dar.hazardExposure).toBe(30) // mean(20,40)
    expect(dar.resilienceProxy).toBe(70) // mean(80,60)
    expect(dar.resilienceBand).toBe("Developing") // 70 -> Developing
    const moro = feed.regions.find((r) => r.region === "Morogoro")!
    expect(moro.resilienceProxy).toBe(30)
    expect(moro.resilienceBand).toBe("Critical") // 30 < 35
    // Pwani had only a degraded facility -> not present
    expect(feed.regions.find((r) => r.region === "Pwani")).toBeUndefined()
  })

  it("NEVER leaks facility identifiers, names or coordinates", () => {
    const feed = buildOpenResilienceFeed(RESULT, "2026-07-29T00:00:00.000Z")
    const json = JSON.stringify(feed)
    expect(json).not.toContain("FAC-A1")
    expect(json).not.toContain("FAC-A2")
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
