/**
 * Server proxy for the FACILITY operations advisory (power / climate / medical /
 * system health). Reads AI_SERVICE_URL server-side and POSTs to /predict/advisory.
 * POST because the body carries the medical-load summary.
 *
 * Access control: a facility user can only get THEIR OWN facility's advisory
 * (the session's facilityId overrides whatever is sent). Admins/technicians may
 * request any facility_id. This is a single-facility advisory only — the
 * network/fleet briefing lives at /api/admin/solar/advisory (admin-gated).
 */
import { z } from "zod"
import { getServerSession } from "next-auth"

import { authOptions } from "@/lib/auth/config"
import { AiAdvisoryServerError, fetchAiAdvisoryServer } from "@/lib/ai/advisory-server"

export const runtime = "nodejs"

const BodySchema = z.object({
  facility_id: z.string().min(1),
  lat: z.number().min(-90).max(90).optional(),
  lon: z.number().min(-180).max(180).optional(),
  age_days: z.number().int().positive().optional(),
  system_kw: z.number().positive().optional(),
  battery_level: z.number().min(0).max(100).optional(),
  lang: z.enum(["en", "sw"]).optional(),
  medical: z.record(z.string(), z.unknown()).optional(),
})

function errorResponse(code: string, message: string, status: number) {
  return Response.json({ error: { code, message } }, { status })
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return errorResponse("unauthorized", "Sign in required", 401)

  const raw = await request.json().catch(() => null)
  const parsed = BodySchema.safeParse(raw)
  if (!parsed.success) {
    return errorResponse(
      "invalid_body",
      parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
      400,
    )
  }

  const data = parsed.data
  // Ownership: a facility user is scoped to their own facility, regardless of
  // what facility_id the client sent. Admin/technician may query any facility.
  let facilityId = data.facility_id
  if (session.user.role === "facility") {
    if (!session.user.facilityId) {
      return errorResponse("forbidden", "No facility is associated with this account", 403)
    }
    facilityId = session.user.facilityId
  }

  try {
    const result = await fetchAiAdvisoryServer({
      facilityId,
      lat: data.lat,
      lon: data.lon,
      ageDays: data.age_days,
      systemKw: data.system_kw,
      batteryLevel: data.battery_level,
      lang: data.lang,
      medical: data.medical,
      timeoutMs: 60_000,
    })
    return Response.json(result, { headers: { "Cache-Control": "private, max-age=300" } })
  } catch (err) {
    if (err instanceof AiAdvisoryServerError) {
      return errorResponse("upstream_error", err.message, err.status === 503 ? 503 : 502)
    }
    return errorResponse("upstream_unreachable", "AI service did not respond in time", 504)
  }
}
