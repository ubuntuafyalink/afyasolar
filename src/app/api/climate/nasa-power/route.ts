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

const ALLOWED_PARAMETERS = ["T2M_MAX", "PRECTOTCORR", "WS10M", "ALLSKY_SFC_SW_DWN"] as const
const ALLOWED = new Set<string>(ALLOWED_PARAMETERS)

const UPSTREAM_TIMEOUT_MS = 8000
const REVALIDATE_SECONDS = 21600 // 6 hours

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

  const upstreamParams = new URLSearchParams({
    parameters: params.join(","),
    community: "RE",
    latitude: String(lat),
    longitude: String(lon),
    start,
    end,
    format: "JSON",
  })
  const sourceUrl = `https://power.larc.nasa.gov/api/temporal/${temporal}/point?${upstreamParams.toString()}`

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS)
  let upstream: Response
  try {
    upstream = await fetch(sourceUrl, {
      signal: controller.signal,
      next: { revalidate: REVALIDATE_SECONDS },
    })
  } catch {
    return errorResponse("upstream_unreachable", "NASA POWER did not respond in time", 504)
  } finally {
    clearTimeout(timeout)
  }

  if (!upstream.ok) {
    return errorResponse("upstream_error", `NASA POWER returned status ${upstream.status}`, 502)
  }

  let raw: unknown
  try {
    raw = await upstream.json()
  } catch {
    return errorResponse("parse_error", "Could not parse the NASA POWER response", 502)
  }

  const root = raw as {
    header?: { fill_value?: number }
    properties?: { parameter?: Record<string, Record<string, unknown>> }
  }
  const fillValue = typeof root?.header?.fill_value === "number" ? root.header.fill_value : -999
  const parameter = root?.properties?.parameter ?? {}

  const series: Record<string, { date: string; value: number }[]> = {}
  for (const p of params) {
    const table = parameter[p] ?? {}
    const points: { date: string; value: number }[] = []
    for (const [key, value] of Object.entries(table)) {
      if (typeof value !== "number") continue
      if (value === fillValue || value === -999) continue
      if (temporal === "monthly") {
        // Keep monthly keys YYYYMM with MM 01..12; drop the YYYY13 annual roll-up.
        const month = Number(key.slice(4, 6))
        if (!(month >= 1 && month <= 12)) continue
      }
      points.push({ date: key, value })
    }
    points.sort((a, b) => a.date.localeCompare(b.date))
    series[p] = points
  }

  return Response.json({ temporal, params, series, sourceUrl })
}
