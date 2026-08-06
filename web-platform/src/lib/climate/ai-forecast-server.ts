/**
 * Server-side client for the AI service's climate forecast.
 *
 * Reads AI_SERVICE_URL (server-only) and POSTs to the FastAPI /predict/climate
 * endpoint. Used by the /api/ai/forecast proxy (single point) and by the admin
 * portfolio-forecast compute (many points). Mirrors nasa-power-server.ts.
 */
import { env } from "@/lib/env"

import type { AiClimateForecast } from "./ai-forecast-service"

export class AiForecastServerError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = "AiForecastServerError"
    this.status = status
  }
}

export async function fetchAiClimateForecastServer(args: {
  lat: number
  lon: number
  horizon?: "daily" | "monthly"
  systemKw?: number
  months?: number
  timeoutMs?: number
}): Promise<AiClimateForecast> {
  const base = (env.AI_SERVICE_URL ?? "http://localhost:8000").replace(/\/$/, "")
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), args.timeoutMs ?? 60_000)
  try {
    const res = await fetch(`${base}/predict/climate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lat: args.lat,
        lon: args.lon,
        horizon: args.horizon ?? "monthly",
        system_kw: args.systemKw,
        months: args.months,
      }),
      signal: controller.signal,
      cache: "no-store",
    })
    const json = await res.json().catch(() => null)
    if (!res.ok) {
      throw new AiForecastServerError(json?.detail || `AI service responded ${res.status}`, res.status)
    }
    return json as AiClimateForecast
  } finally {
    clearTimeout(timeout)
  }
}
