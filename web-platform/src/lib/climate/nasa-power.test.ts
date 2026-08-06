import { describe, it, expect } from "vitest"
import {
  toHazardTrend,
  toHazardScores,
  toCvi,
  toSolarResource,
  skyFromPsh,
  rangeForPreset,
  customRange,
  projectCvi,
  CVI_2050_BUMP,
  type NasaPowerResponse,
} from "./nasa-power"

/**
 * Build a monthly NASA POWER response: one representative sample per year.
 * heat rises 2018->2023; flood/storm constant; precipitation stays wet (no drought).
 */
function buildMonthly(): NasaPowerResponse {
  const years = [2018, 2019, 2020, 2021, 2022, 2023]
  // T2M_MAX mean rises linearly 24 -> 34
  const t2m = [24, 26, 28, 30, 32, 34]
  const series = {
    T2M_MAX: years.map((y, i) => ({ date: `${y}01`, value: t2m[i] })),
    PRECTOTCORR: years.map((y) => ({ date: `${y}01`, value: 3 })), // wet: peak 3 mm/day, 0 dry months
    WS10M: years.map((y) => ({ date: `${y}01`, value: 6 })), // constant wind
  }
  return {
    temporal: "monthly",
    params: ["T2M_MAX", "PRECTOTCORR", "WS10M"],
    series,
    sourceUrl: "test://nasa-power",
  }
}

describe("hazard normalization (indexFrom mapping)", () => {
  it("maps each year's statistic onto a 0..100 index", () => {
    const trend = toHazardTrend(buildMonthly())
    expect(trend).toHaveLength(6)
    // heat: (24-20)/(42-20)*100 = 18 ; (34-20)/22*100 = 64
    expect(trend[0].heat).toBe(Math.round((4 / 22) * 100))
    expect(trend[5].heat).toBe(Math.round((14 / 22) * 100))
    // flood monthly bounds [0,15]: 3 -> 20
    expect(trend[0].flood).toBe(20)
    // storm bounds [0,15]: 6 -> 40
    expect(trend[0].storm).toBe(40)
    // wet year => no dry months => drought 0
    expect(trend[0].drought).toBe(0)
  })
})

describe("toHazardScores", () => {
  it("returns the latest-year index per hazard and flags a clear rising heat trend", () => {
    const scores = toHazardScores(buildMonthly())
    const heat = scores.find((s) => s.type === "Heat")!
    expect(heat.score).toBe(64)
    expect(heat.trend).toBe("rising") // monotonic increase across all years
    const flood = scores.find((s) => s.type === "Flood")!
    expect(flood.trend).toBe("stable") // constant series
  })

  it("returns an empty array when there are no years", () => {
    const empty: NasaPowerResponse = {
      temporal: "monthly",
      params: ["T2M_MAX"],
      series: { T2M_MAX: [] },
      sourceUrl: "test://empty",
    }
    expect(toHazardScores(empty)).toEqual([])
  })
})

describe("toCvi", () => {
  it("composes the four latest-year hazard indices into a mean composite", () => {
    const cvi = toCvi(buildMonthly())
    // heat 64, flood 20, storm 40, drought 0 => (64+20+40+0)/4 = 31
    expect(cvi.byHazard).toEqual({ flood: 20, drought: 0, heat: 64, storm: 40 })
    expect(cvi.composite).toBe(31)
  })
})

describe("projectCvi", () => {
  it("returns the baseline for 2030 and bumps every hazard for 2050 (clamped)", () => {
    const base = toCvi(buildMonthly())
    expect(projectCvi(base, 2030)).toEqual(base)
    const future = projectCvi(base, 2050)
    expect(future.byHazard.heat).toBe(Math.min(100, base.byHazard.heat + CVI_2050_BUMP))
    expect(future.byHazard.drought).toBe(base.byHazard.drought + CVI_2050_BUMP)
  })
})

describe("solar resource", () => {
  it("classifies sky from peak-sun-hours", () => {
    expect(skyFromPsh(6)).toBe("sunny")
    expect(skyFromPsh(4.5)).toBe("partly")
    expect(skyFromPsh(3)).toBe("cloudy")
  })

  it("averages positive ALLSKY samples into a peak-sun-hours value", () => {
    const resp: NasaPowerResponse = {
      temporal: "daily",
      params: ["ALLSKY_SFC_SW_DWN"],
      series: { ALLSKY_SFC_SW_DWN: [{ date: "20230101", value: 5 }, { date: "20230102", value: 6 }, { date: "20230103", value: 0 }] },
      sourceUrl: "test://solar",
    }
    const solar = toSolarResource(resp)
    expect(solar).not.toBeNull()
    expect(solar!.peakSunHours).toBe(5.5) // mean of positive samples 5,6
    expect(solar!.sky).toBe("sunny")
  })

  it("returns null when no positive solar samples exist", () => {
    const resp: NasaPowerResponse = {
      temporal: "daily",
      params: ["ALLSKY_SFC_SW_DWN"],
      series: { ALLSKY_SFC_SW_DWN: [{ date: "20230101", value: 0 }] },
      sourceUrl: "test://solar-empty",
    }
    expect(toSolarResource(resp)).toBeNull()
  })
})

describe("time-range helpers", () => {
  const now = new Date("2026-06-15T00:00:00Z")

  it("uses monthly data for multi-year presets and daily for <= 2 years", () => {
    const fiveY = rangeForPreset("5y", now)
    expect(fiveY.temporal).toBe("monthly")
    expect(fiveY.endYear).toBe(2025) // last complete prior year
    expect(fiveY.startYear).toBe(2021)

    const oneY = rangeForPreset("1y", now)
    expect(oneY.temporal).toBe("daily")
  })

  it("builds a custom range, clamping the end year for reporting latency", () => {
    const r = customRange(2015, 2030, now)
    expect(r.temporal).toBe("monthly")
    expect(r.startYear).toBe(2015)
    expect(r.endYear).toBe(2025) // clamped to now.year - 1
  })
})
