/**
 * GET|POST /api/cron/generate-climate-alerts
 *
 * Secret-authenticated trigger for the climate alert scan so it can run on a
 * schedule WITHOUT an admin session. Runs the same logic as the admin
 * "Run climate scan" button (runClimateAlertScan): evaluates real NASA POWER
 * hazard exposure per facility and writes device_alerts rows.
 *
 * Auth: Authorization: Bearer <CRON_SECRET> (same env var as
 * /api/cron/subscription-reminders). Returns the same summary shape as
 * POST /api/admin/intelligence/generate-alerts.
 *
 * Schedule example (daily 06:00):
 *   curl -X POST https://<host>/api/cron/generate-climate-alerts \
 *     -H "Authorization: Bearer $CRON_SECRET"
 * Preview without writing: add ?dryRun=1 (GET) or { "dryRun": true } (POST).
 */
import { NextRequest, NextResponse } from "next/server"
import { runClimateAlertScan } from "@/lib/intelligence/run-climate-alert-scan"

export const dynamic = "force-dynamic"
export const revalidate = 0

const CRON_SECRET = process.env.CRON_SECRET || "your-cron-secret-key"

function isAuthorized(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization")
  return authHeader === `Bearer ${CRON_SECRET}`
}

export async function GET(request: NextRequest) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const dryRun = ["1", "true"].includes((new URL(request.url).searchParams.get("dryRun") || "").toLowerCase())
    const result = await runClimateAlertScan({ dryRun })
    return NextResponse.json(result)
  } catch (error) {
    console.error("[cron/generate-climate-alerts GET]", error)
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
    const result = await runClimateAlertScan({ dryRun })
    return NextResponse.json(result)
  } catch (error) {
    console.error("[cron/generate-climate-alerts POST]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
