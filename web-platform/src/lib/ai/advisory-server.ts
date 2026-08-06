/**
 * Server-side client for the AI service's LLM advisory endpoint.
 * Reads AI_SERVICE_URL (server-only) and POSTs to FastAPI /predict/advisory.
 * Used by the /api/ai/advisory proxy.
 */
import { env } from "@/lib/env"

import type { AiAdvisory } from "./advisory-service"

export class AiAdvisoryServerError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = "AiAdvisoryServerError"
    this.status = status
  }
}

export async function fetchAiAdvisoryServer(args: {
  facilityId: string
  lat?: number
  lon?: number
  ageDays?: number
  systemKw?: number
  timeoutMs?: number
}): Promise<AiAdvisory> {
  const base = (env.AI_SERVICE_URL ?? "http://localhost:8000").replace(/\/$/, "")
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), args.timeoutMs ?? 60_000)
  try {
    const res = await fetch(`${base}/predict/advisory`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        facility_id: args.facilityId,
        lat: args.lat,
        lon: args.lon,
        age_days: args.ageDays != null ? Math.round(args.ageDays) : undefined,
        system_kw: args.systemKw,
      }),
      signal: controller.signal,
      cache: "no-store",
    })
    const json = await res.json().catch(() => null)
    if (!res.ok) {
      throw new AiAdvisoryServerError(json?.detail || `AI service responded ${res.status}`, res.status)
    }
    return json as AiAdvisory
  } finally {
    clearTimeout(timeout)
  }
}
