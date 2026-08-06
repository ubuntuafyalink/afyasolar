import { describe, it, expect } from "vitest"
import { normalizeOpenMeteoForecast, openMeteoUrl, type OpenMeteoResponse } from "./open-meteo"

const RESP: OpenMeteoResponse = {
  daily: {
    time: ["2026-07-29", "2026-07-30", "2026-07-31", "2026-08-01", "2026-08-02"],
    temperature_2m_max: [31, 31, 31, 31, 31], // mean 31 -> (11/22)*100 = 50
    precipitation_sum: [0, 0, 40, 0, 0], // peak 40 -> (40/80)*100 = 50 ; longest dry run = 2
    wind_speed_10m_max: [3, 7.5, 4, 6, 5], // peak 7.5 -> (7.5/15)*100 = 50
  },
}

describe("normalizeOpenMeteoForecast", () => {
  it("maps a daily forecast into 0..100 hazard indices", () => {
    const f = normalizeOpenMeteoForecast(RESP)
    expect(f.days).toBe(5)
    expect(f.window).toEqual({ start: "2026-07-29", end: "2026-08-02" })
    expect(f.byHazard.heat).toBe(50)
    expect(f.byHazard.flood).toBe(50)
    expect(f.byHazard.storm).toBe(50)
    // longest dry run 2 of 5 days -> (2/5)*100 = 40
    expect(f.byHazard.drought).toBe(40)
  })

  it("handles nulls and missing arrays without throwing", () => {
    const f = normalizeOpenMeteoForecast({ daily: { time: [], temperature_2m_max: [null] } })
    expect(f.days).toBe(0)
    expect(f.byHazard).toEqual({ heat: 0, flood: 0, storm: 0, drought: 0 })
    expect(f.window).toEqual({ start: null, end: null })
  })

  it("handles a completely empty response", () => {
    const f = normalizeOpenMeteoForecast({})
    expect(f.days).toBe(0)
    expect(f.byHazard.heat).toBe(0)
  })
})

describe("openMeteoUrl", () => {
  it("builds a keyless forecast URL with m/s wind and the expected daily vars", () => {
    const url = openMeteoUrl(-6.79, 39.21)
    expect(url).toContain("latitude=-6.79")
    expect(url).toContain("longitude=39.21")
    expect(url).toContain("wind_speed_unit=ms")
    expect(url).toContain("temperature_2m_max")
    expect(url).toContain("precipitation_sum")
    expect(url).toContain("wind_speed_10m_max")
    expect(url).toContain("forecast_days=16")
  })
})
