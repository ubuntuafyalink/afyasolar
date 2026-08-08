/**
 * Server-side client for the AI service's climate outlook report.
 * Reads AI_SERVICE_URL (server-only) and POSTs to FastAPI /predict/outlook-report.
 * Used by the /api/ai/outlook-report proxy.
 */
import { env } from "@/lib/env"

import type { AiOutlookReport, FetchOutlookReportArgs } from "./outlook-report-service"

export class AiOutlookReportServerError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = "AiOutlookReportServerError"
    this.status = status
  }
}

export async function fetchOutlookReportServer(
  args: FetchOutlookReportArgs & { timeoutMs?: number },
): Promise<AiOutlookReport> {
  const base = (env.AI_SERVICE_URL ?? "http://localhost:8000").replace(/\/$/, "")
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), args.timeoutMs ?? 60_000)
  try {
    const res = await fetch(`${base}/predict/outlook-report`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        hazards: args.hazards,
        lang: args.lang ?? "en",
        scope: args.scope ?? "facility",
        context: args.context,
      }),
      signal: controller.signal,
      cache: "no-store",
    })
    const json = await res.json().catch(() => null)
    if (!res.ok) {
      throw new AiOutlookReportServerError(json?.detail || `AI service responded ${res.status}`, res.status)
    }
    return json as AiOutlookReport
  } finally {
    clearTimeout(timeout)
  }
}
