/**
 * GET /api/admin/solar/maintenance
 *
 * Portfolio predictive-maintenance summary: RUL + anomaly per facility (via the
 * AI service), aggregated into a "facilities at risk" view. Admin only.
 * Read-only (reads facilities + afyasolar_subscribers; no writes).
 */
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/config"
import { computePortfolioMaintenance } from "@/lib/ai/portfolio-maintenance-server"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data, aggregate } = await computePortfolioMaintenance()
    return NextResponse.json(
      { success: true, data, aggregate },
      { headers: { "Cache-Control": "private, max-age=900" } },
    )
  } catch (error) {
    console.error("[admin/solar/maintenance GET]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
