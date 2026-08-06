/**
 * Open-Meteo near-term forecast integration (spec §6.4 / §8.3).
 *
 * NASA POWER supplies the historical climate BASELINE (reanalysis); Open-Meteo
 * supplies the near-term FORECAST that anticipatory action triggers against.
 * Free, no API key. Raw daily forecast is normalized into the same hazard
 * vocabulary (heat / flood / storm / drought, 0..100) the rest of the app uses,
 * so a forecast can be compared directly to the baseline exposure.
 *
 * The normalizer is a pure function (unit-tested); the fetch wrapper is a thin
 * client for the server proxy at /api/climate/open-meteo.
 */

export const OPEN_METEO_DAILY_VARS = [
  "temperature_2m_max",
  "precipitation_sum",
  "wind_speed_10m_max",
] as const

/** Same reference bounds as the NASA POWER normalization, for comparability. */
const HEAT_BOUNDS = [20, 42] as const
const FLOOD_BOUNDS = [0, 80] as const // mm/day
const STORM_BOUNDS = [0, 15] as const // m/s
const DRY_THRESHOLD_MM = 1

export type OpenMeteoDaily = {
  time: string[]
  temperature_2m_max?: (number | null)[]
  precipitation_sum?: (number | null)[]
  wind_speed_10m_max?: (number | null)[]
}

export type OpenMeteoResponse = { daily?: OpenMeteoDaily }

export type HazardForecast = {
  flood: number
  drought: number
  heat: number
  storm: number
}

export type OpenMeteoForecast = {
  source: string
  days: number
  window: { start: string | null; end: string | null }
  byHazard: HazardForecast
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n))
}

function indexFrom(value: number, min: number, max: number): number {
  if (max === min) return 0
  return Math.round(clamp(((value - min) / (max - min)) * 100, 0, 100))
}

function finite(xs: (number | null | undefined)[] | undefined): number[] {
  return (xs ?? []).filter((v): v is number => typeof v === "number" && Number.isFinite(v))
}

function maxOf(xs: number[]): number | null {
  return xs.length ? Math.max(...xs) : null
}

function meanOf(xs: number[]): number | null {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null
}

/** Longest run of consecutive days with precipitation below the dry threshold. */
function longestDryRun(precip: number[]): number {
  let run = 0
  let best = 0
  for (const p of precip) {
    if (p < DRY_THRESHOLD_MM) {
      run += 1
      best = Math.max(best, run)
    } else {
      run = 0
    }
  }
  return best
}

/**
 * Normalize a raw Open-Meteo daily forecast into 0..100 hazard indices.
 * heat = mean of daily max temperature; flood = peak daily precipitation;
 * storm = peak daily max wind; drought = longest dry-day run over the window.
 */
export function normalizeOpenMeteoForecast(resp: OpenMeteoResponse): OpenMeteoForecast {
  const daily = resp.daily
  const time = daily?.time ?? []
  const temps = finite(daily?.temperature_2m_max)
  const precip = finite(daily?.precipitation_sum)
  const wind = finite(daily?.wind_speed_10m_max)

  const heatMean = meanOf(temps)
  const floodPeak = maxOf(precip)
  const stormPeak = maxOf(wind)
  const droughtDays = precip.length ? longestDryRun(precip) : 0
  const droughtMax = Math.max(1, precip.length) // window length as the upper bound

  return {
    source: "Open-Meteo daily forecast (near-term, anticipatory)",
    days: time.length,
    window: { start: time[0] ?? null, end: time[time.length - 1] ?? null },
    byHazard: {
      heat: heatMean == null ? 0 : indexFrom(heatMean, HEAT_BOUNDS[0], HEAT_BOUNDS[1]),
      flood: floodPeak == null ? 0 : indexFrom(floodPeak, FLOOD_BOUNDS[0], FLOOD_BOUNDS[1]),
      storm: stormPeak == null ? 0 : indexFrom(stormPeak, STORM_BOUNDS[0], STORM_BOUNDS[1]),
      drought: indexFrom(droughtDays, 0, droughtMax),
    },
  }
}

/** Build the upstream Open-Meteo forecast URL for a coordinate. */
export function openMeteoUrl(lat: number, lon: number, forecastDays = 16): string {
  const sp = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    daily: OPEN_METEO_DAILY_VARS.join(","),
    wind_speed_unit: "ms",
    forecast_days: String(forecastDays),
    timezone: "auto",
  })
  return `https://api.open-meteo.com/v1/forecast?${sp.toString()}`
}

/** Client wrapper: calls our server proxy and returns the normalized forecast. */
export async function fetchOpenMeteoForecast(lat: number, lon: number): Promise<OpenMeteoForecast> {
  const res = await fetch(`/api/climate/open-meteo?lat=${lat}&lon=${lon}`)
  const json: unknown = await res.json().catch(() => null)
  if (!res.ok || (json && typeof json === "object" && "error" in json)) {
    throw new Error("Open-Meteo forecast request failed")
  }
  return json as OpenMeteoForecast
}
