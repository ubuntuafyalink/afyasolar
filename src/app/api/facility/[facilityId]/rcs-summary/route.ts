import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { and, desc, eq } from "drizzle-orm"

import { authOptions } from "@/lib/auth/config"
import { db } from "@/lib/db"
import { assessmentCycles, climateScoreSummaries } from "@/lib/db/schema"

export const dynamic = "force-dynamic"
export const revalidate = 0

/**
 * GET /api/facility/[facilityId]/rcs-summary
 *
 * Returns the facility's MOST RECENT persisted CRiPHC score summary (the real,
 * assessed Resilience Capacity Score), or { summary: null } when the facility has
 * never completed a climate assessment. This is the source the facility RCS
 * "Why this score" section reads so the headline reflects the real assessment
 * instead of a seeded preview.
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

    // Latest summary for the facility: join the summary to its cycle, filter by
    // facility, newest first. A facility can have multiple assessment cycles; we
    // surface the most recently updated scored one.
    const rows = await db
      .select({
        summaryId: climateScoreSummaries.id,
        assessmentCycleId: climateScoreSummaries.assessmentCycleId,
        hes: climateScoreSummaries.hes,
        csf: climateScoreSummaries.csf,
        ecpq: climateScoreSummaries.ecpq,
        edc: climateScoreSummaries.edc,
        rrc: climateScoreSummaries.rrc,
        rcs: climateScoreSummaries.rcs,
        tier: climateScoreSummaries.tier,
        formulaVersion: climateScoreSummaries.formulaVersion,
        criticalAttention: climateScoreSummaries.criticalAttention,
        assessedAt: climateScoreSummaries.updatedAt,
        cycleStatus: assessmentCycles.status,
      })
      .from(climateScoreSummaries)
      .innerJoin(
        assessmentCycles,
        eq(climateScoreSummaries.assessmentCycleId, assessmentCycles.id),
      )
      .where(and(eq(assessmentCycles.facilityId, facilityId)))
      .orderBy(desc(climateScoreSummaries.updatedAt))
      .limit(1)

    const row = rows[0]
    if (!row) return NextResponse.json({ summary: null })

    const num = (v: unknown): number =>
      v != null && !Number.isNaN(Number(v)) ? Number(v) : 0

    return NextResponse.json({
      summary: {
        assessmentCycleId: row.assessmentCycleId,
        cycleStatus: row.cycleStatus,
        hes: num(row.hes),
        csf: num(row.csf),
        ecpq: num(row.ecpq),
        edc: num(row.edc),
        rrc: num(row.rrc),
        rcs: num(row.rcs),
        tier: row.tier != null ? Number(row.tier) : null,
        formulaVersion: row.formulaVersion ?? null,
        // HES is derived from real NASA climate whenever the formula carries a
        // climate normalization stamp (see the assessment-cycle climate POST).
        hesFromClimate: typeof row.formulaVersion === "string" && row.formulaVersion.includes("climate-"),
        criticalAttention: Boolean(row.criticalAttention),
        assessedAt: row.assessedAt ?? null,
      },
    })
  } catch (error) {
    console.error("[facility rcs-summary GET]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
