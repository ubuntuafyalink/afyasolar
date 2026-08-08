/**
 * GET /api/admin/intelligence/portfolio-forecast
 *
 * Forward-looking AI climate forecast aggregated across all facilities (Chronos
 * zero-shot, via the AI service). Mirrors portfolio-climate but forecasts instead
 * of summarizing history: computePortfolioForecast dedupes coordinates, calls the
 * AI service with bounded concurrency, and facility-weight-averages the hazard
 * outlook + trajectory.
 *
 * Auth: admin only. Read-only (reads facilities; no writes).
 */
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/config"
import { computePortfolioForecast } from "@/lib/climate/portfolio-forecast-server"

export const dynamic = "force-dynamic"

// Allowed forecast windows (months). Anything else falls back to the full horizon.
const ALLOWED_MONTHS = new Set([3, 6, 12])

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const raw = new URL(request.url).searchParams.get("months")
    const parsed = raw != null ? Number(raw) : NaN
    const months = ALLOWED_MONTHS.has(parsed) ? parsed : undefined

    const { data, aggregate } = await computePortfolioForecast(months)
    return NextResponse.json(
      { success: true, data, aggregate },
      { headers: { "Cache-Control": "private, max-age=1800" } },
    )
  } catch (error) {
    console.error("[admin/intelligence/portfolio-forecast GET]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
