/**
 * Real "what-if" impact estimates for the Assistant simulator. Given the
 * facility's actual PowerInputs (assessed load + sized solar + battery +
 * Climate Outlook sun), each scenario adjusts the relevant field and recomputes
 * battery autonomy, monthly grid cost and a resilience delta. Transparent
 * engineering estimates (documented constants), not a calibrated simulator; the
 * streamed AI explanation is grounded strictly in these figures.
 */
import { SOLAR_PR, BATTERY_DOD, type PowerInputs } from "@/lib/dashboard/power-model"

/** Grid tariff (TZS/kWh) - matches the meter currentRate used elsewhere. */
export const TARIFF_TZS_PER_KWH = 357
/** Average continuous draw of a vaccine fridge (kW). */
const FRIDGE_KW = 0.08
/** Average continuous draw of an oxygen concentrator (kW). */
const OXYGEN_KW = 0.3
/** Assumed battery state-of-charge for the autonomy comparison. */
const SOC = 0.9

export type WhatIfScenarioId =
  | "add-fridge"
  | "add-oxygen"
  | "add-battery"
  | "add-solar"
  | "led-retrofit"
  | "heatwave"
  | "cloudy-week"
  | "tariff-rise"
  | "custom"

export const WHATIF_SCENARIOS: { id: WhatIfScenarioId; label: string }[] = [
  { id: "add-fridge", label: "Add a second vaccine fridge" },
  { id: "add-oxygen", label: "Add an oxygen concentrator" },
  { id: "add-battery", label: "Add more battery storage" },
  { id: "add-solar", label: "Add more solar capacity" },
  { id: "led-retrofit", label: "Switch all lights to LED" },
  { id: "heatwave", label: "A heatwave hits" },
  { id: "cloudy-week", label: "A cloudy week / late rains" },
  { id: "tariff-rise", label: "Grid tariff rises 20%" },
  { id: "custom", label: "Describe your own change..." },
]

export type WhatIfVerdict = "good" | "caution" | "tradeoff"

export type WhatIfComparisonPoint = { metric: string; before: number; after: number; unit: string }

export type WhatIfComputation = {
  autonomyBeforeH: number
  autonomyAfterH: number
  deltaServiceHours: number
  deltaMonthlyCostTzs: number
  deltaResiliencePoints: number
  /** Before/after pairs for the comparison chart. */
  comparison: WhatIfComparisonPoint[]
  /** Overall verdict from the deltas. */
  verdict: WhatIfVerdict
  /** Compact before/after figures for the AI context. */
  contextLines: string
}

const r1 = (n: number) => Math.round(n * 10) / 10

function autonomyHours(batteryKwh: number, criticalKw: number): number {
  if (criticalKw <= 0) return 0
  return (batteryKwh * BATTERY_DOD * SOC) / criticalKw
}

function dailySolarKwh(capKw: number, psh: number): number {
  return capKw * psh * SOLAR_PR
}

function monthlyGridCost(dailyLoadKwh: number, dailySolar: number, tariff: number): number {
  const unmet = Math.max(0, dailyLoadKwh - dailySolar)
  return unmet * 30 * tariff
}

/** Compute the real impact of a preset scenario. Returns null for "custom" (AI-only). */
export function computeWhatIf(id: WhatIfScenarioId, inputs: PowerInputs): WhatIfComputation | null {
  if (id === "custom") return null

  const before = { ...inputs }
  const after = { ...inputs }
  let resilience = 0
  let tariffMult = 1

  switch (id) {
    case "add-fridge":
      after.criticalLoadKw += FRIDGE_KW
      after.avgLoadKw += FRIDGE_KW
      resilience = -3
      break
    case "add-oxygen":
      after.criticalLoadKw += OXYGEN_KW
      after.avgLoadKw += OXYGEN_KW
      resilience = -6
      break
    case "add-battery":
      after.batteryCapacityKwh = before.batteryCapacityKwh * 1.5
      resilience = 11
      break
    case "add-solar":
      after.solarCapacityKw = before.solarCapacityKw * 1.5
      resilience = 7
      break
    case "led-retrofit":
      after.avgLoadKw = before.avgLoadKw * 0.88
      after.criticalLoadKw = before.criticalLoadKw * 0.95
      resilience = 4
      break
    case "heatwave":
      after.criticalLoadKw = before.criticalLoadKw * 1.15
      after.avgLoadKw = before.avgLoadKw * 1.1
      resilience = -4
      break
    case "cloudy-week":
      after.peakSunHours = before.peakSunHours * 0.6
      resilience = -4
      break
    case "tariff-rise":
      tariffMult = 1.2
      resilience = -2
      break
  }

  const autonomyBeforeH = autonomyHours(before.batteryCapacityKwh, before.criticalLoadKw)
  const autonomyAfterH = autonomyHours(after.batteryCapacityKwh, after.criticalLoadKw)
  const dailyLoadBefore = before.avgLoadKw * 24
  const dailyLoadAfter = after.avgLoadKw * 24
  const solarBefore = dailySolarKwh(before.solarCapacityKw, before.peakSunHours)
  const solarAfter = dailySolarKwh(after.solarCapacityKw, after.peakSunHours)
  const costBefore = monthlyGridCost(dailyLoadBefore, solarBefore, TARIFF_TZS_PER_KWH)
  const costAfter = monthlyGridCost(dailyLoadAfter, solarAfter, TARIFF_TZS_PER_KWH * tariffMult)

  const deltaServiceHours = r1(autonomyAfterH - autonomyBeforeH)
  const deltaMonthlyCostTzs = Math.round((costAfter - costBefore) / 1000) * 1000

  const comparison: WhatIfComparisonPoint[] = [
    { metric: "Autonomy", before: r1(autonomyBeforeH), after: r1(autonomyAfterH), unit: "h" },
    { metric: "Daily load", before: r1(dailyLoadBefore), after: r1(dailyLoadAfter), unit: "kWh" },
    { metric: "Solar/day", before: r1(solarBefore), after: r1(solarAfter), unit: "kWh" },
  ]

  const verdict: WhatIfVerdict =
    deltaServiceHours >= 0 && deltaMonthlyCostTzs <= 0 && resilience >= 0
      ? "good"
      : deltaServiceHours < 0 || resilience <= -3
        ? "caution"
        : "tradeoff"

  const contextLines =
    `Daily load ${dailyLoadBefore.toFixed(1)} -> ${dailyLoadAfter.toFixed(1)} kWh. ` +
    `Solar generation ${solarBefore.toFixed(1)} -> ${solarAfter.toFixed(1)} kWh/day. ` +
    `Critical-load battery autonomy ${autonomyBeforeH.toFixed(1)} -> ${autonomyAfterH.toFixed(1)} hours. ` +
    `Estimated monthly grid-cost change ${deltaMonthlyCostTzs >= 0 ? "+" : ""}${deltaMonthlyCostTzs} TZS. ` +
    `Sized solar ${before.solarCapacityKw} kW, usable battery ${before.batteryCapacityKwh} kWh, peak sun hours ${before.peakSunHours}.`

  return {
    autonomyBeforeH: r1(autonomyBeforeH),
    autonomyAfterH: r1(autonomyAfterH),
    deltaServiceHours,
    deltaMonthlyCostTzs,
    deltaResiliencePoints: resilience,
    comparison,
    verdict,
    contextLines,
  }
}
