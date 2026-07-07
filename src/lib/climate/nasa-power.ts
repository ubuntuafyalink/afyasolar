/**
 * NASA POWER climate data: shared types, a client fetch wrapper, location and
 * time-range helpers, and a transparent, versioned normalization of the raw
 * meteorological series into the hazard shapes the Climate Outlook UI already
 * consumes (HazardTrendPoint / HazardScore / ResiHealthCvi).
 *
 * NASA POWER is free and needs no API key. Real requests go through our server
 * proxy at /api/climate/nasa-power (see src/app/api/climate/nasa-power/route.ts)
 * so we can validate, cache, strip fill values, and apply a timeout.
 *
 * Data source: https://power.larc.nasa.gov/  (community = RE)
 */
import { getFacilityById } from "@/lib/facility-data"
import type {
  HazardTrendPoint,
  HazardScore,
  ResiHealthCvi,
} from "@/lib/dashboard/facility-demo-data"
import { anomalyPercentile, empiricalReturnYears, olsFit } from "@/lib/climate/climate-stats"

/**
 * Bumped whenever the normalization formulas below change, for auditability.
 * v2 (2026-07): hazard indices are calibrated to each site's own multi-decade
 * NASA POWER climatology (standardized-anomaly percentile blended with an
 * absolute-severity anchor) instead of a fixed linear map; the 2030/2050
 * projection extrapolates the observed trend instead of a flat +12. See
 * docs/CLIMATE_RESILIENCE_METHODOLOGY.md.
 */
export const NORMALIZATION_VERSION = "v2"

/** The only NASA POWER parameters this feature requests / accepts. */
export const NASA_POWER_PARAMETERS = ["T2M_MAX", "PRECTOTCORR", "WS10M"] as const
export type NasaPowerParam = (typeof NASA_POWER_PARAMETERS)[number]

/**
 * Solar resource parameter: all-sky surface shortwave downward irradiance.
 * NASA POWER reports this daily value in kWh/m^2/day, which equals the site's
 * peak-sun-hours (PSH) - the standard input for solar-generation estimates.
 */
export const SOLAR_PARAMETERS = ["ALLSKY_SFC_SW_DWN"] as const

export type Temporal = "daily" | "monthly"

// ---------------------------------------------------------------------------
// Types (mirror the /api/climate/nasa-power payload)
// ---------------------------------------------------------------------------

export type NasaPowerSeriesPoint = { date: string; value: number }
/** param name -> chronological series with fill values already stripped. */
export type NasaPowerSeries = Record<string, NasaPowerSeriesPoint[]>

export type NasaPowerResponse = {
  temporal: Temporal
  params: string[]
  series: NasaPowerSeries
  sourceUrl: string
}

export type NasaPowerError = { code: string; message: string }

export type NasaPowerQuery = {
  lat: number
  lon: number
  temporal: Temporal
  start: string
  end: string
  parameters: readonly string[]
}

// ---------------------------------------------------------------------------
// Location
// ---------------------------------------------------------------------------

export type Coords = { lat: number; lon: number }

/** Representative coordinates for the regions used across the demo dataset. */
export const REGION_COORDS: Record<string, Coords> = {
  "Dar es Salaam": { lat: -6.79, lon: 39.21 },
  Pwani: { lat: -6.44, lon: 38.9 }, // Bagamoyo
  Morogoro: { lat: -6.82, lon: 37.66 },
}

export const DEFAULT_COORDS: Coords = REGION_COORDS["Dar es Salaam"]

/**
 * Prefer the facility's real coordinates, then a region representative point,
 * then the Dar es Salaam default.
 */
export function resolveCoords(opts: { facilityId?: string; region?: string | null }): Coords {
  const facility = opts.facilityId ? getFacilityById(opts.facilityId) : undefined
  if (facility) return { lat: facility.coordinates.lat, lon: facility.coordinates.lng }
  if (opts.region && REGION_COORDS[opts.region]) return REGION_COORDS[opts.region]
  return DEFAULT_COORDS
}

// ---------------------------------------------------------------------------
// Time range
// ---------------------------------------------------------------------------

export type RangePreset = "1y" | "5y" | "10y" | "20y" | "custom"

export type ResolvedRange = {
  temporal: Temporal
  start: string
  end: string
  startYear: number
  endYear: number
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n)
}

function toYmd(d: Date): string {
  return `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}`
}

