/**
 * Deterministic demo/sample data for the additive facility "v2" sections
 * (CEO spec Parts 715). Mirrors the pattern in
 * `src/lib/efficiency-climate/simulation.ts`: every value is derived from the
 * facilityId via a stable hash so demos are reproducible and never random.
 *
 * TODO: wire real sources. Each `[data]` feature that consumes this module must
 * surface a <DemoDataBadge /> so the demo origin is visible to the user. No
 * function here performs any network, DB, payment, SMS, or email side-effect.
 */
import { hashSeed } from "@/lib/efficiency-climate/simulation"

export const DEMO_DATA_NOTE = "Demo data sample values, not yet wired to a live source."

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
// Group A Today home
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
  const expectedHours = Math.round((skyRoll * 6 + 14) * 10) / 10 // ~1420h
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
// Group B Cold chain "Fridge"
// ---------------------------------------------------------------------------

export type FridgeTempPoint = { time: string; tempC: number }

/** 24 hourly interior-temperature readings, mostly within the 28°C safe band. */
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

/** Predictive cold-chain failure outlook (spec 11.3 "Predict": 24 weeks ahead). */
export function getColdChainPrediction(facilityId?: string): ColdChainPrediction {
  const seed = seedFor(facilityId, "coldchain-prediction")
  const atRisk = rand(seed, 3) < 0.5
  return {
    atRisk,
    etaDaysMin: 14,
    etaDaysMax: 28,
    confidencePct: Math.round(62 + rand(seed, 8) * 28),
    signal: atRisk
      ? "Compressor run-time is trending up and overnight recovery is slowing patterns that precede gas-absorption fridge failure."
      : "Temperature recovery and compressor cycles are within the normal band for this unit.",
  }
}

// ---------------------------------------------------------------------------
// Group C Power "Umeme"
// ---------------------------------------------------------------------------

export type PowerSource = "solar" | "grid" | "battery"

export type PowerSnapshot = {
  activeSource: PowerSource
  solarKw: number
  gridKw: number
  /** Net battery flow: positive = charging, negative = discharging. */
  batteryKw: number
  loadKw: number
  batterySocPct: number
}

/** Current instantaneous power picture for the source indicator + flow diagram. */
export function getPowerSnapshot(facilityId?: string, batterySocOverride?: number): PowerSnapshot {
  const seed = seedFor(facilityId, "power-snapshot")
  const hour = new Date().getHours()
  const daytime = hour >= 7 && hour <= 18
  const solarKw = daytime ? Math.round((1.5 + rand(seed, hour) * 4) * 10) / 10 : 0
  const loadKw = Math.round((1.2 + rand(seed, 5) * 2.5) * 10) / 10

  let gridKw = 0
  let batteryKw = 0
  let activeSource: PowerSource
  if (solarKw >= loadKw && daytime) {
    activeSource = "solar"
    batteryKw = Math.round((solarKw - loadKw) * 10) / 10 // surplus charges battery
  } else if (daytime) {
    activeSource = "solar"
    batteryKw = -Math.round((loadKw - solarKw) * 10) / 10 // battery tops up
  } else if (rand(seed, 3) < 0.4) {
    activeSource = "grid"
    gridKw = loadKw
  } else {
    activeSource = "battery"
    batteryKw = -loadKw
  }

  const batterySocPct =
    typeof batterySocOverride === "number"
      ? Math.round(batterySocOverride)
      : getPowerToday(facilityId).batterySocPct
  return { activeSource, solarKw, gridKw, batteryKw, loadKw, batterySocPct }
}

/**
 * Tick-perturbed power snapshot for the simulated live telemetry feed. Adds a
 * small, deterministic-per-(facility,tick) jitter on top of getPowerSnapshot so
 * the readout "ticks" like a real meter without any network. No new randomness
 * semantics same seeded rand(), salted by the tick.
 */
export function getLivePowerSnapshot(
  facilityId: string | undefined,
  tick: number,
  batterySocOverride?: number,
): PowerSnapshot {
  const base = getPowerSnapshot(facilityId, batterySocOverride)
  const seed = seedFor(facilityId, "live-power")
  const j = (salt: number, amp: number) => (rand(seed, tick * 7 + salt) - 0.5) * 2 * amp
  const kw = (v: number) => Math.max(0, Math.round(v * 100) / 100)
  return {
    ...base,
    solarKw: base.solarKw > 0 ? kw(base.solarKw + j(1, 0.3)) : 0,
    gridKw: base.gridKw > 0 ? kw(base.gridKw + j(2, 0.2)) : 0,
    batteryKw: Math.round((base.batteryKw + j(3, 0.2)) * 100) / 100,
    loadKw: kw(base.loadKw + j(4, 0.25)),
    batterySocPct: Math.max(0, Math.min(100, Math.round(base.batterySocPct + j(5, 1.2)))),
  }
}

/** Tick-perturbed current fridge interior temperature for the live readout. */
export function getLiveFridgeTempC(facilityId: string | undefined, tick: number): number {
  const base = getFridgeStatus(facilityId).tempC
  const seed = seedFor(facilityId, "live-fridge")
  const j = (rand(seed, tick * 5 + 1) - 0.5) * 0.6
  return Math.round((base + j) * 10) / 10
}

export type PowerBySourcePoint = { time: string; solar: number; grid: number; battery: number }

/** 24 hourly points of delivered power split by source, for the stacked-area chart. */
export function get24hPowerBySource(facilityId?: string): PowerBySourcePoint[] {
  const seed = seedFor(facilityId, "power-24h")
  const out: PowerBySourcePoint[] = []
  for (let h = 24; h >= 0; h--) {
    const t = new Date(Date.now() - h * 3_600_000)
    const hr = t.getHours()
    const daytime = hr >= 7 && hr <= 18
    const solar = daytime
      ? Math.max(0, Math.round(Math.sin(((hr - 6) / 12) * Math.PI) * (3 + rand(seed, hr) * 2) * 10) / 10)
      : 0
    const load = 1.2 + rand(seed, hr * 3) * 2
    const grid = !daytime && rand(seed, hr * 5) < 0.35 ? Math.round(load * 10) / 10 : 0
    const battery = Math.max(0, Math.round((load - solar - grid) * 10) / 10)
    out.push({ time: `${String(hr).padStart(2, "0")}:00`, solar, grid, battery })
  }
  return out
}

