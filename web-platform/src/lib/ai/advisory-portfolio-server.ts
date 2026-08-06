/**
 * Server-side client for the AI service's fleet-level advisory narrative.
 * Reads AI_SERVICE_URL (server-only) and POSTs a pre-ranked portfolio summary
 * to FastAPI /predict/portfolio-advisory. Used by computePortfolioAdvisory().
 */
import { env } from "@/lib/env"

export type PortfolioAdvisoryFacilitySummary = {
  name: string
  rul_days?: number
  status?: string
  anomalies?: number
  hazard_composite?: number
}

export type PortfolioAdvisorySummary = {
  n_facilities: number
  n_at_risk: number
  avg_rul_days?: number
  total_anomalies?: number
  top: PortfolioAdvisoryFacilitySummary[]
}

export type PortfolioAdvisoryNarrative = {
  advisory: string
  source: "llm" | "fallback"
  model?: string
  generated_at: string
}

export class AiPortfolioAdvisoryServerError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = "AiPortfolioAdvisoryServerError"
    this.status = status
  }
}

export async function fetchPortfolioAdvisoryServer(
  summary: PortfolioAdvisorySummary,
  timeoutMs = 60_000,
): Promise<PortfolioAdvisoryNarrative> {
  const base = (env.AI_SERVICE_URL ?? "http://localhost:8000").replace(/\/$/, "")
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(`${base}/predict/portfolio-advisory`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(summary),
      signal: controller.signal,
      cache: "no-store",
    })
    const json = await res.json().catch(() => null)
    if (!res.ok) {
      throw new AiPortfolioAdvisoryServerError(
        json?.detail || `AI service responded ${res.status}`, res.status)
    }
    return json as PortfolioAdvisoryNarrative
  } finally {
    clearTimeout(timeout)
  }
}
