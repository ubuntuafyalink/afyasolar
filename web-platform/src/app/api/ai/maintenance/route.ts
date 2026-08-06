/**
 * Server proxy for the AI service's predictive maintenance (battery RUL +
 * anomaly). Reads AI_SERVICE_URL server-side and POSTs to /predict/maintenance.
 * Session-gated like the other AI routes.
 *
 * Example: /api/ai/maintenance?facility_id=abc&age_days=600&system_kw=6
 */
import { z } from "zod"
import { getServerSession } from "next-auth"

import { authOptions } from "@/lib/auth/config"
import { AiMaintenanceServerError, fetchAiMaintenanceServer } from "@/lib/ai/maintenance-server"

export const runtime = "nodejs"

const QuerySchema = z.object({
  facility_id: z.string().min(1),
  age_days: z.coerce.number().int().positive().optional(),
  system_kw: z.coerce.number().positive().optional(),
})

function errorResponse(code: string, message: string, status: number) {
  return Response.json({ error: { code, message } }, { status })
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return errorResponse("unauthorized", "Sign in required", 401)

  const { searchParams } = new URL(request.url)
  const parsed = QuerySchema.safeParse({
    facility_id: searchParams.get("facility_id") ?? undefined,
    age_days: searchParams.get("age_days") ?? undefined,
    system_kw: searchParams.get("system_kw") ?? undefined,
  })
  if (!parsed.success) {
    return errorResponse(
      "invalid_query",
      parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
      400,
    )
  }

  const { facility_id, age_days, system_kw } = parsed.data
  try {
    const result = await fetchAiMaintenanceServer({
      facilityId: facility_id, ageDays: age_days, systemKw: system_kw, timeoutMs: 60_000,
    })
    return Response.json(result, { headers: { "Cache-Control": "private, max-age=300" } })
  } catch (err) {
    if (err instanceof AiMaintenanceServerError) {
      return errorResponse("upstream_error", err.message, err.status === 503 ? 503 : 502)
    }
    return errorResponse("upstream_unreachable", "AI service did not respond in time", 504)
  }
}
