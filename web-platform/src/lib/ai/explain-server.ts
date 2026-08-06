/**
 * Server-side client for the AI service's prediction explainer.
 * Reads AI_SERVICE_URL (server-only) and POSTs to FastAPI /explain.
 * Used by the /api/ai/explain proxy.
 */
import { env } from "@/lib/env"

import type { AiExplanation, ExplainMetric } from "./explain-service"

export class AiExplainServerError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = "AiExplainServerError"
    this.status = status
  }
}

export async function fetchAiExplanationServer(args: {
  metric: ExplainMetric
  value?: number
  unit?: string
  lang?: "en" | "sw"
  context?: Record<string, unknown>
  timeoutMs?: number
}): Promise<AiExplanation> {
  const base = (env.AI_SERVICE_URL ?? "http://localhost:8000").replace(/\/$/, "")
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), args.timeoutMs ?? 60_000)
  try {
    const res = await fetch(`${base}/explain`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        metric: args.metric,
        value: args.value,
        unit: args.unit,
        lang: args.lang ?? "en",
        context: args.context,
      }),
      signal: controller.signal,
      cache: "no-store",
    })
    const json = await res.json().catch(() => null)
    if (!res.ok) {
      throw new AiExplainServerError(json?.detail || `AI service responded ${res.status}`, res.status)
    }
    return json as AiExplanation
  } finally {
    clearTimeout(timeout)
  }
}