/**
 * Temporal rule: a span of 2 years or less uses daily data (so we can derive
 * consecutive-dry-day drought); longer spans use monthly data to keep payloads
 * small. End dates are backed off to account for NASA POWER latency (daily lags
 * several days; monthly is reported through the last complete prior year).
 */
export function rangeForPreset(
  preset: Exclude<RangePreset, "custom">,
  now: Date = new Date(),
): ResolvedRange {
  const years = preset === "1y" ? 1 : preset === "5y" ? 5 : preset === "10y" ? 10 : 20
  const temporal: Temporal = years <= 2 ? "daily" : "monthly"

  if (temporal === "daily") {
    const end = new Date(now)
    end.setDate(end.getDate() - 7)
    const start = new Date(end)
    start.setFullYear(start.getFullYear() - years)
    return {
      temporal,
      start: toYmd(start),
      end: toYmd(end),
      startYear: start.getFullYear(),
      endYear: end.getFullYear(),
    }
  }

  const endYear = now.getFullYear() - 1
  const startYear = endYear - years + 1
  return { temporal, start: String(startYear), end: String(endYear), startYear, endYear }
}

/** Build a range from explicit from/to years, clamping the end for latency. */
export function customRange(
  fromYear: number,
  toYear: number,
  now: Date = new Date(),
): ResolvedRange {
  const lo = Math.min(fromYear, toYear)
  const hi = Math.max(fromYear, toYear)
  const span = hi - lo + 1
  const temporal: Temporal = span <= 2 ? "daily" : "monthly"

  if (temporal === "daily") {
    const maxEnd = new Date(now)
    maxEnd.setDate(maxEnd.getDate() - 7)
    const desiredEnd = new Date(hi, 11, 31)
    const end = desiredEnd > maxEnd ? maxEnd : desiredEnd
    return {
      temporal,
      start: `${lo}0101`,
      end: toYmd(end),
      startYear: lo,
      endYear: end.getFullYear(),
    }
  }

  const endYear = Math.min(hi, now.getFullYear() - 1)
  return { temporal, start: String(lo), end: String(endYear), startYear: lo, endYear }
}

// ---------------------------------------------------------------------------
// Client fetch wrapper
// ---------------------------------------------------------------------------

/** Calls our server proxy and throws a readable Error on a typed failure. */
export async function fetchNasaPower(q: NasaPowerQuery): Promise<NasaPowerResponse> {
  const sp = new URLSearchParams({
    lat: String(q.lat),
    lon: String(q.lon),
    temporal: q.temporal,
    start: q.start,
    end: q.end,
    parameters: q.parameters.join(","),
  })
  const res = await fetch(`/api/climate/nasa-power?${sp.toString()}`)
  const json: unknown = await res.json().catch(() => null)
  if (!res.ok || (json && typeof json === "object" && "error" in json)) {
    const err = (json as { error?: NasaPowerError } | null)?.error
    throw new Error(err?.message || "NASA POWER request failed")
  }
  return json as NasaPowerResponse
}

// ---------------------------------------------------------------------------
// Normalization (NORMALIZATION_VERSION above)
//
// For each calendar year we reduce the raw series to one representative
// statistic per hazard, then linearly map it onto a 0..100 index (clamped)
// using fixed reference bounds. These bounds are deliberately simple, documented
// heuristics, not calibrated climatology; bump NORMALIZATION_VERSION on change.
//
//   heat    = annual mean of T2M_MAX (deg C),      mapped from [20, 42]
//   flood   = annual peak of PRECTOTCORR,          mapped from [0, 80] mm/day
//             (daily) or [0, 15] mm/day mean (monthly)
//   storm   = annual peak of WS10M (m/s),          mapped from [0, 15]
//   drought = longest run of days with PRECTOTCORR < 1 mm (daily),
//             mapped from [0, 90] days; monthly proxy = count of months with
//             mean < 1 mm/day, mapped from [0, 12] (coarse).
// ---------------------------------------------------------------------------

// Absolute-severity reference bounds (the physical-magnitude anchor). v2 blends
// a local-climatology anomaly percentile with this fixed map; see below.
const HEAT_BOUNDS = [20, 42] as const
const FLOOD_BOUNDS_DAILY = [0, 80] as const
const FLOOD_BOUNDS_MONTHLY = [0, 15] as const
const STORM_BOUNDS = [0, 15] as const
const DROUGHT_DAYS_BOUNDS = [0, 90] as const
const DRY_MONTHS_BOUNDS = [0, 12] as const
const DRY_THRESHOLD_MM = 1

