import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { eq } from "drizzle-orm"

import { authOptions } from "@/lib/auth/config"
import { db } from "@/lib/db"
import { facilityEeatAssessment } from "@/lib/db/schema"
import { ensureEeat } from "@/lib/db/ensure-eeat"

export const dynamic = "force-dynamic"
export const revalidate = 0

async function authorize(facilityId: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
  if (session.user.role !== "admin" && session.user.facilityId !== facilityId) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) }
  }
  return { ok: true as const }
}

/** GET the saved EEAT assessment for a facility (or { assessment: null }). */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ facilityId: string }> }) {
  try {
    const { facilityId } = await params
    const auth = await authorize(facilityId)
    if ("error" in auth) return auth.error
    await ensureEeat()

    const [row] = await db
      .select()
      .from(facilityEeatAssessment)
      .where(eq(facilityEeatAssessment.facilityId, facilityId))
      .limit(1)

    if (!row) return NextResponse.json({ assessment: null })
    return NextResponse.json({
      assessment: {
        data: JSON.parse(row.data) as unknown,
        rawScore: row.rawScore != null ? Number(row.rawScore) : null,
        bmiPercent: row.bmiPercent != null ? Number(row.bmiPercent) : null,
        updatedAt: row.updatedAt,
      },
    })
  } catch (error) {
    console.error("[facility eeat GET]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

/** POST to upsert the EEAT assessment. Body: { data: object, rawScore?: number, bmiPercent?: number }. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ facilityId: string }> }) {
  try {
    const { facilityId } = await params
    const auth = await authorize(facilityId)
    if ("error" in auth) return auth.error
    await ensureEeat()

    const body = await req.json().catch(() => null)
    if (!body || typeof body.data !== "object" || body.data == null) {
      return NextResponse.json({ error: "data object required" }, { status: 400 })
    }
    const dataStr = JSON.stringify(body.data).slice(0, 60000)
    const rawScore = typeof body.rawScore === "number" ? String(body.rawScore) : null
    const bmiPercent = typeof body.bmiPercent === "number" ? String(body.bmiPercent) : null

    const existing = await db
      .select({ facilityId: facilityEeatAssessment.facilityId })
      .from(facilityEeatAssessment)
      .where(eq(facilityEeatAssessment.facilityId, facilityId))
      .limit(1)

    if (existing.length > 0) {
      await db
        .update(facilityEeatAssessment)
        .set({ data: dataStr, rawScore, bmiPercent })
        .where(eq(facilityEeatAssessment.facilityId, facilityId))
    } else {
      await db.insert(facilityEeatAssessment).values({ facilityId, data: dataStr, rawScore, bmiPercent })
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[facility eeat POST]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
