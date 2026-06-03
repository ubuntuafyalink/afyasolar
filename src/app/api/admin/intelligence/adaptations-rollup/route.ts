/**
 * GET /api/admin/intelligence/adaptations-rollup
 *
 * Real climate-adaptation measures across the portfolio, from the
 * `facility_climate_adaptation` table joined to `facilities`. Powers the admin
 * Adaptation Pipeline section. Read-only; admin only. Returns empty arrays when
 * no measures have been recorded yet (honest empty state - the mock's
 * "resilience gain points" concept has no real column and is dropped).
 */
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/config"
import { getRawConnection } from "@/lib/db"
import type { RowDataPacket } from "mysql2"

export const dynamic = "force-dynamic"

type AdaptationRow = RowDataPacket & {
  id: string
  facilityId: string
  facilityName: string | null
  region: string | null
  riskCategory: string
  recommendation: string
  status: string
  implementedAt: Date | string | null
  createdAt: Date | string | null
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const pool = getRawConnection()
    const [rows] = await pool.query<AdaptationRow[]>(
      `SELECT
        a.id AS id,
        a.facility_id AS facilityId,
        f.name AS facilityName,
        f.region AS region,
        a.risk_category AS riskCategory,
        a.recommendation AS recommendation,
        a.status AS status,
        a.implemented_at AS implementedAt,
        a.created_at AS createdAt
      FROM facility_climate_adaptation a
      LEFT JOIN facilities f ON f.id = a.facility_id
      ORDER BY a.created_at DESC`,
    )

    const items = (rows || []).map((r) => ({
      id: r.id,
      facilityId: r.facilityId,
      facilityName: r.facilityName,
      region: r.region,
      riskCategory: r.riskCategory,
      recommendation: r.recommendation,
      status: r.status,
      implementedAt: r.implementedAt ? new Date(r.implementedAt as Date).toISOString() : null,
      createdAt: r.createdAt ? new Date(r.createdAt as Date).toISOString() : null,
    }))

    const byStatus: Record<string, number> = {}
    const byRiskCategoryMap = new Map<string, number>()
    const facilitySet = new Set<string>()
    for (const it of items) {
      byStatus[it.status] = (byStatus[it.status] ?? 0) + 1
      byRiskCategoryMap.set(it.riskCategory, (byRiskCategoryMap.get(it.riskCategory) ?? 0) + 1)
      facilitySet.add(it.facilityId)
    }
    const byRiskCategory = [...byRiskCategoryMap.entries()]
      .map(([riskCategory, count]) => ({ riskCategory, count }))
      .sort((a, b) => b.count - a.count)

    return NextResponse.json({
      success: true,
      data: {
        items,
        byStatus,
        byRiskCategory,
        totalFacilitiesWithAdaptations: facilitySet.size,
      },
    })
  } catch (error) {
    console.error("[admin/intelligence/adaptations-rollup GET]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