export type PowerForecastPoint = {
  time: string
  source: PowerSource
  batterySocPct: number
  expectedKw: number
}

/** Next-12-hours forecast of expected source and battery State of Charge. */
export function getPower12hForecast(facilityId?: string): PowerForecastPoint[] {
  const seed = seedFor(facilityId, "power-12h")
  let soc = getPowerToday(facilityId).batterySocPct
  const out: PowerForecastPoint[] = []
  for (let i = 1; i <= 12; i++) {
    const t = new Date(Date.now() + i * 3_600_000)
    const hr = t.getHours()
    const daytime = hr >= 7 && hr <= 18
    const solar = daytime ? 2 + rand(seed, hr) * 3 : 0
    const load = 1.4 + rand(seed, i * 7) * 1.6
    let source: PowerSource
    if (solar >= load) {
      source = "solar"
      soc = Math.min(100, soc + 3)
    } else if (daytime) {
      source = "solar"
      soc = Math.max(5, soc - 2)
    } else if (rand(seed, i * 3) < 0.35) {
      source = "grid"
    } else {
      source = "battery"
      soc = Math.max(5, soc - 5)
    }
    out.push({
      time: `${String(hr).padStart(2, "0")}:00`,
      source,
      batterySocPct: Math.round(soc),
      expectedKw: Math.round((daytime ? solar : load) * 10) / 10,
    })
  }
  return out
}

export type ServiceHoursEstimate = { hours: number; untilLabel: string; criticalLoadKw: number }

/** "…can deliver critical services until 06:47 tomorrow" estimate (spec 8.2). */
export function getServiceHoursRemaining(
  facilityId?: string,
  batterySocPct?: number,
): ServiceHoursEstimate {
  const seed = seedFor(facilityId, "service-hours")
  const soc = typeof batterySocPct === "number" ? batterySocPct : getPowerToday(facilityId).batterySocPct
  const batteryKwh = 5 + (seed % 5) // demo usable capacity
  const criticalLoadKw = Math.round((0.6 + rand(seed, 2) * 0.8) * 100) / 100
  const usableKwh = batteryKwh * (soc / 100)
  const hours = Math.max(0, usableKwh / criticalLoadKw)
  const until = new Date(Date.now() + hours * 3_600_000)
  const hh = String(until.getHours()).padStart(2, "0")
  const mm = String(until.getMinutes()).padStart(2, "0")
  const dayWord = until.getDate() === new Date().getDate() ? "today" : "tomorrow"
  return { hours: Math.round(hours * 10) / 10, untilLabel: `${hh}:${mm} ${dayWord}`, criticalLoadKw }
}

export type SolarDayForecast = { day: string; expectedKwh: number; sky: "sunny" | "partly" | "cloudy" }

/** 7-day solar generation forecast (spec C16 / 11.3 "Forecast"). */
export function get7daySolarForecast(facilityId?: string): SolarDayForecast[] {
  const seed = seedFor(facilityId, "solar-7d")
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
  const out: SolarDayForecast[] = []
  for (let i = 0; i < 7; i++) {
    const t = new Date(Date.now() + i * 86_400_000)
    const r = rand(seed, i * 11)
    const sky = r > 0.66 ? "sunny" : r > 0.33 ? "partly" : "cloudy"
    const factor = sky === "sunny" ? 1 : sky === "partly" ? 0.75 : 0.5
    const expectedKwh = Math.round((18 + rand(seed, i) * 10) * factor)
    out.push({ day: days[t.getDay()], expectedKwh, sky })
  }
  return out
}

// ---------------------------------------------------------------------------
// Group E Energy efficiency & audit (spec Part 7)
// ---------------------------------------------------------------------------

export type AuditWasteItem = { label: string; monthlyTsh: number }

export type AuditOutputs = {
  // Output 1 waste eliminated
  totalMonthlySpendTsh: number
  spendBySource: { source: string; monthlyTsh: number }[]
  wasteItems: AuditWasteItem[]
  wasteTotalTsh: number
  // Output 2 monthly cash saved
  currentMonthlySpendTsh: number
  eaasFeeTsh: number
  monthlySavingTsh: number
  cumulative7yrSavingTsh: number
  // Output 3 cost per service-hour
  costPerServiceHourBeforeTsh: number
  costPerServiceHourAfterTsh: number
}

/** The three-output audit report figures (spec 7.2). */
export function getAuditOutputs(facilityId?: string): AuditOutputs {
  const seed = seedFor(facilityId, "audit-outputs")
  const grid = Math.round((400_000 + rand(seed, 1) * 500_000) / 1000) * 1000
  const diesel = Math.round((250_000 + rand(seed, 2) * 400_000) / 1000) * 1000
  const other = Math.round((40_000 + rand(seed, 3) * 60_000) / 1000) * 1000
  const totalMonthlySpendTsh = grid + diesel + other

  const wasteItems: AuditWasteItem[] = [
    { label: "Inefficient refrigerators", monthlyTsh: Math.round((60_000 + rand(seed, 4) * 90_000) / 1000) * 1000 },
    { label: "After-hours phantom loads", monthlyTsh: Math.round((25_000 + rand(seed, 5) * 45_000) / 1000) * 1000 },
    { label: "Generator over-runtime", monthlyTsh: Math.round((40_000 + rand(seed, 6) * 80_000) / 1000) * 1000 },
    { label: "Vaccine spoilage", monthlyTsh: Math.round((15_000 + rand(seed, 7) * 50_000) / 1000) * 1000 },
  ]
  const wasteTotalTsh = wasteItems.reduce((s, w) => s + w.monthlyTsh, 0)

  const eaasFeeTsh = Math.round((totalMonthlySpendTsh * (0.62 + rand(seed, 8) * 0.12)) / 1000) * 1000
  const monthlySavingTsh = totalMonthlySpendTsh - eaasFeeTsh
  const cumulative7yrSavingTsh = monthlySavingTsh * 84

  const criticalHours = 24
  const costPerServiceHourBeforeTsh = Math.round(totalMonthlySpendTsh / 30 / criticalHours / 100) * 100
  const costPerServiceHourAfterTsh = Math.round(eaasFeeTsh / 30 / criticalHours / 100) * 100

  return {
    totalMonthlySpendTsh,
    spendBySource: [
      { source: "Grid (TANESCO)", monthlyTsh: grid },
      { source: "Diesel", monthlyTsh: diesel },
      { source: "Other (kerosene, batteries)", monthlyTsh: other },
    ],
    wasteItems,
    wasteTotalTsh,
    currentMonthlySpendTsh: totalMonthlySpendTsh,
    eaasFeeTsh,
    monthlySavingTsh,
    cumulative7yrSavingTsh,
    costPerServiceHourBeforeTsh,
    costPerServiceHourAfterTsh,
  }
}

