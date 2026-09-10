/**
 * Server-side client for the AI service's predictive maintenance endpoint.
 * Reads AI_SERVICE_URL (server-only) and POSTs to FastAPI /predict/maintenance.
 * Used by the /api/ai/maintenance proxy and the admin portfolio compute.
 */
import { aiServiceBase, aiServiceHeaders } from "@/lib/ai/service-request"

import type { AiMaintenance } from "./maintenance-service"

export class AiMaintenanceServerError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = "AiMaintenanceServerError"
    this.status = status
  }
}

export async function fetchAiMaintenanceServer(args: {
  facilityId: string
  ageDays?: number
  systemKw?: number
  timeoutMs?: number
}): Promise<AiMaintenance> {
  const base = aiServiceBase()
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), args.timeoutMs ?? 60_000)
  try {
    const res = await fetch(`${base}/predict/maintenance`, {
      method: "POST",
      headers: aiServiceHeaders(),
      body: JSON.stringify({
        facility_id: args.facilityId,
        age_days: args.ageDays != null ? Math.round(args.ageDays) : undefined,
        system_kw: args.systemKw,
      }),
      signal: controller.signal,
      cache: "no-store",
    })
    const json = await res.json().catch(() => null)
    if (!res.ok) {
      throw new AiMaintenanceServerError(json?.detail || `AI service responded ${res.status}`, res.status)
    }
    return json as AiMaintenance
  } finally {
    clearTimeout(timeout)
  }
}
