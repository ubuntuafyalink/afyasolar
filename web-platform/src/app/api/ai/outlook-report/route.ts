/**
 * Server proxy for the climate outlook report. Reads AI_SERVICE_URL server-side
 * and POSTs to /predict/outlook-report. Session-gated like the other AI routes.
 * The body carries already-computed hazard scores, so no forecast is re-run.
 */
import { z } from "zod"
import { getServerSession } from "next-auth"

import { authOptions } from "@/lib/auth/config"
import { AiOutlookReportServerError, fetchOutlookReportServer } from "@/lib/ai/outlook-report-server"

export const runtime = "nodejs"

const score = z.number().int().min(0).max(100)

const BodySchema = z.object({
  hazards: z.object({
    heat: score,
    flood: score,
    storm: score,
    drought: score,
    composite: score,
  }),
  lang: z.enum(["en", "sw"]).optional(),
  scope: z.enum(["facility", "portfolio"]).optional(),
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
    const result = await fetchOutlookReportServer({ ...parsed.data, timeoutMs: 60_000 })
    return Response.json(result, { headers: { "Cache-Control": "private, max-age=300" } })
  } catch (err) {
    if (err instanceof AiOutlookReportServerError) {
      return errorResponse("upstream_error", err.message, err.status === 503 ? 503 : 502)
    }
    return errorResponse("upstream_unreachable", "AI service did not respond in time", 504)
  }
}
