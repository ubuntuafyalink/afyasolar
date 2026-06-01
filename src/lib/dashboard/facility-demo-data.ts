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
