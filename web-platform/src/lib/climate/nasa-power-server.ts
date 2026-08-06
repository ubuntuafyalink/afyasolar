/**
 * Server-side NASA POWER fetch + normalize, shared by:
 *  - the public proxy route /api/climate/nasa-power (client-facing), and
 *  - the admin portfolio-climate aggregation route (server-to-server).
 *
 * This is the single place that talks to power.larc.nasa.gov: it applies the
 * 8s timeout, the 6h Next fetch cache (revalidate), strips NASA fill values
 * (-999), and shapes the raw response into NasaPowerResponse. Keeping one path
 * means the admin loop reuses the same upstream cache as the facility UI rather
 * than issuing a second, uncached request per coordinate.
 *
 * Data source: https://power.larc.nasa.gov/  (community = RE)
 */
import type { NasaPowerResponse, Temporal } from "@/lib/climate/nasa-power"

export const NASA_ALLOWED_PARAMETERS = [
  "T2M_MAX",
  "PRECTOTCORR",
  "WS10M",
  "ALLSKY_SFC_SW_DWN",
] as const
const ALLOWED = new Set<string>(NASA_ALLOWED_PARAMETERS)

const UPSTREAM_TIMEOUT_MS = 8000
const REVALIDATE_SECONDS = 21600 // 6 hours

export type NasaPowerServerQuery = {
  lat: number
  lon: number
  temporal: Temporal
  start: string
  end: string
  parameters: readonly string[]
}

/** Typed failure so callers can map to HTTP status (proxy) or fall back (admin). */
export class NasaPowerServerError extends Error {
  code: string
  status: number
  constructor(code: string, message: string, status: number) {
    super(message)
    this.name = "NasaPowerServerError"
    this.code = code
    this.status = status
  }
}

/**
 * Fetch and normalize a NASA POWER point query. Inputs are assumed
 * structurally valid (the proxy route validates external input with Zod
 * upstream); we still guard parameter names defensively. Throws
 * NasaPowerServerError on any upstream/parse failure.
 */
export async function fetchNasaPowerServer(
  q: NasaPowerServerQuery,
): Promise<NasaPowerResponse> {
  const params = q.parameters.map((s) => s.trim()).filter(Boolean)
  if (!params.length) {
    throw new NasaPowerServerError("invalid_query", "at least one parameter required", 400)
  }
  for (const p of params) {
    if (!ALLOWED.has(p)) {
      throw new NasaPowerServerError("invalid_query", `unknown parameter: ${p}`, 400)
    }
  }

  const upstreamParams = new URLSearchParams({
    parameters: params.join(","),
    community: "RE",
    latitude: String(q.lat),
    longitude: String(q.lon),
    start: q.start,
    end: q.end,
    format: "JSON",
  })
  const sourceUrl = `https://power.larc.nasa.gov/api/temporal/${q.temporal}/point?${upstreamParams.toString()}`

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS)
  let upstream: Response
  try {
    upstream = await fetch(sourceUrl, {
      signal: controller.signal,
      next: { revalidate: REVALIDATE_SECONDS },
    })
  } catch {
    throw new NasaPowerServerError("upstream_unreachable", "NASA POWER did not respond in time", 504)
  } finally {
    clearTimeout(timeout)
  }

  if (!upstream.ok) {
    throw new NasaPowerServerError("upstream_error", `NASA POWER returned status ${upstream.status}`, 502)
  }

  let raw: unknown
  try {
    raw = await upstream.json()
  } catch {
    throw new NasaPowerServerError("parse_error", "Could not parse the NASA POWER response", 502)
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
      if (q.temporal === "monthly") {
        // Keep monthly keys YYYYMM with MM 01..12; drop the YYYY13 annual roll-up.
        const month = Number(key.slice(4, 6))
        if (!(month >= 1 && month <= 12)) continue
      }
      points.push({ date: key, value })
    }
    points.sort((a, b) => a.date.localeCompare(b.date))
    series[p] = points
  }

  return { temporal: q.temporal, params, series, sourceUrl }
}
