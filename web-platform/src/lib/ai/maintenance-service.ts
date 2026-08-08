/**
 * Client-side helper + types for the AI service's predictive maintenance
 * (battery RUL + anomaly). The browser calls the internal /api/ai/maintenance
 * proxy, which forwards to the FastAPI /predict/maintenance endpoint.
 * Client-safe: no env / server-only imports.
 */

export type RulFactor = { feature: string; importance: number; value: number }

export type AiMaintenance = {
  facility_id: string
  based_on: "simulated" | "provided"
  rul: {
    rul_days: number
    eol_soh: number
    importance_method: string
    top_factors: RulFactor[]
  }
  anomaly: {
    n: number
    recent: { anomaly: boolean; score: number }[]
  }
  health: { status: "critical" | "warning" | "healthy"; note: string }
  generated_at: string
}

export type FetchAiMaintenanceArgs = {
  facilityId: string
  ageDays?: number
  systemKw?: number
}

export async function fetchAiMaintenance(args: FetchAiMaintenanceArgs): Promise<AiMaintenance> {
  const params = new URLSearchParams({ facility_id: args.facilityId })
  if (args.ageDays != null) params.set("age_days", String(Math.round(args.ageDays)))
  if (args.systemKw != null) params.set("system_kw", String(args.systemKw))

  const res = await fetch(`/api/ai/maintenance?${params.toString()}`)
  const json = await res.json().catch(() => null)
  if (!res.ok) {
    throw new Error(json?.error?.message || `Maintenance prediction failed (${res.status})`)
  }
  return json as AiMaintenance
}