export type EcoPulseEpi = {
  epi: number
  band: "efficient" | "expected" | "inefficient" | "check-data"
  headline: string
  hypothesis: string
}

/** Eco-Pulse virtual Energy Performance Index (spec 9.6). */
export function getEcoPulseEpi(facilityId?: string): EcoPulseEpi {
  const seed = seedFor(facilityId, "eco-pulse")
  const epi = Math.round((0.7 + rand(seed, 1) * 0.85) * 100) / 100
  const band: EcoPulseEpi["band"] =
    epi < 0.8 ? "check-data" : epi <= 1.1 ? "expected" : epi <= 1.3 ? "inefficient" : "inefficient"
  const headline =
    band === "expected"
      ? "Energy use is in line with similar facilities."
      : band === "check-data"
        ? "Energy use looks unusually low readings may be under-reported."
        : "Energy use is higher than similar facilities."
  return {
    epi,
    band,
    headline,
    hypothesis:
      epi > 1.1
        ? `This facility consumes about ${Math.round((epi - 1) * 100)}% more overnight energy than its peer baseline; the most probable cause is cooling-insulation degradation on the vaccine refrigerator or an unaccounted after-hours load.`
        : "Overnight and daytime consumption track the expected curve for this tier and climate.",
  }
}

// ---------------------------------------------------------------------------
// Group F Climate resilience (CRiPHC v2.0, spec Part 10)
// ---------------------------------------------------------------------------

export type CrphcDimension = {
  code: string
  label: string
  weight: number
  /** 0100 dimension score. */
  score: number
  /** True for the two v2 dimensions added in CRiPHC v2.0 (Workforce, WASH). */
  isNew?: boolean
}

export type CrphcResult = {
  dimensions: CrphcDimension[]
  rcs: number
  tier: string
}

/** Demo scores for the five existing CRiPHC dimensions (the two new ones are user-scored). */
export function getCrphcBaseDimensions(facilityId?: string): CrphcDimension[] {
  const seed = seedFor(facilityId, "crphc-v2")
  const defs: [string, string, number][] = [
    ["HES", "Hazard Exposure", 0.15],
    ["CSF", "Critical Service Fragility", 0.2],
    ["ECPQ", "Energy Continuity & Power Quality", 0.15],
    ["EDC", "Efficiency & Demand Control", 0.1],
    ["RRC", "Readiness & Response", 0.1],
  ]
  // Per-facility resilience bias: a well-run facility tends to score higher
  // across all dimensions (and vice-versa). This correlated shift spreads
  // facilities realistically across the resilience tiers instead of clustering
  // them all in the middle, which matters for the portfolio view.
  const bias = (rand(seed, 101) - 0.5) * 70
  return defs.map(([code, label, weight], i) => {
    const raw = 30 + rand(seed, i * 7) * 55 + bias
    return {
      code,
      label,
      weight,
      score: Math.max(5, Math.min(98, Math.round(raw))),
    }
  })
}

/** The two new CRiPHC v2.0 dimensions (Workforce, WASH), at default weights. */
export const CRPHC_NEW_DIMENSIONS: { code: string; label: string; weight: number }[] = [
  { code: "W", label: "Workforce", weight: 0.15 },
  { code: "WW", label: "Water, Sanitation, Hygiene & Waste", weight: 0.15 },
]

/** Compose the 7-dimension RCS and tier from base scores + the user's new-dimension scores. */
export function computeCrphcResult(dimensions: CrphcDimension[]): CrphcResult {
  const rcs = Math.round(dimensions.reduce((s, d) => s + d.score * d.weight, 0))
  const tier =
    rcs >= 75 ? "Resilient" : rcs >= 55 ? "Developing" : rcs >= 35 ? "At risk" : "Critical"
  return { dimensions, rcs, tier }
}

export type HazardScore = {
  type: string
  score: number
  trend: "rising" | "stable" | "falling"
  note: string
}

/** Quantitative hazard exposure scores (spec 10.3, NASA POWER / ERA5 derived). */
export function getHazardScores(facilityId?: string): HazardScore[] {
  const seed = seedFor(facilityId, "hazard-scores")
  const types: [string, string][] = [
    ["Heat", "40-year maximum-temperature trend"],
    ["Flood", "Extreme-precipitation return period"],
    ["Wind / storm", "Wind-speed maxima"],
    ["Drought", "Consecutive-dry-day frequency"],
  ]
  return types.map(([type, note], i) => {
    const score = Math.round(25 + rand(seed, i * 5) * 65)
    const r = rand(seed, i * 9)
    const trend: HazardScore["trend"] = r > 0.6 ? "rising" : r > 0.3 ? "stable" : "falling"
    return { type, score, trend, note }
  })
}

export type CviByHazard = { flood: number; drought: number; heat: number; storm: number }
export type ResiHealthCvi = { composite: number; byHazard: CviByHazard }

/** Resi-Health Grid Climate Vulnerability Index, 0100, by hazard and year (spec 10.5). */
export function getResiHealthCvi(facilityId?: string, year: 2030 | 2050 = 2030): ResiHealthCvi {
  const seed = seedFor(facilityId, "cvi")
  const bump = year === 2050 ? 12 : 0
  const byHazard: CviByHazard = {
    flood: Math.min(100, Math.round(30 + rand(seed, 1) * 45 + bump)),
    drought: Math.min(100, Math.round(25 + rand(seed, 2) * 45 + bump)),
    heat: Math.min(100, Math.round(35 + rand(seed, 3) * 45 + bump)),
    storm: Math.min(100, Math.round(20 + rand(seed, 4) * 45 + bump)),
  }
  const composite = Math.round(
    (byHazard.flood + byHazard.drought + byHazard.heat + byHazard.storm) / 4,
  )
  return { composite, byHazard }
}

