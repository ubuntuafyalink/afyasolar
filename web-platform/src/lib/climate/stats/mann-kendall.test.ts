import { describe, it, expect } from "vitest"
import { mannKendall, sensSlope } from "./mann-kendall"

describe("mannKendall", () => {
  it("detects a monotonic increasing trend", () => {
    const r = mannKendall([18, 27, 36, 45, 55, 64])
    expect(r.s).toBe(15) // C(6,2), all concordant
    expect(r.z).toBeGreaterThan(1.645)
    expect(r.trend).toBe("increasing")
  })

  it("detects a monotonic decreasing trend", () => {
    const r = mannKendall([64, 55, 45, 36, 27, 18])
    expect(r.s).toBe(-15)
    expect(r.z).toBeLessThan(-1.645)
    expect(r.trend).toBe("decreasing")
  })

  it("reports no trend for a flat series (S = 0)", () => {
    const r = mannKendall([50, 50, 50, 50, 50])
    expect(r.s).toBe(0)
    expect(r.z).toBe(0)
    expect(r.trend).toBe("no-trend")
  })

  it("reports no trend for noisy data without a clear direction", () => {
    const r = mannKendall([50, 48, 51, 49, 50, 47])
    expect(r.trend).toBe("no-trend")
  })

  it("returns no-trend for series shorter than 3 points", () => {
    expect(mannKendall([1, 2]).trend).toBe("no-trend")
    expect(mannKendall([]).trend).toBe("no-trend")
  })
})

describe("sensSlope", () => {
  it("estimates the slope of a linear series", () => {
    expect(sensSlope([1, 2, 3, 4, 5])).toBe(1)
    expect(sensSlope([10, 8, 6, 4])).toBe(-2)
  })

  it("returns 0 for a flat or too-short series", () => {
    expect(sensSlope([5, 5, 5])).toBe(0)
    expect(sensSlope([7])).toBe(0)
  })
})
