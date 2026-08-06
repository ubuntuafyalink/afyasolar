/**
 * Client-side helper + types for the AI prediction explainer. The browser calls
 * the internal /api/ai/explain proxy, which forwards to FastAPI /explain.
 * Educational and scoped to a single metric (distinct from the advisory).
 * Client-safe: no env / server-only imports.
 */

export type ExplainMetric =
  | "composite_hazard"
  | "climate_hazard"
  | "solar_yield"
  | "battery_rul"
  | "anomaly"

export type AiExplanation = {
  explanation: string
  source: "llm" | "fallback"
  model?: string
  meaning: { band: string; label: string }
}

export type FetchAiExplanationArgs = {
  metric: ExplainMetric
  value?: number
  unit?: string
  lang?: "en" | "sw"
  context?: Record<string, unknown>
}

export async function fetchAiExplanation(args: FetchAiExplanationArgs): Promise<AiExplanation> {
  const res = await fetch("/api/ai/explain", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(args),
  })
  const json = await res.json().catch(() => null)
  if (!res.ok) {
    throw new Error(json?.error?.message || `Explanation failed (${res.status})`)
  }
  return json as AiExplanation
}