// v2 calibration parameters.
// REL_WEIGHT = how much the local anomaly percentile counts vs the absolute
// anchor. Skewed extremes (flood/storm maxima) lean on the absolute anchor;
// near-normal quantities (heat mean, drought counts) lean on the local anomaly.
type HazardKey = "heat" | "flood" | "storm" | "drought"
const REL_WEIGHT: Record<HazardKey, number> = { heat: 0.6, drought: 0.6, flood: 0.45, storm: 0.45 }
/** Below this many baseline years, use the absolute index only (no anomaly). */
const MIN_BASELINE_YEARS = 8
/** Below this many baseline years, do not report a return period. */
const MIN_RETURN_YEARS = 10

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n))
}

/** Linear map of value in [min, max] onto an integer 0..100, clamped. The absolute-severity anchor. */
function indexFrom(value: number, min: number, max: number): number {
  if (max === min) return 0
  return Math.round(clamp(((value - min) / (max - min)) * 100, 0, 100))
}

function yearOf(date: string): number {
  return Number(date.slice(0, 4))
}

function seriesPoints(resp: NasaPowerResponse, param: string): NasaPowerSeriesPoint[] {
  return resp.series[param] ?? []
}

function pointsForYear(resp: NasaPowerResponse, param: string, year: number): NasaPowerSeriesPoint[] {
  return seriesPoints(resp, param).filter((p) => yearOf(p.date) === year)
}

function collectYears(resp: NasaPowerResponse): number[] {
  const set = new Set<number>()
  for (const param of resp.params) {
    for (const p of seriesPoints(resp, param)) set.add(yearOf(p.date))
  }
  return [...set].sort((a, b) => a - b)
}

function meanOf(xs: number[]): number | null {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null
}

function maxOf(xs: number[]): number | null {
  return xs.length ? Math.max(...xs) : null
}

// --- Per-hazard PHYSICAL annual statistic (the raw reduction, pre-mapping) ---
function heatStat(resp: NasaPowerResponse, year: number): number | null {
  return meanOf(pointsForYear(resp, "T2M_MAX", year).map((p) => p.value))
}
function floodStat(resp: NasaPowerResponse, year: number): number | null {
  return maxOf(pointsForYear(resp, "PRECTOTCORR", year).map((p) => p.value))
}
function stormStat(resp: NasaPowerResponse, year: number): number | null {
  return maxOf(pointsForYear(resp, "WS10M", year).map((p) => p.value))
}
function droughtStat(resp: NasaPowerResponse, year: number): number | null {
  const pts = pointsForYear(resp, "PRECTOTCORR", year)
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
  if (!pts.length) return null
  if (resp.temporal === "daily") {
    let run = 0
    let best = 0
    for (const p of pts) {
      if (p.value < DRY_THRESHOLD_MM) {
        run += 1
        best = Math.max(best, run)
      } else {
        run = 0
      }
    }
    return best
  }
  return pts.filter((p) => p.value < DRY_THRESHOLD_MM).length
}

function statOf(resp: NasaPowerResponse, key: HazardKey, year: number): number | null {
  switch (key) {
    case "heat":
      return heatStat(resp, year)
    case "flood":
      return floodStat(resp, year)
    case "storm":
      return stormStat(resp, year)
    case "drought":
      return droughtStat(resp, year)
  }
}

function boundsFor(key: HazardKey, temporal: Temporal): readonly [number, number] {
  switch (key) {
    case "heat":
      return HEAT_BOUNDS
    case "flood":
      return temporal === "daily" ? FLOOD_BOUNDS_DAILY : FLOOD_BOUNDS_MONTHLY
    case "storm":
      return STORM_BOUNDS
    case "drought":
      return temporal === "daily" ? DROUGHT_DAYS_BOUNDS : DRY_MONTHS_BOUNDS
  }
}

/** Absolute-severity 0..100 index for a hazard-year (the physical-magnitude anchor). */
function absoluteIndex(resp: NasaPowerResponse, key: HazardKey, year: number): number {
  const s = statOf(resp, key, year)
  if (s == null) return 0
  const [lo, hi] = boundsFor(key, resp.temporal)
  return indexFrom(s, lo, hi)
}

