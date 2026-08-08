/**
 * GET /api/admin/solar/advisory
 *
 * Portfolio advisory: a plain-language weekly fleet briefing + a ranked list of
 * the facilities needing attention, blending predictive maintenance (battery RUL
 * + anomalies) with the climate outlook (composite hazard). Admin only.
 * Read-only (reuses the maintenance + forecast portfolio computes; no writes).
 */
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/config"
import { computePortfolioAdvisory } from "@/lib/ai/portfolio-advisory-server"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const result = await computePortfolioAdvisory()
    return NextResponse.json(
      { success: true, ...result },
      { headers: { "Cache-Control": "private, max-age=900" } },
    )
  } catch (error) {
    console.error("[admin/solar/advisory GET]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
