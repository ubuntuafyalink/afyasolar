/**
 * GET|POST /api/cron/refresh-climate
 *
 * Secret-authenticated monthly trigger that refreshes the REAL climate layer for
 * the whole portfolio (refreshPortfolioClimate): upserts facility_climate_profile
 * from live NASA POWER and writes each assessed facility's monthly
 * facility_resilience_snapshot (RCS recombined with a fresh Hazard Exposure).
 *
 * Auth: Authorization: Bearer <CRON_SECRET> (Vercel Cron sets this automatically
 * when the CRON_SECRET env var is present). Same convention as
 * /api/cron/generate-climate-alerts.
 *
 * Preview without writing: ?dryRun=1 (GET) or { "dryRun": true } (POST).
 */
import { NextRequest, NextResponse } from "next/server"
import { refreshPortfolioClimate } from "@/lib/climate/refresh-portfolio-climate"

export const dynamic = "force-dynamic"
export const revalidate = 0
// NASA fetch loop over the portfolio can take a while; allow up to 5 minutes.
export const maxDuration = 300

const CRON_SECRET = process.env.CRON_SECRET || "your-cron-secret-key"

function isAuthorized(request: NextRequest): boolean {
  return request.headers.get("authorization") === `Bearer ${CRON_SECRET}`
}

export async function GET(request: NextRequest) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const dryRun = ["1", "true"].includes(
      (new URL(request.url).searchParams.get("dryRun") || "").toLowerCase(),
    )
    const result = await refreshPortfolioClimate({ dryRun })
    return NextResponse.json(result)
  } catch (error) {
    console.error("[cron/refresh-climate GET]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const body = await request.json().catch(() => ({}))
    const dryRun = Boolean((body as { dryRun?: boolean })?.dryRun)
    const result = await refreshPortfolioClimate({ dryRun })
    return NextResponse.json(result)
  } catch (error) {
    console.error("[cron/refresh-climate POST]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
