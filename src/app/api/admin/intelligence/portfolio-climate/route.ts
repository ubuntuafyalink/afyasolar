/**
 * GET /api/admin/intelligence/portfolio-climate
 *
 * Real NASA POWER climate exposure for every facility, aggregated for the admin
 * Resilience Intelligence dashboard. The heavy lifting (coordinate dedupe,
 * bounded concurrency, degraded fallback, shared 6h cache) lives in
 * computePortfolioClimate so the alert engine can reuse the exact same path.
 *
 * Auth: admin only. Read-only.
 */
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/config"
import { computePortfolioClimate } from "@/lib/climate/portfolio-climate-server"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const data = await computePortfolioClimate()
    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("[admin/intelligence/portfolio-climate GET]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