export type HazardTrendPoint = {
  year: number
  heat: number
  flood: number
  storm: number
  drought: number
}

/**
 * Multi-decade hazard trend (as if derived from NASA POWER / ERA5 reanalysis).
 * Each hazard rises from a historical baseline toward today's getHazardScores
 * value, with mild seeded noise. Simulated for the Climate Outlook chart.
 */
export function getHazardTrend(facilityId?: string): HazardTrendPoint[] {
  const seed = seedFor(facilityId, "hazard-trend")
  const current = getHazardScores(facilityId)
  const end = {
    heat: current[0]?.score ?? 60,
    flood: current[1]?.score ?? 50,
    storm: current[2]?.score ?? 45,
    drought: current[3]?.score ?? 40,
  }
  const startYear = 1985
  const endYear = 2025
  const step = 5
  const points: HazardTrendPoint[] = []
  for (let year = startYear; year <= endYear; year += step) {
    const p = (year - startYear) / (endYear - startYear) // 0..1
    const at = (hazard: keyof typeof end, salt: number) => {
      const base = end[hazard] * 0.55 // historical baseline ~55% of today
      const value = base + (end[hazard] - base) * p + (rand(seed, salt + year) - 0.5) * 6
      return Math.max(0, Math.min(100, Math.round(value)))
    }
    points.push({
      year,
      heat: at("heat", 1),
      flood: at("flood", 2),
      storm: at("storm", 3),
      drought: at("drought", 4),
    })
  }
  return points
}

// ---------------------------------------------------------------------------
// Group H Financing & payments (spec Part 13)
// ---------------------------------------------------------------------------

export type EaasContract = {
  systemCapexTsh: number
  installCostTsh: number
  financedTsh: number
  monthlyFeeTsh: number
  currentSpendTsh: number
  monthlySavingTsh: number
  total7yrTsh: number
  breakEvenMonths: number
  termMonths: number
  assetTransferYear: number
}

/** Energy-as-a-Service contract figures (spec 13.213.4). */
export function getEaasContract(facilityId?: string): EaasContract {
  const seed = seedFor(facilityId, "eaas")
  const systemCapexTsh = Math.round((30_000_000 + rand(seed, 1) * 15_000_000) / 100_000) * 100_000
  const installCostTsh = Math.round((systemCapexTsh * 0.2) / 1000) * 1000
  const financedTsh = systemCapexTsh - installCostTsh
  const termMonths = 84
  const monthlyFeeTsh = Math.round(((financedTsh * 1.25) / termMonths) / 1000) * 1000
  const currentSpendTsh = Math.round((monthlyFeeTsh * (1.3 + rand(seed, 2) * 0.3)) / 1000) * 1000
  const monthlySavingTsh = currentSpendTsh - monthlyFeeTsh
  const total7yrTsh = monthlyFeeTsh * termMonths
  const breakEvenMonths = Math.max(1, Math.round(installCostTsh / Math.max(monthlySavingTsh, 1)))
  return {
    systemCapexTsh,
    installCostTsh,
    financedTsh,
    monthlyFeeTsh,
    currentSpendTsh,
    monthlySavingTsh,
    total7yrTsh,
    breakEvenMonths,
    termMonths,
    assetTransferYear: new Date().getFullYear() + 7,
  }
}

export type SmartSplitterDay = { date: string; revenueTsh: number; paymentTsh: number }
export type SmartSplitter = {
  alphaPct: number
  monthlyCapTsh: number
  cumulativePaidTsh: number
  todayRevenueTsh: number
  todayPaymentTsh: number
  recentDays: SmartSplitterDay[]
}

/** Revenue-Linked Smart-Splitter Gateway state (spec 13.5). */
export function getSmartSplitter(facilityId?: string): SmartSplitter {
  const seed = seedFor(facilityId, "smart-splitter")
  const alphaPct = 3 + Math.round(rand(seed, 1) * 2) // 35%
  const monthlyCapTsh = getEaasContract(facilityId).monthlyFeeTsh
  const recentDays: SmartSplitterDay[] = []
  let cumulative = 0
  for (let i = 9; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86_400_000)
    const revenueTsh = Math.round((80_000 + rand(seed, i * 7) * 220_000) / 1000) * 1000
    const remaining = Math.max(0, monthlyCapTsh - cumulative)
    const paymentTsh = Math.min(Math.round((revenueTsh * alphaPct) / 100 / 1000) * 1000, remaining)
    cumulative += paymentTsh
    recentDays.push({
      date: `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`,
      revenueTsh,
      paymentTsh,
    })
  }
  const today = recentDays[recentDays.length - 1]
  return {
    alphaPct,
    monthlyCapTsh,
    cumulativePaidTsh: cumulative,
    todayRevenueTsh: today.revenueTsh,
    todayPaymentTsh: today.paymentTsh,
    recentDays,
  }
}

export type EscrowInflow = { date: string; amountTsh: number; source: string }
export type NhifEscrow = {
  assignedPct: number
  monthlyFeeTsh: number
  escrowBalanceTsh: number
  retainedThisMonthTsh: number
  forwardedToClinicTsh: number
  status: "on-track" | "awaiting-payout" | "shortfall"
  inflows: EscrowInflow[]
}

/** NHIF Receivables Escrow status (spec 13.6). */
export function getNhifEscrow(facilityId?: string): NhifEscrow {
  const seed = seedFor(facilityId, "nhif-escrow")
  const monthlyFeeTsh = getEaasContract(facilityId).monthlyFeeTsh
  const assignedPct = 15 + Math.round(rand(seed, 1) * 10) // 1525%
  const inflows: EscrowInflow[] = []
  let retained = 0
  let forwarded = 0
  for (let i = 0; i < 3; i++) {
    const d = new Date(Date.now() - (i * 26 + 4) * 86_400_000)
    const amountTsh = Math.round((600_000 + rand(seed, i * 5) * 900_000) / 1000) * 1000
    inflows.push({
      date: `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`,
      amountTsh,
      source: "NHIF claim payout",
    })
    const take = Math.min(amountTsh, Math.max(0, monthlyFeeTsh - retained))
    retained += take
    forwarded += amountTsh - take
  }
  const status: NhifEscrow["status"] =
    retained >= monthlyFeeTsh ? "on-track" : retained > 0 ? "awaiting-payout" : "shortfall"
  return {
    assignedPct,
    monthlyFeeTsh,
    escrowBalanceTsh: retained,
    retainedThisMonthTsh: retained,
    forwardedToClinicTsh: forwarded,
    status,
    inflows,
  }
}

