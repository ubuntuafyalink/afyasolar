import { describe, it, expect } from "vitest"
import { seededUnit, solarFactor, buildSeedTelemetryRow } from "./seed"

describe("seededUnit", () => {
  it("is deterministic and within [0,1)", () => {
    const a = seededUnit("seed-abc:12")
    const b = seededUnit("seed-abc:12")
    expect(a).toBe(b)
    expect(a).toBeGreaterThanOrEqual(0)
    expect(a).toBeLessThan(1)
  })

  it("differs across keys", () => {
    expect(seededUnit("seed-abc:12")).not.toBe(seededUnit("seed-abc:13"))
  })
})

describe("solarFactor", () => {
  it("is zero at night and peaks around midday", () => {
    expect(solarFactor(0)).toBe(0)
    expect(solarFactor(6)).toBe(0)
    expect(solarFactor(18)).toBe(0)
    expect(solarFactor(23)).toBe(0)
    expect(solarFactor(12)).toBeCloseTo(1, 5)
    expect(solarFactor(12)).toBeGreaterThan(solarFactor(9))
  })
})

describe("buildSeedTelemetryRow", () => {
  const base = {
    id: "row-1",
    deviceId: "seed-abc123",
    facilityId: "fac-1",
    systemSizeKw: 5,
  }

  it("labels rows as seed data and never emits alerts", () => {
    const row = buildSeedTelemetryRow({ ...base, timestamp: new Date("2026-07-29T12:00:00") })
    expect(row.firmwareVersion).toBe("seed-v1")
    expect(row.location).toBe("seed")
    expect(row.deviceStatus).toBe("normal")
    expect(row.alertCode).toBeNull()
  })

  it("produces solar generation at midday and none at night", () => {
    const noon = buildSeedTelemetryRow({ ...base, timestamp: new Date("2026-07-29T12:00:00") })
    const night = buildSeedTelemetryRow({ ...base, timestamp: new Date("2026-07-29T02:00:00") })
    expect(Number(noon.solarGeneration)).toBeGreaterThan(0)
    expect(Number(night.solarGeneration)).toBe(0)
  })

  it("is deterministic for a given device+hour and keeps values in plausible ranges", () => {
    const t = new Date("2026-07-29T15:00:00")
    const r1 = buildSeedTelemetryRow({ ...base, timestamp: t })
    const r2 = buildSeedTelemetryRow({ ...base, timestamp: new Date("2026-07-30T15:00:00") }) // same hour
    expect(r1.voltage).toBe(r2.voltage)
    expect(r1.power).toBe(r2.power)

    const batt = Number(r1.batteryLevel)
    expect(batt).toBeGreaterThanOrEqual(35)
    expect(batt).toBeLessThanOrEqual(98)
    expect(Number(r1.efficiency)).toBeGreaterThanOrEqual(80)
    expect(Number(r1.efficiency)).toBeLessThanOrEqual(95)
    expect(Number(r1.voltage)).toBeGreaterThan(220)
  })
})
