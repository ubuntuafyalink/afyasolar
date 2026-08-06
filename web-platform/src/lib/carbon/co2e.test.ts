import { describe, it, expect } from "vitest"
import {
  computeCarbonResult,
  round2,
  DEFAULT_GRID_EMISSION_FACTOR,
  DEFAULT_CREDIT_VALUE_USD,
} from "./co2e"

describe("round2", () => {
  it("rounds to two decimals", () => {
    expect(round2(1.005)).toBeCloseTo(1.0, 5) // JS float: 1.005 -> 1.00
    expect(round2(2.346)).toBe(2.35)
    expect(round2(10)).toBe(10)
  })
})

describe("computeCarbonResult", () => {
  it("computes energy, CO2, credits and value with defaults", () => {
    // 10 kWh/day * 30 days * ratio 1 = 300 kWh
    const r = computeCarbonResult({ dailySolarKwh: 10, daysInclusive: 30 })
    expect(r.energyGenerated).toBe(300)
    expect(r.co2Saved).toBe(300 * DEFAULT_GRID_EMISSION_FACTOR) // 150 kg
    expect(r.creditsEarned).toBe(round2((300 * 0.5) / 1000)) // 0.15 tons
    expect(r.creditValue).toBe(DEFAULT_CREDIT_VALUE_USD)
    expect(r.totalValue).toBe(round2(0.15 * 25)) // 3.75 USD
  })

  it("applies a custom grid emission factor and credit value", () => {
    const r = computeCarbonResult({
      dailySolarKwh: 20,
      daysInclusive: 10,
      gridEmissionFactor: 0.7,
      creditValueUsd: 30,
    })
    // 20 * 10 = 200 kWh; co2 = 140 kg; credits = 0.14 t; value = 4.2 USD
    expect(r.energyGenerated).toBe(200)
    expect(r.co2Saved).toBe(140)
    expect(r.creditsEarned).toBe(0.14)
    expect(r.totalValue).toBe(4.2)
  })

  it("allocates by device ratio", () => {
    const full = computeCarbonResult({ dailySolarKwh: 10, daysInclusive: 30 })
    const half = computeCarbonResult({ dailySolarKwh: 10, daysInclusive: 30, deviceRatio: 0.5 })
    expect(half.energyGenerated).toBe(round2(full.energyGenerated * 0.5))
    expect(half.co2Saved).toBe(round2(full.co2Saved * 0.5))
  })

  it("clamps daysInclusive to a minimum of 1 and negative ratio to 0", () => {
    const oneDay = computeCarbonResult({ dailySolarKwh: 10, daysInclusive: 0 })
    expect(oneDay.energyGenerated).toBe(10) // max(1, 0) => 1 day

    const zero = computeCarbonResult({ dailySolarKwh: 10, daysInclusive: 5, deviceRatio: -2 })
    expect(zero.energyGenerated).toBe(0) // max(0, -2) => 0
    expect(zero.creditsEarned).toBe(0)
  })
})