// ---------------------------------------------------------------------------
// Group I Alerts & notifications (spec Part 11.3 / 15)
// ---------------------------------------------------------------------------

export type AlertKind = "heatwave" | "flood" | "outage" | "disease"
export type AlertSeverity = "info" | "warning" | "danger"

export type FacilityAlert = {
  kind: AlertKind
  active: boolean
  severity: AlertSeverity
  title: string
  detail: string
  leadTime: string
}

/** Climate & outage alerts with lead time (spec 11.3 "Warn"). */
export function getFacilityAlerts(facilityId?: string): FacilityAlert[] {
  const seed = seedFor(facilityId, "alerts")
  const pick = (salt: number, t: AlertSeverity, f: AlertSeverity = "info"): { active: boolean; severity: AlertSeverity } => {
    const active = rand(seed, salt) < 0.5
    return { active, severity: active ? t : f }
  }
  const heat = pick(1, "danger")
  const flood = pick(2, "warning")
  const outage = pick(3, "warning")
  const disease = pick(4, "info")

  return [
    {
      kind: "heatwave",
      ...heat,
      title: heat.active ? "Heatwave expected this week" : "No heat alerts",
      detail: heat.active
        ? "Daytime highs near 37°C for 3 days. Your fridge and battery will work harder check ventilation and keep doors closed."
        : "Temperatures are within the normal range for the week ahead.",
      leadTime: heat.active ? "3 days ahead" : "",
    },
    {
      kind: "flood",
      ...flood,
      title: flood.active ? "Heavy rain & flood risk" : "No flood alerts",
      detail: flood.active
        ? "Heavy rainfall forecast in your area. Protect ground-level equipment and confirm a dry store for vaccines."
        : "No significant rainfall or flood risk forecast.",
      leadTime: flood.active ? "48 hours ahead" : "",
    },
    {
      kind: "outage",
      ...outage,
      title: outage.active ? "Higher chance of power outage" : "Grid looks stable",
      detail: outage.active
        ? "Grid instability likely this evening. Ensure the battery is charged and the generator has fuel."
        : "No elevated outage probability detected for today.",
      leadTime: outage.active ? "This evening" : "",
    },
    {
      kind: "disease",
      ...disease,
      title: disease.active ? "Climate-linked disease watch" : "No disease alerts",
      detail: disease.active
        ? "Standing water after recent rain raises malaria and cholera risk. Prepare supplies and watch for a rise in cases."
        : "No climate-linked disease signals in your area right now.",
      leadTime: disease.active ? "12 weeks" : "",
    },
  ]
}

export type DailyPush = { time: string; greeting: string; lines: string[] }

/** The 6:30am WhatsApp+SMS status push, composed for preview (spec 15.3) surface only. */
export function getDailyPushPreview(facilityId?: string, facilityName?: string | null): DailyPush {
  const fridge = getFridgeStatus(facilityId)
  const power = getPowerToday(facilityId)
  const tasks = getPendingTasks(facilityId)
  const skyLabel = { sunny: "sunny", partly: "partly cloudy", cloudy: "cloudy" }[power.expectedSolar]
  return {
    time: "06:30",
    greeting: `Good morning${facilityName ? `, ${facilityName}` : ""}.`,
    lines: [
      `Fridge: ${fridge.status === "safe" ? "SAFE" : "DANGER"} (${fridge.tempC.toFixed(1)}°C).`,
      `Power today: ~${power.expectedHours}h, battery ${power.batterySocPct}%, ${skyLabel}.`,
      tasks.length > 0
        ? `Tasks: ${tasks.length} need your attention.`
        : "Tasks: nothing for today.",
    ],
  }
}

// ---------------------------------------------------------------------------
// Group J AI co-pilot & forecasts (spec Part 11.3)
// ---------------------------------------------------------------------------

export const COPILOT_SUGGESTIONS = [
  "Are my vaccines safe right now?",
  "How much power will I have today?",
  "How much could I save with solar?",
  "What should I do about the fridge?",
] as const

/**
 * Canned co-pilot answers (spec 11.3). Keyword-matched and grounded in the demo
 * data, so responses are coherent with the rest of the dashboard.
 *
 * TODO: wire the real GenAI co-pilot (Swahili/EN) per spec Part 11.
 */
export function answerCopilot(question: string, facilityId?: string): string {
  const q = question.toLowerCase()
  if (q.includes("vaccine") || q.includes("fridge") || q.includes("cold")) {
    const f = getFridgeStatus(facilityId)
    return f.status === "safe"
      ? `Your vaccine fridge is SAFE at ${f.tempC.toFixed(1)}°C, within the 28°C band. Keep the door closed and log a manual reading if the display looks off.`
      : `Your fridge is in DANGER at ${f.tempC.toFixed(1)}°C. Move vaccines to a backup cold box, check power and the door seal, and open the troubleshooting flow on the Fridge page.`
  }
  if (q.includes("power") || q.includes("battery") || q.includes("electric")) {
    const p = getPowerToday(facilityId)
    return `You can expect about ${p.expectedHours} hours of power today. Battery is at ${p.batterySocPct}% and the sky is ${p.expectedSolar}. Charge critical loads while the sun is up.`
  }
  if (q.includes("save") || q.includes("cost") || q.includes("bill") || q.includes("money")) {
    const c = getEaasContract(facilityId)
    return `Under an Energy-as-a-Service plan your monthly fee would be about ${formatTsh(c.monthlyFeeTsh)} versus roughly ${formatTsh(c.currentSpendTsh)} today a saving of about ${formatTsh(c.monthlySavingTsh)} every month, breaking even in ${c.breakEvenMonths} months.`
  }
  if (q.includes("solar") || q.includes("sun")) {
    const days = get7daySolarForecast(facilityId)
    const best = days.reduce((a, b) => (b.expectedKwh > a.expectedKwh ? b : a))
    return `Your strongest solar day this week looks like ${best.day} (~${best.expectedKwh} kWh, ${best.sky}). Plan heavy tasks like sterilising for sunny days.`
  }
  return "I can help with your fridge, today's power, expected solar, and how much you could save with solar. Try one of the suggested questions."
}

