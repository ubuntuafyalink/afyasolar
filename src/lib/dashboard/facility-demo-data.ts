/**
 * Deterministic demo/sample data for the additive facility "v2" sections
 * (CEO spec Parts 7–15). Mirrors the pattern in
 * `src/lib/efficiency-climate/simulation.ts`: every value is derived from the
 * facilityId via a stable hash so demos are reproducible and never random.
 *
 * TODO: wire real sources. Each `[data]` feature that consumes this module must
 * surface a <DemoDataBadge /> so the demo origin is visible to the user. No
 * function here performs any network, DB, payment, SMS, or email side-effect.
 */
import { hashSeed } from "@/lib/efficiency-climate/simulation"

export const DEMO_DATA_NOTE = "Demo data — sample values, not yet wired to a live source."

/** Stable sin-based pseudo-random in [0, 1) from a seed + salt. */
function rand(seed: number, salt: number): number {
  const x = Math.sin(seed * 12.9898 + salt * 78.233) * 43758.5453
  return x - Math.floor(x)
}

/** Seed helper namespaced per feature so different features don't correlate. */
function seedFor(facilityId: string | undefined, feature: string): number {
  return hashSeed(`${facilityId ?? "demo-facility"}:${feature}`)
}

// ---------------------------------------------------------------------------
// Group A — Today home
// ---------------------------------------------------------------------------

export type FridgeStatus = {
  status: "safe" | "danger"
  tempC: number
  lastCheckedIso: string
}

/** Current cold-chain status for the fridge hero card (spec 8.2). */
export function getFridgeStatus(facilityId?: string): FridgeStatus {
  const seed = seedFor(facilityId, "fridge-status")
  const danger = rand(seed, 7) < 0.18
  const tempC = danger
    ? Math.round((8.4 + rand(seed, 3) * 4) * 10) / 10
    : Math.round((2.4 + rand(seed, 5) * 5) * 10) / 10
  const minsAgo = Math.floor(rand(seed, 11) * 48) + 3
  const lastChecked = new Date(Date.now() - minsAgo * 60_000)
  return {
    status: danger ? "danger" : "safe",
    tempC,
    lastCheckedIso: lastChecked.toISOString(),
  }
}

export type PowerToday = {
  /** Expected hours of usable power today, from the 7-day forecast + solar profile. */
  expectedHours: number
  batterySocPct: number
  expectedSolar: "sunny" | "partly" | "cloudy"
}

/** Power-forecast figures for today (spec 8.2 "card two"). */
export function getPowerToday(facilityId?: string): PowerToday {
  const seed = seedFor(facilityId, "power-today")
  const skyRoll = rand(seed, 2)
  const expectedSolar = skyRoll > 0.66 ? "sunny" : skyRoll > 0.33 ? "partly" : "cloudy"
  const expectedHours = Math.round((skyRoll * 6 + 14) * 10) / 10 // ~14–20h
  const batterySocPct = Math.round(45 + rand(seed, 9) * 50)
  return { expectedHours, batterySocPct, expectedSolar }
}

export type FacilityTaskKind =
  | "technician-visit"
  | "meter-reading"
  | "assessment-due"
  | "alert-response"

export type FacilityTask = {
  id: string
  kind: FacilityTaskKind
  title: string
  detail: string
  dueLabel: string
  /** Section the 1-tap action should navigate to, if any. */
  target?: string
}

/** Pending tasks for the Today page. Most days this is empty (spec 8.2 "card three"). */
export function getPendingTasks(facilityId?: string): FacilityTask[] {
  const seed = seedFor(facilityId, "tasks")
  const all: FacilityTask[] = [
    {
      id: "task-meter-reading",
      kind: "meter-reading",
      title: "Submit this month's meter reading",
      detail: "Your grid meter reading is due so we can reconcile the bill.",
      dueLabel: "Due today",
      target: "reports",
    },
    {
      id: "task-technician-visit",
      kind: "technician-visit",
      title: "Technician visit scheduled",
      detail: "Preventive maintenance on the inverter and battery bank.",
      dueLabel: "Tomorrow, 10:00",
    },
    {
      id: "task-assessment-due",
      kind: "assessment-due",
      title: "Quarterly resilience assessment due",
      detail: "Complete your climate-resilience review for this quarter.",
      dueLabel: "This week",
      target: "climate-resilience",
    },
  ]
  const count = Math.floor(rand(seed, 4) * (all.length + 1)) // 0..3
  return all.slice(0, count)
}