/** Chronological array of a hazard's physical annual statistic (nulls dropped) = the local baseline. */
function annualStatSeries(resp: NasaPowerResponse, key: HazardKey): number[] {
  return collectYears(resp)
    .map((y) => statOf(resp, key, y))
    .filter((v): v is number => v != null)
}

/** Real multi-year hazard trend: one point/year of the ABSOLUTE severity index (drives charts + projection). */
export function toHazardTrend(resp: NasaPowerResponse): HazardTrendPoint[] {
  return collectYears(resp).map((year) => ({
    year,
    heat: absoluteIndex(resp, "heat", year),
    flood: absoluteIndex(resp, "flood", year),
    storm: absoluteIndex(resp, "storm", year),
    drought: absoluteIndex(resp, "drought", year),
  }))
}

const HAZARD_META: { key: HazardKey; type: string; note: string; returnPeriod: boolean }[] = [
  { key: "heat", type: "Heat", note: "Mean daily maximum temperature", returnPeriod: true },
  { key: "flood", type: "Flood", note: "Peak precipitation intensity", returnPeriod: true },
  { key: "storm", type: "Wind / storm", note: "Peak 10 m wind speed", returnPeriod: false },
  { key: "drought", type: "Drought", note: "Consecutive dry-day spell", returnPeriod: false },
]

/**
 * Current hazard scores (v2). Each hazard's latest-year value is expressed as a
 * blend of (a) a standardized-anomaly percentile against the site's own
 * multi-decade NASA POWER record ("relative to local normal") and (b) the
 * absolute-severity anchor, so scores stay comparable across facilities. Short
 * baselines (< MIN_BASELINE_YEARS) fall back to the absolute anchor. Return
 * periods (flood/heat) come from the Weibull position of the latest value in the
 * local record. Trend uses the absolute-index series with a +/- 5 deadband.
 */
export function toHazardScores(resp: NasaPowerResponse): HazardScore[] {
  const trend = toHazardTrend(resp)
  if (!trend.length) return []

  const years = collectYears(resp)
  const latestYear = years[years.length - 1]
  const latest = trend[trend.length - 1]
  const head = trend.slice(0, Math.min(3, trend.length))
  const baseAvg = (k: keyof HazardTrendPoint) =>
    head.reduce((a, p) => a + (p[k] as number), 0) / head.length

  const DEADBAND = 5
  const dir = (current: number, base: number): HazardScore["trend"] => {
    const d = current - base
    if (d > DEADBAND) return "rising"
    if (d < -DEADBAND) return "falling"
    return "stable"
  }

  return HAZARD_META.map((m) => {
    const series = annualStatSeries(resp, m.key)
    const latestStat = statOf(resp, m.key, latestYear)
    const absolute = latest[m.key] // absolute-severity index for the latest year

    let score = absolute
    if (latestStat != null) {
      const rel = anomalyPercentile(latestStat, series, MIN_BASELINE_YEARS)
      if (rel != null) {
        const w = REL_WEIGHT[m.key]
        score = Math.round(clamp(w * rel + (1 - w) * absolute, 0, 100))
      }
    }

    const returnPeriodYears =
      m.returnPeriod && latestStat != null
        ? empiricalReturnYears(latestStat, series, MIN_RETURN_YEARS)
        : null

    return {
      type: m.type,
      score,
      trend: dir(absolute, baseAvg(m.key)),
      note: m.note,
      returnPeriodYears,
      baselineYears: series.length,
    }
  })
}

/** Composite + by-hazard CVI from the latest-year real indices. */
export function toCvi(resp: NasaPowerResponse): ResiHealthCvi {
  const scores = toHazardScores(resp)
  const get = (type: string) => scores.find((s) => s.type === type)?.score ?? 0
  const byHazard = {
    flood: get("Flood"),
    drought: get("Drought"),
    heat: get("Heat"),
    storm: get("Wind / storm"),
  }
  const composite = Math.round(
    (byHazard.flood + byHazard.drought + byHazard.heat + byHazard.storm) / 4,
  )
  return { composite, byHazard }
}

// ---------------------------------------------------------------------------
// Solar resource (for the Power page)
// ---------------------------------------------------------------------------

export type SkyClass = "sunny" | "partly" | "cloudy"
export type SolarResource = { peakSunHours: number; sky: SkyClass }

/** Classify the day's solar availability from peak-sun-hours (kWh/m^2/day). */
export function skyFromPsh(psh: number): SkyClass {
  if (psh >= 5.5) return "sunny"
  if (psh >= 4) return "partly"
  return "cloudy"
}