function formatTsh(n: number): string {
  return `TSh ${Math.round(n).toLocaleString("en-US")}`
}

// ---------------------------------------------------------------------------
// Group K Channels (spec Part 15)
// ---------------------------------------------------------------------------

/** One-message SMS status summary (spec 15.5: `STATUS` keyword). */
export function getSmsStatus(facilityId?: string): string {
  const f = getFridgeStatus(facilityId)
  const p = getPowerToday(facilityId)
  return `AFYASOLAR: Fridge ${f.status === "safe" ? "SAFE" : "DANGER"} ${f.tempC.toFixed(1)}C. Power ~${p.expectedHours}h, batt ${p.batterySocPct}%. Reply HELP for options.`
}

export type WhatIfScenario = "add-fridge" | "add-battery" | "late-rains" | "led-retrofit"

export type WhatIfResult = {
  deltaServiceHours: number
  deltaMonthlyCostTsh: number
  deltaResiliencePoints: number
  note: string
}

/** "What-if" simulation outcomes (spec 11.3 "Simulate"). */
export function getWhatIfResult(scenario: WhatIfScenario, facilityId?: string): WhatIfResult {
  const seed = seedFor(facilityId, `whatif-${scenario}`)
  switch (scenario) {
    case "add-fridge":
      return {
        deltaServiceHours: -Math.round((1.5 + rand(seed, 1) * 1.5) * 10) / 10,
        deltaMonthlyCostTsh: Math.round((40_000 + rand(seed, 2) * 40_000) / 1000) * 1000,
        deltaResiliencePoints: -3,
        note: "A second fridge adds critical load, shortening battery autonomy and raising energy cost. Consider a solar direct-drive unit and more storage.",
      }
    case "add-battery":
      return {
        deltaServiceHours: Math.round((3 + rand(seed, 1) * 3) * 10) / 10,
        deltaMonthlyCostTsh: -Math.round((30_000 + rand(seed, 2) * 40_000) / 1000) * 1000,
        deltaResiliencePoints: 11,
        note: "Adding storage lets critical loads ride through longer outages and cuts generator runtime, lowering monthly cost.",
      }
    case "late-rains":
      return {
        deltaServiceHours: -Math.round((1 + rand(seed, 1) * 2) * 10) / 10,
        deltaMonthlyCostTsh: Math.round((20_000 + rand(seed, 2) * 30_000) / 1000) * 1000,
        deltaResiliencePoints: -4,
        note: "Late rains mean more cloudy days and weaker solar, so the battery and generator carry more of the load.",
      }
    case "led-retrofit":
    default:
      return {
        deltaServiceHours: Math.round((1 + rand(seed, 1) * 1.5) * 10) / 10,
        deltaMonthlyCostTsh: -Math.round((45_000 + rand(seed, 2) * 30_000) / 1000) * 1000,
        deltaResiliencePoints: 4,
        note: "An LED retrofit cuts lighting load, extends battery autonomy and lowers your monthly energy bill.",
      }
  }
}

// ---------------------------------------------------------------------------
// Group F Child Services at Risk
//
// The platform's headline promise: "identify which child-services are about to
// fail." This consolidates per-service resilience for the five child-critical
// services into a single status board, with an about-to-fail prediction window
// and the CRiPHC dimension each maps to. Narrative strings are bilingual so the
// Swahili UI shows localised drivers/signals, not just translated chrome.
// ---------------------------------------------------------------------------

/** Stable keys for the five child-critical services. */
export type ChildServiceKey =
  | "cold-chain"
  | "maternity"
  | "neonatal"
  | "diagnostics"
  | "water-pumping"

export type ChildServiceStatus = "ok" | "at-risk" | "failing"

/** A short bilingual string (English + Swahili) used for dynamic narrative. */
export type Bilingual = { en: string; sw: string }

export type ChildServicePrediction = {
  etaDaysMin: number
  etaDaysMax: number
  confidencePct: number
  signal: Bilingual
}

export type ChildServiceRisk = {
  key: ChildServiceKey
  status: ChildServiceStatus
  /** 0100 resilience headroom (higher = more protected). */
  headroomPct: number
  /** What this service depends on to keep running. */
  dependsOn: Bilingual
  /** Why it is at risk / failing (12 drivers). Empty when protected. */
  drivers: Bilingual[]
  /** About-to-fail window; null when the service is protected. */
  prediction: ChildServicePrediction | null
  /** CRiPHC dimension this service maps to (HES/CSF/ECPQ/EDC/RRC). */
  linkedDimension: string
}

