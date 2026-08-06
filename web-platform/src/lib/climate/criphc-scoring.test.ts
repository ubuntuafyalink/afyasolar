import { describe, it, expect } from "vitest"
import {
  CRIPHC_CORE_WEIGHTS,
  combineRcs,
  rcsTierLabel,
  rcsTierInt,
  hesFromComposite,
  clamp,
  type ModuleCode,
} from "./criphc-scoring"

const FULL = (v: number): Record<ModuleCode, number> => ({
  HES: v,
  CSF: v,
  ECPQ: v,
  EDC: v,
  RRC: v,
})

describe("CRIPHC_CORE_WEIGHTS", () => {
  it("sums to 0.70 across the five core dimensions", () => {
    const sum = Object.values(CRIPHC_CORE_WEIGHTS).reduce((a, b) => a + b, 0)
    expect(sum).toBeCloseTo(0.7, 10)
  })
})

describe("clamp", () => {
  it("bounds values", () => {
    expect(clamp(-5, 0, 100)).toBe(0)
    expect(clamp(150, 0, 100)).toBe(100)
    expect(clamp(42, 0, 100)).toBe(42)
  })
})

describe("combineRcs", () => {
  it("renormalizes weights so a uniform capacity maps to itself", () => {
    // Every dimension = 80 must yield RCS 80 regardless of the 0.70 weight sum.
    expect(combineRcs(FULL(80))).toBe(80)
    expect(combineRcs(FULL(0))).toBe(0)
    expect(combineRcs(FULL(100))).toBe(100)
  })

  it("weights dimensions by their renormalized share", () => {
    // Only CSF (0.20/0.70) is 100, others 0 => 100 * (0.20/0.70) ≈ 28.57 -> 29
    const rcs = combineRcs({ HES: 0, CSF: 100, ECPQ: 0, EDC: 0, RRC: 0 })
    expect(rcs).toBe(Math.round((0.2 / 0.7) * 100))
  })

  it("treats missing dimensions as 0 and clamps out-of-range", () => {
    expect(combineRcs({ ...FULL(0), CSF: 200 } as Record<ModuleCode, number>)).toBe(
      Math.round((0.2 / 0.7) * 100),
    )
  })
})

describe("rcsTierLabel / rcsTierInt boundaries", () => {
  it("labels at the 75/55/35 thresholds", () => {
    expect(rcsTierLabel(75)).toBe("Resilient")
    expect(rcsTierLabel(74)).toBe("Developing")
    expect(rcsTierLabel(55)).toBe("Developing")
    expect(rcsTierLabel(54)).toBe("At risk")
    expect(rcsTierLabel(35)).toBe("At risk")
    expect(rcsTierLabel(34)).toBe("Critical")
    expect(rcsTierLabel(0)).toBe("Critical")
  })

  it("maps the int tier consistently (3=Resilient..0=Critical)", () => {
    expect(rcsTierInt(90)).toBe(3)
    expect(rcsTierInt(60)).toBe(2)
    expect(rcsTierInt(40)).toBe(1)
    expect(rcsTierInt(10)).toBe(0)
  })
})

describe("hesFromComposite", () => {
  it("inverts a hazard composite into a capacity (100 - composite)", () => {
    expect(hesFromComposite(0)).toBe(100)
    expect(hesFromComposite(30)).toBe(70)
    expect(hesFromComposite(100)).toBe(0)
    expect(hesFromComposite(120)).toBe(0) // clamped
  })
})
