/**
 * Client-side helper + types for the AI service's LLM advisory. The advisory
 * composes the engine's outputs (climate hazards, solar yield, battery RUL,
 * anomalies) into a plain-language recommendation for a facility manager.
 *
 * The browser calls the internal /api/ai/advisory proxy, which forwards to the
 * FastAPI /predict/advisory endpoint. Client-safe: no env / server-only imports.
 */

export type AiAdvisoryHazards = {
  composite?: number
  heat?: number
  flood?: number
  storm?: number
  drought?: number
}

export type AiAdvisory = {
  advisory: string
  source: "llm" | "fallback"
  model?: string
  inputs: {
    hazards?: AiAdvisoryHazards
    mean_daily_kwh?: number
    rul_days?: number
    health?: { status: "critical" | "warning" | "healthy"; note: string }
    anomalies?: number
  }
  generated_at: string
}

export type FetchAiAdvisoryArgs = {
  facilityId: string
  lat?: number
  lon?: number
  ageDays?: number
  systemKw?: number
}

export async function fetchAiAdvisory(args: FetchAiAdvisoryArgs): Promise<AiAdvisory> {
  const params = new URLSearchParams({ facility_id: args.facilityId })
  if (args.lat != null) params.set("lat", String(args.lat))
  if (args.lon != null) params.set("lon", String(args.lon))
  if (args.ageDays != null) params.set("age_days", String(Math.round(args.ageDays)))
  if (args.systemKw != null) params.set("system_kw", String(args.systemKw))

  const res = await fetch(`/api/ai/advisory?${params.toString()}`)
  const json = await res.json().catch(() => null)
  if (!res.ok) {
    throw new Error(json?.error?.message || `Advisory generation failed (${res.status})`)
  }
  return json as AiAdvisory
}