/**
 * Reduce a fetched ALLSKY_SFC_SW_DWN series to a representative peak-sun-hours
 * value (mean of the daily kWh/m^2/day samples) plus a sky classification.
 * Returns null when no usable solar samples are present.
 */
export function toSolarResource(resp: NasaPowerResponse): SolarResource | null {
  const points = resp.series["ALLSKY_SFC_SW_DWN"] ?? []
  const values = points.map((p) => p.value).filter((v) => v > 0)
  if (!values.length) return null
  const peakSunHours = Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) / 100
  return { peakSunHours, sky: skyFromPsh(peakSunHours) }
}

/** Index points added per hazard for the flat-fallback 2050 projection. */
export const CVI_2050_BUMP = 12

/**
 * FLAT FALLBACK projection, for callers that only have a composite CVI baseline
 * (no per-year trend to extrapolate). 2030 returns the baseline; 2050 applies a
 * flat +12 per hazard (clamped). Prefer projectCviFromTrend() when a trend is
 * available. Either way, this is a transparent assumption, NOT a forecast.
 */
export function projectCvi(base: ResiHealthCvi, year: 2030 | 2050): ResiHealthCvi {
  if (year === 2030) return base
  const bump = (v: number) => Math.min(100, v + CVI_2050_BUMP)
  const byHazard = {
    flood: bump(base.byHazard.flood),
    drought: bump(base.byHazard.drought),
    heat: bump(base.byHazard.heat),
    storm: bump(base.byHazard.storm),
  }
  const composite = Math.round(
    (byHazard.flood + byHazard.drought + byHazard.heat + byHazard.storm) / 4,
  )
  return { composite, byHazard }
}

export type ClimateProjection = ResiHealthCvi & {
  /** ± index-point uncertainty on each hazard (hazard-averaged 1.96·SE·Δyears). */
  band: number
  method: "trend-extrapolation"
  /** Target year minus latest observed year. */
  horizonYears: number
}

/**
 * Trend-extrapolation projection to 2030/2050. For each hazard we OLS-regress its
 * per-year ABSOLUTE index over time and extrapolate `latest + slope·Δyears`
 * (clamped 0..100), with a ±band from the regression slope's standard error.
 * Data-driven and per-facility, but explicitly NOT a climate-model forecast just
 * the observed local trend carried forward, with its uncertainty. Falls back to a
 * flat baseline when the series is empty.
 */
export function projectCviFromTrend(trend: HazardTrendPoint[], year: 2030 | 2050): ClimateProjection {
  const hazards = ["flood", "drought", "heat", "storm"] as const
  if (!trend.length) {
    return {
      composite: 0,
      byHazard: { flood: 0, drought: 0, heat: 0, storm: 0 },
      band: 0,
      method: "trend-extrapolation",
      horizonYears: 0,
    }
  }
  const latestPoint = trend[trend.length - 1]
  const horizon = year - latestPoint.year
  const byHazard = { flood: 0, drought: 0, heat: 0, storm: 0 } as ResiHealthCvi["byHazard"]
  let bandAcc = 0
  for (const h of hazards) {
    const fit = olsFit(trend.map((p) => ({ x: p.year, y: p[h] })))
    byHazard[h] = clamp(Math.round(latestPoint[h] + fit.slope * horizon), 0, 100)
    bandAcc += 1.96 * fit.stdErr * Math.abs(horizon)
  }
  const composite = Math.round(
    (byHazard.flood + byHazard.drought + byHazard.heat + byHazard.storm) / 4,
  )
  return {
    composite,
    byHazard,
    band: Math.round(bandAcc / hazards.length),
    method: "trend-extrapolation",
    horizonYears: horizon,
  }
}

/**
 * Climatology baseline range for v2 calibration: ~30 complete calendar years of
 * MONTHLY NASA POWER data (the WMO-normal length; NASA POWER monthly begins
 * 1981). This is the local distribution each hazard's anomaly percentile is
 * measured against. Kept separate from rangeForPreset (the user-selectable
 * Climate Outlook presets) so display ranges and the calibration baseline evolve
 * independently.
 */
export function climatologyRange(now: Date = new Date()): ResolvedRange {
  const endYear = now.getFullYear() - 1
  const startYear = endYear - 29
  return { temporal: "monthly", start: String(startYear), end: String(endYear), startYear, endYear }
}
