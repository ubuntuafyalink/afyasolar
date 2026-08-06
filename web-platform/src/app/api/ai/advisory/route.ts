/**
 * Server proxy for the AI service's LLM advisory. Reads AI_SERVICE_URL
 * server-side and POSTs to /predict/advisory. Session-gated like the other
 * AI routes.
 *
 * Example: /api/ai/advisory?facility_id=abc&lat=-6.79&lon=39.21&age_days=700&system_kw=6
 */
import { z } from "zod"
import { getServerSession } from "next-auth"

import { authOptions } from "@/lib/auth/config"
import { AiAdvisoryServerError, fetchAiAdvisoryServer } from "@/lib/ai/advisory-server"

export const runtime = "nodejs"

const QuerySchema = z.object({
  facility_id: z.string().min(1),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lon: z.coerce.number().min(-180).max(180).optional(),
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
    lat: searchParams.get("lat") ?? undefined,
    lon: searchParams.get("lon") ?? undefined,
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

  const { facility_id, lat, lon, age_days, system_kw } = parsed.data
  try {
    const result = await fetchAiAdvisoryServer({
      facilityId: facility_id, lat, lon, ageDays: age_days, systemKw: system_kw, timeoutMs: 60_000,
    })
    return Response.json(result, { headers: { "Cache-Control": "private, max-age=300" } })
  } catch (err) {
    if (err instanceof AiAdvisoryServerError) {
      return errorResponse("upstream_error", err.message, err.status === 503 ? 503 : 502)
    }
    return errorResponse("upstream_unreachable", "AI service did not respond in time", 504)
  }
}
