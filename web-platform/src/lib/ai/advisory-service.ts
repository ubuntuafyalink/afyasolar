/**
 * Client-side helper + types for the FACILITY operations advisory. It fuses this
 * facility's own signals — solar yield (power), climate hazards, battery health,
 * and its medical-equipment load — into a single-facility recommendation covering
 * power, climate, medical equipment, and system health & energy security.
 *
 * The browser POSTs to the internal /api/ai/advisory proxy (which scopes a
 * facility user to their own facility and forwards to FastAPI /predict/advisory).
 * Client-safe: no env / server-only imports.
 */

export type AiAdvisoryHazards = {
  composite?: number
  heat?: number
  flood?: number
  storm?: number
  drought?: number
}

export type AiAdvisoryMedical = {
  total_daily_load?: number
  peak_load_kw?: number
  criticality?: { critical?: number; essential?: number; non_essential?: number }
  top_critical_devices?: string[]
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
    battery_level?: number
    medical?: AiAdvisoryMedical
    energy_balance?: { expected_kwh: number; load_kwh: number; covers_load: boolean }
  }
  generated_at: string
}

export type FetchAiAdvisoryArgs = {
  facilityId: string
  lat?: number
  lon?: number
  ageDays?: number
  systemKw?: number
  batteryLevel?: number
  lang?: "en" | "sw"
  medical?: AiAdvisoryMedical
}

export async function fetchAiAdvisory(args: FetchAiAdvisoryArgs): Promise<AiAdvisory> {
  const res = await fetch("/api/ai/advisory", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      facility_id: args.facilityId,
      lat: args.lat,
      lon: args.lon,
      age_days: args.ageDays != null ? Math.round(args.ageDays) : undefined,
      system_kw: args.systemKw,
      battery_level: args.batteryLevel,
      lang: args.lang,
      medical: args.medical,
    }),
  })
  const json = await res.json().catch(() => null)
  if (!res.ok) {
    throw new Error(json?.error?.message || `Advisory generation failed (${res.status})`)
  }
  return json as AiAdvisory
}
