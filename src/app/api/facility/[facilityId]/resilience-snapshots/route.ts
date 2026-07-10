import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { asc, eq } from "drizzle-orm"

import { authOptions } from "@/lib/auth/config"
import { db } from "@/lib/db"
import { facilityResilienceSnapshot } from "@/lib/db/schema"

export const dynamic = "force-dynamic"
export const revalidate = 0

/**
 * GET /api/facility/[facilityId]/resilience-snapshots
 *
 * Returns the facility's REAL monthly resilience history from
 * facility_resilience_snapshot (written by the assessment POST and the monthly
 * climate-refresh cron), oldest first. The RCS trend chart reads this instead of
 * regenerating a seeded curve; when there is too little real history yet the
 * chart falls back to a clearly-labelled illustrative series.
 *
 * Auth: admin, or a user belonging to this facility.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ facilityId: string }> },
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { facilityId } = await params
    if (!facilityId) return NextResponse.json({ error: "Missing facilityId" }, { status: 400 })

    if (session.user.role !== "admin" && session.user.facilityId !== facilityId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const rows = await db
      .select({
        periodMonth: facilityResilienceSnapshot.periodMonth,
        resilienceScore: facilityResilienceSnapshot.resilienceScore,
        adaptationCompletionPct: facilityResilienceSnapshot.adaptationCompletionPct,
      })
      .from(facilityResilienceSnapshot)
      .where(eq(facilityResilienceSnapshot.facilityId, facilityId))
      .orderBy(asc(facilityResilienceSnapshot.periodMonth))

    const snapshots = rows.map((r) => ({
      periodMonth: r.periodMonth,
      rcs: r.resilienceScore != null ? Math.round(Number(r.resilienceScore)) : 0,
      adaptationCompletionPct:
        r.adaptationCompletionPct != null ? Math.round(Number(r.adaptationCompletionPct)) : null,
    }))

    return NextResponse.json({ snapshots })
  } catch (error) {
    console.error("[facility resilience-snapshots GET]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
