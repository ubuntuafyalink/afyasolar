import { describe, it, expect } from "vitest"
import {
  evaluateClimateAlerts,
  ALERT_THRESHOLD,
  CRITICAL_THRESHOLD,
  type HazardSlice,
} from "./climate-alert-rules"

const NONE: HazardSlice = { flood: 0, drought: 0, heat: 0, storm: 0 }

describe("evaluateClimateAlerts thresholds", () => {
  it("raises nothing below the alert threshold", () => {
    const out = evaluateClimateAlerts({ ...NONE, heat: ALERT_THRESHOLD - 1 }, "Clinic A")
    expect(out).toHaveLength(0)
  })

  it("raises a high alert at exactly the alert threshold", () => {
    const out = evaluateClimateAlerts({ ...NONE, heat: ALERT_THRESHOLD }, "Clinic A")
    expect(out).toHaveLength(1)
    expect(out[0].code).toBe("CLIMATE_HEAT_COLDCHAIN")
    expect(out[0].severity).toBe("high")
    expect(out[0].hazard).toBe("heat")
    expect(out[0].threshold).toBe(ALERT_THRESHOLD)
  })

  it("escalates to critical at/above the critical threshold", () => {
    const atHigh = evaluateClimateAlerts({ ...NONE, flood: CRITICAL_THRESHOLD - 1 }, "Clinic A")
    expect(atHigh[0].severity).toBe("high")
    const atCritical = evaluateClimateAlerts({ ...NONE, flood: CRITICAL_THRESHOLD }, "Clinic A")
    expect(atCritical[0].severity).toBe("critical")
  })
})

describe("evaluateClimateAlerts rules & ordering", () => {
  it("produces one candidate per hazard over threshold, highest score first", () => {
    const out = evaluateClimateAlerts(
      { flood: 90, drought: 70, heat: 85, storm: 67 },
      "Clinic B",
    )
    expect(out.map((a) => a.hazard)).toEqual(["flood", "heat", "drought", "storm"])
    expect(out.map((a) => a.score)).toEqual([90, 85, 70, 67])
  })

  it("uses a distinct stable code per hazard (for dedupe) and embeds the score/name", () => {
    const out = evaluateClimateAlerts({ ...NONE, drought: 88 }, "Mwanza HC")
    expect(out[0].code).toBe("CLIMATE_DROUGHT_WATER")
    expect(out[0].alertType).toBe("drought")
    expect(out[0].message).toContain("Mwanza HC")
    expect(out[0].message).toContain("88")
    // codes are unique across all rules
    const all = evaluateClimateAlerts({ flood: 70, drought: 70, heat: 70, storm: 70 }, "X")
    const codes = all.map((a) => a.code)
    expect(new Set(codes).size).toBe(codes.length)
  })
})