const CHILD_SERVICE_DEFS: {
  key: ChildServiceKey
  dependsOn: Bilingual
  linkedDimension: string
  drivers: Bilingual[]
  signal: Bilingual
}[] = [
  {
    key: "cold-chain",
    linkedDimension: "ECPQ",
    dependsOn: {
      en: "Continuous power to the vaccine fridge",
      sw: "Umeme wa kuendelea kwa friji ya chanjo",
    },
    drivers: [
      {
        en: "Compressor run-time rising and slower temperature recovery after outages",
        sw: "Muda wa kufanya kazi wa kompresa unaongezeka na kupoa kunachelewa baada ya kukatika kwa umeme",
      },
      {
        en: "Battery autonomy below the cold-chain reserve on cloudy days",
        sw: "Uwezo wa betri uko chini ya akiba ya mnyororo baridi siku za mawingu",
      },
    ],
    signal: {
      en: "Fridge temperature trending toward the unsafe band",
      sw: "Joto la friji linaelekea kwenye kiwango kisicho salama",
    },
  },
  {
    key: "maternity",
    linkedDimension: "CSF",
    dependsOn: {
      en: "Lighting and power in the delivery room",
      sw: "Mwanga na umeme katika chumba cha kujifungua",
    },
    drivers: [
      {
        en: "Delivery room is not on a protected (battery-backed) circuit",
        sw: "Chumba cha kujifungua hakiko kwenye mzunguko uliolindwa (wenye betri)",
      },
    ],
    signal: {
      en: "Night deliveries depend on torchlight during outages",
      sw: "Kujifungua usiku kunategemea tochi wakati wa kukatika kwa umeme",
    },
  },
  {
    key: "neonatal",
    linkedDimension: "CSF",
    dependsOn: {
      en: "Stable power for warmers and oxygen concentrators",
      sw: "Umeme thabiti kwa vifaa vya kupasha joto na oksijeni",
    },
    drivers: [
      {
        en: "Oxygen concentrator shares an unprotected circuit",
        sw: "Kifaa cha oksijeni kinashiriki mzunguko usiolindwa",
      },
      {
        en: "No tested backup for newborn warmers",
        sw: "Hakuna mbadala uliojaribiwa kwa vifaa vya kupasha joto watoto wachanga",
      },
    ],
    signal: {
      en: "Warmer and oxygen loads exceed remaining battery reserve",
      sw: "Mahitaji ya joto na oksijeni yanazidi akiba ya betri iliyobaki",
    },
  },
  {
    key: "diagnostics",
    linkedDimension: "EDC",
    dependsOn: {
      en: "Power to the microscope, analyser and records",
      sw: "Umeme kwa darubini, kifaa cha uchunguzi na kumbukumbu",
    },
    drivers: [
      {
        en: "Diagnostics pause during midday outages",
        sw: "Uchunguzi husimama wakati wa kukatika kwa umeme mchana",
      },
    ],
    signal: {
      en: "Lab workload clusters in the lowest-power window",
      sw: "Kazi za maabara zinajikusanya katika kipindi cha umeme mdogo zaidi",
    },
  },
  {
    key: "water-pumping",
    linkedDimension: "HES",
    dependsOn: {
      en: "Pump power and a filled storage tank",
      sw: "Umeme wa pampu na tanki la kuhifadhi lililojaa",
    },
    drivers: [
      {
        en: "Pump draws heavily; storage runs low before solar peak",
        sw: "Pampu hutumia umeme mwingi; hifadhi hupungua kabla ya kilele cha jua",
      },
    ],
    signal: {
      en: "Tank level falls below the daily clinical minimum",
      sw: "Kiwango cha tanki hushuka chini ya kiwango cha chini cha kila siku cha kliniki",
    },
  },
]

function statusFromHeadroom(headroom: number): ChildServiceStatus {
  if (headroom < 35) return "failing"
  if (headroom < 60) return "at-risk"
  return "ok"
}

/**
 * Per-facility status board for the five child-critical services. Deterministic
 * from the facilityId so demos are stable. Each at-risk/failing service gets an
 * about-to-fail prediction window; protected services get none.
 */
export function getChildServicesAtRisk(facilityId?: string): ChildServiceRisk[] {
  const seed = seedFor(facilityId, "child-services")
  return CHILD_SERVICE_DEFS.map((def, i) => {
    const headroomPct = Math.round(20 + rand(seed, i * 6 + 1) * 70) // ~2090
    const status = statusFromHeadroom(headroomPct)
    const prediction: ChildServicePrediction | null =
      status === "ok"
        ? null
        : (() => {
            // Tighter, sooner window for "failing" than "at-risk".
            const base = status === "failing" ? 3 : 12
            const spread = status === "failing" ? 7 : 16
            const etaDaysMin = base + Math.floor(rand(seed, i * 6 + 2) * 4)
            const etaDaysMax = etaDaysMin + 3 + Math.floor(rand(seed, i * 6 + 3) * spread)
            const confidencePct = Math.round(
              (status === "failing" ? 72 : 58) + rand(seed, i * 6 + 4) * 18,
            )
            return { etaDaysMin, etaDaysMax, confidencePct, signal: def.signal }
          })()
    return {
      key: def.key,
      status,
      headroomPct,
      dependsOn: def.dependsOn,
      drivers: status === "ok" ? [] : def.drivers.slice(0, status === "failing" ? 2 : 1),
      prediction,
      linkedDimension: def.linkedDimension,
    }
  })
}

export type ChildServicesSummary = { failing: number; atRisk: number; ok: number }

/** Roll-up counts for the board header. */
export function getChildServicesSummary(facilityId?: string): ChildServicesSummary {
  const out: ChildServicesSummary = { failing: 0, atRisk: 0, ok: 0 }
  for (const s of getChildServicesAtRisk(facilityId)) {
    if (s.status === "failing") out.failing += 1
    else if (s.status === "at-risk") out.atRisk += 1
    else out.ok += 1
  }
  return out
}

// ---------------------------------------------------------------------------
// Group G RCS explainability ("Why this score")
//
// Read-only breakdown of how the Resilience Capacity Score is built. Reuses the
// exact CRiPHC math (getCrphcBaseDimensions + CRPHC_NEW_DIMENSIONS @60 +
// computeCrphcResult) so the RCS here equals the interactive CRiPHC widget's
// default. Adds per-dimension contribution / recoverable points and bilingual
// plain-language "what it measures" + "what would improve it" copy. Supports the
// application's "explainable, auditable" claim.
// ---------------------------------------------------------------------------

export type RcsDimensionInsight = {
  code: string
  label: string
  weight: number
  /** 0100 dimension score. */
  score: number
  /** Points this dimension contributes to the RCS = round(score × weight). */
  contribution: number
  /** Most points this dimension could contribute = round(100 × weight). */
  maxContribution: number
  /** Recoverable points if lifted to 100 = round((100 − score) × weight). */
  gapPoints: number
  /** True for the two CRiPHC v2.0 dimensions (Workforce, WASH). */
  isNew?: boolean
  whatItMeasures: Bilingual
  howToImprove: Bilingual
}

export type RcsExplainer = {
  rcs: number
  tier: string
  dimensions: RcsDimensionInsight[]
}

/** Static, bilingual plain-language copy per CRiPHC dimension code. */
const RCS_DIMENSION_COPY: Record<
  string,
  { whatItMeasures: Bilingual; howToImprove: Bilingual }
