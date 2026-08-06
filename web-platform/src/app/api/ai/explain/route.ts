/**
 * Server proxy for the AI prediction explainer. Reads AI_SERVICE_URL server-side
 * and POSTs to /explain. Session-gated like the other AI routes. POST because the
 * context can carry arrays (e.g. RUL top factors).
 */
import { z } from "zod"
import { getServerSession } from "next-auth"

import { authOptions } from "@/lib/auth/config"
import { AiExplainServerError, fetchAiExplanationServer } from "@/lib/ai/explain-server"

export const runtime = "nodejs"

const BodySchema = z.object({
  metric: z.enum(["composite_hazard", "climate_hazard", "solar_yield", "battery_rul", "anomaly"]),
  value: z.number().optional(),
  unit: z.string().max(16).optional(),
  lang: z.enum(["en", "sw"]).optional(),
  context: z.record(z.string(), z.unknown()).optional(),
})

function errorResponse(code: string, message: string, status: number) {
  return Response.json({ error: { code, message } }, { status })
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return errorResponse("unauthorized", "Sign in required", 401)

  const raw = await request.json().catch(() => null)
  const parsed = BodySchema.safeParse(raw)
  if (!parsed.success) {
    return errorResponse(
      "invalid_body",
      parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
      400,
    )
  }

  try {
    const result = await fetchAiExplanationServer({ ...parsed.data, timeoutMs: 60_000 })
    return Response.json(result, { headers: { "Cache-Control": "private, max-age=300" } })
  } catch (err) {
    if (err instanceof AiExplainServerError) {
      return errorResponse("upstream_error", err.message, err.status === 503 ? 503 : 502)
    }
    return errorResponse("upstream_unreachable", "AI service did not respond in time", 504)
  }
}
