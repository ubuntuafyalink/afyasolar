/**
 * Server proxy for the NASA POWER climate API (free, no API key required).
 *
 * Why proxy instead of calling NASA directly from the client:
 *  - validate and constrain inputs (Zod) before hitting the upstream service,
 *  - cache responses (Next fetch revalidate, 6h) to respect rate limits,
 *  - strip NASA fill values (-999) so the client never sees them,
 *  - apply a request timeout so a slow upstream cannot hang the page.
 *
 * Example:
 *   /api/climate/nasa-power?lat=-6.79&lon=39.21&start=2005&end=2024
 *     &temporal=monthly&parameters=T2M_MAX,PRECTOTCORR,WS10M
 *
 * Reading request.url makes this handler dynamic (per-query); the upstream
 * fetch itself is cached for 6h via { next: { revalidate } }.
 */
import { z } from "zod"
import { fetchNasaPowerServer, NasaPowerServerError } from "@/lib/climate/nasa-power-server"

const ALLOWED_PARAMETERS = ["T2M_MAX", "PRECTOTCORR", "WS10M", "ALLSKY_SFC_SW_DWN"] as const
const ALLOWED = new Set<string>(ALLOWED_PARAMETERS)

const QuerySchema = z
  .object({
    lat: z.coerce.number().min(-90).max(90),
    lon: z.coerce.number().min(-180).max(180),
    temporal: z.enum(["daily", "monthly"]),
    start: z.string().regex(/^\d+$/, "must be digits"),
    end: z.string().regex(/^\d+$/, "must be digits"),
    parameters: z.string().min(1),
  })
  .superRefine((v, ctx) => {
    const len = v.temporal === "daily" ? 8 : 4
    if (v.start.length !== len) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["start"], message: `start must be ${len} digits for ${v.temporal}` })
    }
    if (v.end.length !== len) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["end"], message: `end must be ${len} digits for ${v.temporal}` })
    }
    // Equal-length zero-padded numeric strings compare correctly lexically.
    if (v.start.length === len && v.end.length === len && v.end < v.start) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["end"], message: "end must be on or after start" })
    }
    const params = v.parameters.split(",").map((s) => s.trim()).filter(Boolean)
    if (!params.length) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["parameters"], message: "at least one parameter required" })
    }
    for (const p of params) {
      if (!ALLOWED.has(p)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["parameters"], message: `unknown parameter: ${p}` })
      }
    }
  })

function errorResponse(code: string, message: string, status: number) {
  return Response.json({ error: { code, message } }, { status })
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const parsed = QuerySchema.safeParse({
    lat: searchParams.get("lat") ?? undefined,
    lon: searchParams.get("lon") ?? undefined,
    temporal: searchParams.get("temporal") ?? undefined,
    start: searchParams.get("start") ?? undefined,
    end: searchParams.get("end") ?? undefined,
    parameters: searchParams.get("parameters") ?? undefined,
  })

  if (!parsed.success) {
    return errorResponse("invalid_query", parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "), 400)
  }

  const { lat, lon, temporal, start, end } = parsed.data
  const params = parsed.data.parameters.split(",").map((s) => s.trim()).filter(Boolean)

  try {
    const result = await fetchNasaPowerServer({ lat, lon, temporal, start, end, parameters: params })
    return Response.json(result)
  } catch (err) {
    if (err instanceof NasaPowerServerError) {
      return errorResponse(err.code, err.message, err.status)
    }
    return errorResponse("upstream_unreachable", "NASA POWER did not respond in time", 504)
  }
}