> = {
  HES: {
    whatItMeasures: {
      en: "How exposed this facility is to climate hazards heat, flooding, storms and drought.",
      sw: "Kiwango cha facility hii kukabiliwa na hatari za hali ya hewa joto, mafuriko, dhoruba na ukame.",
    },
    howToImprove: {
      en: "Site protection (drainage, shading, flood barriers) and siting decisions informed by hazard data.",
      sw: "Ulinzi wa eneo (mifereji, vivuli, vizuizi vya mafuriko) na maamuzi ya eneo yanayotokana na data ya hatari.",
    },
  },
  CSF: {
    whatItMeasures: {
      en: "How fragile the critical child services are if power or equipment fails (cold-chain, maternity, theatre, lab).",
      sw: "Udhaifu wa huduma muhimu za watoto iwapo umeme au vifaa vitashindwa (mnyororo baridi, uzazi, chumba cha upasuaji, maabara).",
    },
    howToImprove: {
      en: "Put critical loads on protected, battery-backed circuits and add tested backups.",
      sw: "Weka mizigo muhimu kwenye mizunguko iliyolindwa yenye betri na ongeza mbadala uliojaribiwa.",
    },
  },
  ECPQ: {
    whatItMeasures: {
      en: "Energy continuity and power quality how reliably clean power reaches equipment.",
      sw: "Mwendelezo wa nishati na ubora wa umeme jinsi umeme safi unavyofika kwenye vifaa kwa uhakika.",
    },
    howToImprove: {
      en: "Right-size solar and storage, stabilise voltage, and cut generator dependency.",
      sw: "Panga ukubwa sahihi wa sola na hifadhi, imarisha volteji, na punguza utegemezi wa jenereta.",
    },
  },
  EDC: {
    whatItMeasures: {
      en: "Efficiency and demand control how much energy is wasted and how well peak demand is managed.",
      sw: "Ufanisi na udhibiti wa mahitaji kiasi cha nishati kinachopotea na jinsi mahitaji ya kilele yanavyodhibitiwa.",
    },
    howToImprove: {
      en: "LED retrofits, efficient appliances, and load scheduling away from low-power windows.",
      sw: "Badilisha taa kuwa LED, vifaa vyenye ufanisi, na panga matumizi mbali na vipindi vya umeme mdogo.",
    },
  },
  RRC: {
    whatItMeasures: {
      en: "Readiness and response plans, procedures and staff preparedness for outages and shocks.",
      sw: "Utayari na mwitikio mipango, taratibu na utayari wa wafanyakazi kwa kukatika kwa umeme na misukosuko.",
    },
    howToImprove: {
      en: "Document and drill emergency procedures; keep backup cold boxes and fuel ready.",
      sw: "Andika na fanya mazoezi ya taratibu za dharura; weka tayari masanduku baridi ya akiba na mafuta.",
    },
  },
  W: {
    whatItMeasures: {
      en: "Workforce capacity staffing levels and skills to operate and maintain the system.",
      sw: "Uwezo wa wafanyakazi idadi ya wafanyakazi na ujuzi wa kuendesha na kutunza mfumo.",
    },
    howToImprove: {
      en: "Train an on-site energy champion and schedule routine maintenance support.",
      sw: "Funza balozi wa nishati wa eneo na panga msaada wa matengenezo wa mara kwa mara.",
    },
  },
  WW: {
    whatItMeasures: {
      en: "Water, sanitation, hygiene and waste services that also depend on reliable power and water.",
      sw: "Maji, usafi wa mazingira, usafi na taka huduma zinazotegemea pia umeme na maji ya uhakika.",
    },
    howToImprove: {
      en: "Protect the water pump circuit, maintain storage, and ensure safe waste handling.",
      sw: "Linda mzunguko wa pampu ya maji, tunza hifadhi, na hakikisha utunzaji salama wa taka.",
    },
  },
}

/**
 * RCS explainability model: the seven CRiPHC dimensions with their contribution
 * to the score, recoverable points, and plain-language copy. The two v2.0
 * dimensions use the same default (60) as the interactive widget so the RCS
 * headline matches across the dashboard.
 */
export function getRcsExplainer(facilityId?: string): RcsExplainer {
  const base = getCrphcBaseDimensions(facilityId)
  const dims: CrphcDimension[] = [
    ...base,
    ...CRPHC_NEW_DIMENSIONS.map((d) => ({ ...d, score: 60, isNew: true })),
  ]
  const { rcs, tier } = computeCrphcResult(dims)
  const dimensions: RcsDimensionInsight[] = dims.map((d) => {
    const copy = RCS_DIMENSION_COPY[d.code] ?? {
      whatItMeasures: { en: d.label, sw: d.label },
      howToImprove: { en: "", sw: "" },
    }
    return {
      code: d.code,
      label: d.label,
      weight: d.weight,
      score: d.score,
      contribution: Math.round(d.score * d.weight),
      maxContribution: Math.round(100 * d.weight),
      gapPoints: Math.round((100 - d.score) * d.weight),
      isNew: d.isNew,
      whatItMeasures: copy.whatItMeasures,
      howToImprove: copy.howToImprove,
    }
  })
  return { rcs, tier, dimensions }
}

export type RcsTrendPoint = { label: string; rcs: number }

/**
 * Quarterly RCS history ending at the facility's current score, trending up from
 * a lower baseline with mild seeded noise. Simulated for the RCS trend chart.
 */
export function getRcsTrend(facilityId?: string): RcsTrendPoint[] {
  const seed = seedFor(facilityId, "rcs-trend")
  const current = getRcsExplainer(facilityId).rcs
  const now = new Date()
  const n = 6
  const baseline = Math.max(0, current - 12)
  const points: RcsTrendPoint[] = []
  for (let i = n - 1; i >= 0; i--) {
    const progress = (n - 1 - i) / (n - 1) // 0 (oldest) .. 1 (newest)
    const value =
      i === 0
        ? current
        : Math.max(0, Math.min(100, Math.round(baseline + (current - baseline) * progress + (rand(seed, i) - 0.5) * 4)))
    const d = new Date(now.getFullYear(), now.getMonth() - i * 3, 1)
    const quarter = Math.floor(d.getMonth() / 3) + 1
    points.push({ label: `Q${quarter} ${d.getFullYear()}`, rcs: value })
  }
  return points
}
