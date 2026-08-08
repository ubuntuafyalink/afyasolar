/**
 * Server proxy for the AI service's climate forecast.
 *
 * Reads AI_SERVICE_URL server-side and POSTs to the FastAPI /predict/climate
 * endpoint (Chronos zero-shot). Session-gated like the other AI routes. Mirrors
 * the Open-Meteo proxy's validation + error-mapping conventions.
 *
 * Example: /api/ai/forecast?lat=-6.79&lon=39.21&horizon=monthly&system_kw=6
 */
import { z } from "zod"
import { getServerSession } from "next-auth"

import { authOptions } from "@/lib/auth/config"
import { AiForecastServerError, fetchAiClimateForecastServer } from "@/lib/climate/ai-forecast-server"

export const runtime = "nodejs"

const QuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lon: z.coerce.number().min(-180).max(180),
  horizon: z.enum(["daily", "monthly"]).default("monthly"),
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
    lat: searchParams.get("lat") ?? undefined,
    lon: searchParams.get("lon") ?? undefined,
    horizon: searchParams.get("horizon") ?? undefined,
    system_kw: searchParams.get("system_kw") ?? undefined,
  })
  if (!parsed.success) {
    return errorResponse(
      "invalid_query",
      parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
      400,
    )
  }

  const { lat, lon, horizon, system_kw } = parsed.data

  try {
    // Chronos CPU inference is fast once warm, but the first call after an
    // AI-service restart may wait behind the predictor warm-up load (~60-90s).
    const forecast = await fetchAiClimateForecastServer({
      lat, lon, horizon, systemKw: system_kw, timeoutMs: 150_000,
    })
    return Response.json(forecast, { headers: { "Cache-Control": "private, max-age=300" } })
  } catch (err) {
    if (err instanceof AiForecastServerError) {
      // Pass 503 (model not ready) through so the UI can show "warming up"; else 502.
      return errorResponse("upstream_error", err.message, err.status === 503 ? 503 : 502)
    }
    return errorResponse("upstream_unreachable", "AI service did not respond in time", 504)
  }
}
