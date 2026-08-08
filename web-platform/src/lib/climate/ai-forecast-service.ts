/**
 * Client-side helper + types for the AI service's climate forecast.
 *
 * The browser never calls the AI service directly — it goes through the internal
 * proxy at /api/ai/forecast (which reads AI_SERVICE_URL server-side and POSTs to
 * the FastAPI service's /predict/climate). This mirrors open-meteo.ts's
 * fetchOpenMeteoForecast wrapper. Client-safe: no env / server-only imports.
 */

export type AiHazards = {
  heat: number
  flood: number
  storm: number
  drought: number
  composite: number
  normalization_version: string
}

export type AiForecastPoint = {
  timestamp: string
  mean?: number
  // Chronos returns quantiles too; q0.1/q0.9 give the uncertainty band.
  "q0.1"?: number
  "q0.9"?: number
}

export type HazardTrajectoryPoint = {
  timestamp: string
  heat: number
  flood: number
  storm: number
  drought: number
}

export type AiYield = {
  system_kw: number
  performance_ratio: number
  total_kwh: number
  mean_daily_kwh: number
  steps: number
  generation_kwh_per_step: number[]
}

export type AiClimateForecast = {
  location_id: string
  distance_km: number | null
  horizon: "daily" | "monthly"
  hazards: AiHazards
  hazards_monthly?: HazardTrajectoryPoint[]
  forecast_raw: Record<string, AiForecastPoint[]>
  model_used?: string
  model_name?: string
  generated_at: string
  yield?: AiYield
}

/** Human label for the served AutoGluon model name (e.g. "ChronosFineTuned[bolt_small]"). */
export function modelLabel(model?: string): string {
  if (!model) return "Chronos"
  if (/finetuned/i.test(model)) return "Chronos fine-tuned"
  if (/zeroshot/i.test(model)) return "Chronos zero-shot"
  if (/seasonalnaive/i.test(model)) return "Seasonal baseline"
  return model
}

export type FetchAiForecastArgs = {
  lat: number
  lon: number
  horizon?: "daily" | "monthly"
  systemKw?: number
}

/** Call the internal /api/ai/forecast proxy (which forwards to the AI service). */
export async function fetchAiForecast(args: FetchAiForecastArgs): Promise<AiClimateForecast> {
  const params = new URLSearchParams({
    lat: String(args.lat),
    lon: String(args.lon),
    horizon: args.horizon ?? "monthly",
  })
  if (args.systemKw != null) params.set("system_kw", String(args.systemKw))

  const res = await fetch(`/api/ai/forecast?${params.toString()}`)
  const json = await res.json().catch(() => null)
  if (!res.ok) {
    throw new Error(json?.error?.message || `AI forecast failed (${res.status})`)
  }
  return json as AiClimateForecast
}
