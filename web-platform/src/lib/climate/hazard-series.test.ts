import { describe, it, expect } from "vitest"
import {
  toHazardSeries,
  severityBuckets,
  seriesStats,
  HAZARD_KEYS,
} from "./hazard-series"

const TREND = [
  { year: 2019, heat: 30, flood: 10, storm: 20, drought: 45 },
  { year: 2020, heat: 42, flood: 12, storm: 25, drought: 50 },
  { year: 2021, heat: 55, flood: 66, storm: 30, drought: 48 },
  { year: 2022, heat: 70, flood: 80, storm: 39, drought: 40 },
]

describe("HAZARD_KEYS", () => {
  it("lists the four hazard dimensions", () => {
    expect(HAZARD_KEYS).toEqual(["heat", "flood", "storm", "drought"])
  })
})

describe("toHazardSeries", () => {
  it("slices a single hazard's {year,value} series out of the combined trend", () => {
    expect(toHazardSeries(TREND, "heat")).toEqual([
      { year: 2019, value: 30 },
      { year: 2020, value: 42 },
      { year: 2021, value: 55 },
      { year: 2022, value: 70 },
    ])
  })

  it("returns an empty series for an empty trend", () => {
    expect(toHazardSeries([], "flood")).toEqual([])
  })
})

describe("severityBuckets", () => {
  it("bands values at low (<40), moderate (40-65), high (>=66)", () => {
    // heat series: 30(low), 42(mod), 55(mod), 70(high)
    expect(severityBuckets(toHazardSeries(TREND, "heat"))).toEqual({
      low: 1,
      moderate: 2,
      high: 1,
    })
  })

  it("classifies exact boundary values correctly", () => {
    const b = severityBuckets([
      { year: 1, value: 39 }, // low
      { year: 2, value: 40 }, // moderate
      { year: 3, value: 65 }, // moderate
      { year: 4, value: 66 }, // high
    ])
    expect(b).toEqual({ low: 1, moderate: 2, high: 1 })
  })
})

describe("seriesStats", () => {
  it("returns null for an empty series", () => {
    expect(seriesStats([])).toBeNull()
  })

  it("computes first/latest/min/max/avg", () => {
    const s = seriesStats(toHazardSeries(TREND, "flood"))! // 10,12,66,80
    expect(s.first).toBe(10)
    expect(s.latest).toBe(80)
    expect(s.min).toBe(10)
    expect(s.max).toBe(80)
    expect(s.avg).toBe(42) // round((10+12+66+80)/4 = 42)
  })

  it("flags a rising trend when latest exceeds the early mean by >5", () => {
    // flood early mean (first 3): (10+12+66)/3 = 29.33; latest 80 → rising
    expect(seriesStats(toHazardSeries(TREND, "flood"))!.trend).toBe("rising")
  })

  it("flags a falling trend when latest is >5 below the early mean", () => {
    const s = seriesStats([
      { year: 1, value: 80 },
      { year: 2, value: 70 },
      { year: 3, value: 60 },
      { year: 4, value: 40 },
    ])!
    expect(s.trend).toBe("falling")
  })

  it("reports stable when the change stays within the deadband", () => {
    const s = seriesStats([
      { year: 1, value: 50 },
      { year: 2, value: 52 },
      { year: 3, value: 48 },
      { year: 4, value: 51 },
    ])!
    expect(s.trend).toBe("stable")
  })
})
