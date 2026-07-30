/**
 * Server proxy for the Open-Meteo forecast API (free, no API key).
 *
 * Mirrors the NASA POWER proxy: validate inputs (Zod), cache upstream (6h) to be
 * a good citizen, apply a timeout, and return the NORMALIZED near-term hazard
 * forecast (heat/flood/storm/drought 0..100) rather than raw meteorology — the
 * anticipatory-action signal that pairs with the NASA POWER baseline (§8.3).
 *
 * Example: /api/climate/open-meteo?lat=-6.79&lon=39.21
 */
import { z } from "zod"
import { normalizeOpenMeteoForecast, openMeteoUrl } from "@/lib/climate/open-meteo"

const QuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lon: z.coerce.number().min(-180).max(180),
})

function errorResponse(code: string, message: string, status: number) {
  return Response.json({ error: { code, message } }, { status })
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const parsed = QuerySchema.safeParse({
    lat: searchParams.get("lat") ?? undefined,
    lon: searchParams.get("lon") ?? undefined,
  })

  if (!parsed.success) {
    return errorResponse(
      "invalid_query",
      parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
      400,
    )
  }

  const { lat, lon } = parsed.data

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10_000)
    const res = await fetch(openMeteoUrl(lat, lon), {
      signal: controller.signal,
      next: { revalidate: 60 * 60 * 6 }, // 6h cache
    }).finally(() => clearTimeout(timeout))

    if (!res.ok) {
      return errorResponse("upstream_error", `Open-Meteo responded ${res.status}`, 502)
    }
    const raw = await res.json()
    const forecast = normalizeOpenMeteoForecast(raw)
    return Response.json(forecast, {
      headers: { "Cache-Control": "public, s-maxage=21600, stale-while-revalidate=43200" },
    })
  } catch {
    return errorResponse("upstream_unreachable", "Open-Meteo did not respond in time", 504)
  }
}