// ---------------------------------------------------------------------------
// Group B — Cold chain "Fridge"
// ---------------------------------------------------------------------------

export type FridgeTempPoint = { time: string; tempC: number }

/** 24 hourly interior-temperature readings, mostly within the 2–8°C safe band. */
export function getFridge24hTemps(facilityId?: string): FridgeTempPoint[] {
  const seed = seedFor(facilityId, "fridge-24h")
  const danger = getFridgeStatus(facilityId).status === "danger"
  const out: FridgeTempPoint[] = []
  for (let h = 24; h >= 0; h--) {
    const t = new Date(Date.now() - h * 3_600_000)
    const base = 4.8 + Math.sin((h / 24) * Math.PI * 2) * 1.1
    const noise = (rand(seed, h * 13) - 0.5) * 1.4
    const excursion =
      rand(seed, h * 7) < (danger ? 0.12 : 0.05) ? 3.5 + rand(seed, h) * 3 : 0
    const temp = Math.round((base + noise + excursion) * 10) / 10
    out.push({
      time: `${String(t.getHours()).padStart(2, "0")}:00`,
      tempC: Math.max(0.5, temp),
    })
  }
  return out
}

export type FridgeEventType = "door" | "excursion" | "manual" | "maintenance"

export type FridgeEvent = {
  id: string
  type: FridgeEventType
  title: string
  detail: string
  atIso: string
}

/** Recent cold-chain events: door openings, excursions, manual readings, maintenance. */
export function getFridgeEvents(facilityId?: string): FridgeEvent[] {
  const seed = seedFor(facilityId, "fridge-events")
  const templates: { type: FridgeEventType; title: string; detail: string }[] = [
    { type: "door", title: "Door opened", detail: "Fridge door open for 45 seconds." },
    {
      type: "manual",
      title: "Manual reading recorded",
      detail: "Champion logged 4.6°C from the logger display.",
    },
    {
      type: "excursion",
      title: "Temperature excursion",
      detail: "Interior reached 9.2°C for 12 minutes.",
    },
    {
      type: "maintenance",
      title: "Maintenance visit",
      detail: "Technician checked the compressor and door seal.",
    },
    { type: "door", title: "Door opened", detail: "Fridge door open for 1 min 10 sec." },
    {
      type: "manual",
      title: "Manual reading recorded",
      detail: "Champion logged 3.9°C from the logger display.",
    },
  ]
  return templates.map((tpl, i) => {
    const minsAgo = Math.floor(rand(seed, i * 9 + 1) * 60) + i * 95 + 10
    return { id: `fridge-evt-${i}`, ...tpl, atIso: new Date(Date.now() - minsAgo * 60_000).toISOString() }
  })
}

export type ColdChainPrediction = {
  atRisk: boolean
  etaDaysMin: number
  etaDaysMax: number
  confidencePct: number
  signal: string
}

/** Predictive cold-chain failure outlook (spec 11.3 "Predict": 2–4 weeks ahead). */
export function getColdChainPrediction(facilityId?: string): ColdChainPrediction {
  const seed = seedFor(facilityId, "coldchain-prediction")
  const atRisk = rand(seed, 3) < 0.5
  return {
    atRisk,
    etaDaysMin: 14,
    etaDaysMax: 28,
    confidencePct: Math.round(62 + rand(seed, 8) * 28),
    signal: atRisk
      ? "Compressor run-time is trending up and overnight recovery is slowing — patterns that precede gas-absorption fridge failure."
      : "Temperature recovery and compressor cycles are within the normal band for this unit.",
  }
}
