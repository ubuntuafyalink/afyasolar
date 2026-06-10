/**
 * POST /api/admin/intelligence/generate-alerts
 *
 * Climate alert engine (admin-session entry point for the "Run climate scan"
 * button). Evaluates real NASA POWER hazard exposure per facility against the
 * climate-alert rules and writes real device_alerts rows. The scan logic lives in
 * runClimateAlertScan (shared with the secret-auth cron trigger at
 * /api/cron/generate-climate-alerts). Pass { dryRun: true } to preview.
 *
 * Auth: admin only.
 */
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/config"
import { runClimateAlertScan } from "@/lib/intelligence/run-climate-alert-scan"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const dryRun = Boolean(body?.dryRun)

    const result = await runClimateAlertScan({ dryRun })
    return NextResponse.json(result)
  } catch (error) {
    console.error("[admin/intelligence/generate-alerts POST]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
