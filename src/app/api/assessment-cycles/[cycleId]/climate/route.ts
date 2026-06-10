import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/config"
import { db } from "@/lib/db"
import {
  assessmentCycles,
  climateAssessmentResponses,
  climateScoreSummaries,
  evidenceItems,
  facilities,
  facilityClimateProfile,
  facilityResilienceSnapshot,
  riskDrivers,
} from "@/lib/db/schema"
import { and, desc, eq } from "drizzle-orm"
import { generateId } from "@/lib/utils"
import { NORMALIZATION_VERSION } from "@/lib/climate/nasa-power"
import { persistRealClimateProfile } from "@/lib/climate/facility-climate-persist"
import {
  CRIPHC_FORMULA_VERSION,
  combineRcs,
  hesFromComposite,
  rcsTierInt,
  type ModuleCode,
} from "@/lib/climate/criphc-scoring"

export const dynamic = "force-dynamic"
export const revalidate = 0

// Valid module codes (also used to validate the PUT payload). Values are the
// questionnaire's per-module risk caps, retained only to recognize the modules.
const MODULE_MAX: Record<ModuleCode, number> = {
  HES: 20,
  CSF: 30,
  ECPQ: 25,
  EDC: 15,
  RRC: 10,
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

/**
 * Reduce the questionnaire responses to a per-module RISK fraction in [0, 1]
 * (higher answer score = more risk), plus the red-flag critical-attention flag.
 * The capacity score per dimension is later derived as (1 - riskFraction) * 100.
 */
function computeModuleRisk(payload: {
  responses: Array<{
    moduleCode: ModuleCode
    score: number
    scoreMax: number
    isRedFlag?: boolean
  }>
}) {
  const sums: Record<ModuleCode, number> = { HES: 0, CSF: 0, ECPQ: 0, EDC: 0, RRC: 0 }
  const max: Record<ModuleCode, number> = { HES: 0, CSF: 0, ECPQ: 0, EDC: 0, RRC: 0 }
  let criticalAttention = false

  for (const r of payload.responses) {
    const mod = r.moduleCode
    if (!MODULE_MAX[mod]) continue
    const sMax = clamp(Number(r.scoreMax ?? 0), 0, 1000)
    const s = clamp(Number(r.score ?? 0), 0, sMax || 0)
    max[mod] += sMax
    sums[mod] += s
    if (r.isRedFlag) criticalAttention = true
  }

  const riskFrac: Record<ModuleCode, number> = { HES: 0, CSF: 0, ECPQ: 0, EDC: 0, RRC: 0 }
  ;(Object.keys(MODULE_MAX) as ModuleCode[]).forEach((m) => {
    riskFrac[m] = max[m] > 0 ? clamp(sums[m] / max[m], 0, 1) : 0
  })

  return { riskFrac, criticalAttention }
}

function computeTopRisks(riskFrac: Record<ModuleCode, number>) {
  const drivers = [
    { key: "flood", module: "HES" as const, title: "Flood exposure", w: 1.0 },
    { key: "heat", module: "HES" as const, title: "Heat stress", w: 0.9 },
    { key: "cold", module: "CSF" as const, title: "Cold-chain fragility", w: 1.2 },
    { key: "backup", module: "ECPQ" as const, title: "Backup gaps", w: 1.1 },
    { key: "sop", module: "RRC" as const, title: "SOP & readiness", w: 1.0 },
  ]

  return drivers
    .map((d) => {
      // Severity scales with the module's measured RISK fraction (0..1).
      const sev = Math.round(clamp(riskFrac[d.module] * 100 * d.w, 0, 100))
      return {
        title: d.title,
        riskType: d.key,
        severity: sev,
        priorityScore: sev,
      }
    })
    .sort((a, b) => b.severity - a.severity)
    .slice(0, 5)
}

async function requireCycleAccess(session: any, cycleId: string) {
  const [cycle] = await db
    .select({
      id: assessmentCycles.id,
      facilityId: assessmentCycles.facilityId,
      status: assessmentCycles.status,
    })
    .from(assessmentCycles)
    .where(eq(assessmentCycles.id, cycleId))
    .limit(1)
  if (!cycle) return { error: NextResponse.json({ error: "Assessment cycle not found" }, { status: 404 }) as any }

  if (session.user.role !== "admin" && session.user.facilityId !== cycle.facilityId) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) as any }
  }

  return { cycle }
}

/**
 * GET /api/assessment-cycles/[cycleId]/climate
 * Returns persisted climate assessment (responses, evidence, score summary, top risks).
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ cycleId: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { cycleId } = await params
    if (!cycleId) return NextResponse.json({ error: "Missing cycleId" }, { status: 400 })

    const access = await requireCycleAccess(session, cycleId)
    if ("error" in access) return access.error

    const [responses, evidence, score, risks] = await Promise.all([
      db
        .select()
        .from(climateAssessmentResponses)
        .where(eq(climateAssessmentResponses.assessmentCycleId, cycleId))
        .orderBy(desc(climateAssessmentResponses.updatedAt)),
      db
        .select()
        .from(evidenceItems)
        .where(eq(evidenceItems.assessmentCycleId, cycleId))
        .orderBy(desc(evidenceItems.capturedAt)),
      db.select().from(climateScoreSummaries).where(eq(climateScoreSummaries.assessmentCycleId, cycleId)).limit(1),
      db.select().from(riskDrivers).where(eq(riskDrivers.assessmentCycleId, cycleId)).orderBy(riskDrivers.rank).limit(10),
    ])

    return NextResponse.json({
      success: true,
      cycle: access.cycle,
      responses,
      evidence,
      score: score[0] ?? null,
      topRisks: risks,
    })
  } catch (error) {
    console.error("[assessment-cycle climate GET]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

/**
 * PUT /api/assessment-cycles/[cycleId]/climate
 * Persists responses + evidence (replaces existing for the cycle).
 */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ cycleId: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { cycleId } = await params
    if (!cycleId) return NextResponse.json({ error: "Missing cycleId" }, { status: 400 })

    const access = await requireCycleAccess(session, cycleId)
    if ("error" in access) return access.error

    const body = await request.json().catch(() => ({} as any))
    const responses = Array.isArray(body.responses) ? body.responses : []
    const evidence = Array.isArray(body.evidence) ? body.evidence : []

    // Basic payload validation
    for (const r of responses) {
      if (!r || typeof r !== "object") {
        return NextResponse.json({ error: "Invalid responses payload" }, { status: 400 })
      }
      if (typeof r.moduleCode !== "string" || !(r.moduleCode in MODULE_MAX)) {
        return NextResponse.json({ error: "Invalid moduleCode in responses" }, { status: 400 })
      }
      if (typeof r.questionCode !== "string" || !r.questionCode) {
        return NextResponse.json({ error: "Missing questionCode in responses" }, { status: 400 })
      }
      if (typeof r.answerValue !== "string" || !r.answerValue) {
        return NextResponse.json({ error: "Missing answerValue in responses" }, { status: 400 })
      }
    }

    await db.transaction(async (tx) => {
      await tx.delete(climateAssessmentResponses).where(eq(climateAssessmentResponses.assessmentCycleId, cycleId))
      await tx.delete(evidenceItems).where(eq(evidenceItems.assessmentCycleId, cycleId))

      if (responses.length > 0) {
        await tx.insert(climateAssessmentResponses).values(
          responses.map((r: any) => ({
            id: generateId(),
            assessmentCycleId: cycleId,
            moduleCode: r.moduleCode,
            questionCode: r.questionCode,
            answerValue: r.answerValue,
            score: Number(r.score ?? 0),
            scoreMax: Number(r.scoreMax ?? 0),
            note: typeof r.note === "string" ? r.note : null,
            confidence: typeof r.confidence === "number" ? r.confidence : 100,
            createdAt: new Date(),
            updatedAt: new Date(),
          }))
        )
      }

      if (evidence.length > 0) {
        await tx.insert(evidenceItems).values(
          evidence.map((e: any) => ({
            id: generateId(),
            assessmentCycleId: cycleId,
            questionCode: String(e.questionCode ?? ""),
            type: String(e.type ?? "note"),
            fileUrl: typeof e.fileUrl === "string" ? e.fileUrl : null,
            note: typeof e.note === "string" ? e.note : null,
            capturedAt: e.capturedAt ? new Date(e.capturedAt) : new Date(),
          }))
        )
      }

      await tx
        .update(assessmentCycles)
        .set({ updatedAt: new Date() })
        .where(eq(assessmentCycles.id, cycleId))
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[assessment-cycle climate PUT]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

/**
 * POST /api/assessment-cycles/[cycleId]/climate
 * Computes + persists score summary + top risks from submitted responses.
 * Body: { responses: [...], criticalAttention?: boolean }
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ cycleId: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { cycleId } = await params
    if (!cycleId) return NextResponse.json({ error: "Missing cycleId" }, { status: 400 })

    const access = await requireCycleAccess(session, cycleId)
    if ("error" in access) return access.error

    const body = await request.json().catch(() => ({} as any))
    const responses = Array.isArray(body.responses) ? body.responses : []
    if (responses.length === 0) {
      return NextResponse.json({ error: "responses[] required to compute score" }, { status: 400 })
    }

    const { riskFrac, criticalAttention } = computeModuleRisk({ responses })
    const topRisks = computeTopRisks(riskFrac)

    // HES dimension comes from REAL persisted NASA climate exposure, not the
    // questionnaire: compute + persist the facility's real climate profile, then
    // derive HES capacity = 100 - CVI composite. Falls back to an already-persisted
    // real profile, and finally to the questionnaire-derived HES if NASA is down.
    const [facRow] = await db
      .select({ region: facilities.region, latitude: facilities.latitude, longitude: facilities.longitude })
      .from(facilities)
      .where(eq(facilities.id, access.cycle.facilityId))
      .limit(1)

    let composite: number | null = null
    try {
      const real = await persistRealClimateProfile(access.cycle.facilityId, {
        region: facRow?.region ?? null,
        lat: facRow?.latitude != null ? Number(facRow.latitude) : null,
        lon: facRow?.longitude != null ? Number(facRow.longitude) : null,
      })
      if (real) composite = real.composite
    } catch (e) {
      console.warn("[assessment-cycle climate POST] real climate fetch:", e)
    }
    if (composite == null) {
      // Use an already-persisted REAL profile if present (avg of the 4 hazard fields = CVI composite).
      try {
        const [p] = await db
          .select()
          .from(facilityClimateProfile)
          .where(eq(facilityClimateProfile.facilityId, access.cycle.facilityId))
          .limit(1)
        if (p && p.dataSource === "real") {
          composite = Math.round(
            (Number(p.floodRiskScore) + Number(p.heatRiskScore) + Number(p.windRiskScore) + Number(p.rainRiskScore)) / 4,
          )
        }
      } catch {
        /* keep composite null -> questionnaire fallback below */
      }
    }

    // Per-dimension CAPACITY (0..100): HES from real climate; others = inverse of questionnaire risk.
    const capacity: Record<ModuleCode, number> = {
      HES: composite != null ? hesFromComposite(composite) : Math.round((1 - riskFrac.HES) * 100),
      CSF: Math.round((1 - riskFrac.CSF) * 100),
      ECPQ: Math.round((1 - riskFrac.ECPQ) * 100),
      EDC: Math.round((1 - riskFrac.EDC) * 100),
      RRC: Math.round((1 - riskFrac.RRC) * 100),
    }
    const rcs = combineRcs(capacity)
    const tier = rcsTierInt(rcs)
    const formulaVersion = `${CRIPHC_FORMULA_VERSION}+climate-${NORMALIZATION_VERSION}`
    const periodMonth = (() => {
      const d = new Date()
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    })()

    await db.transaction(async (tx) => {
      // Upsert summary for the cycle (delete+insert keeps it simple across MySQL/TiDB variants)
      await tx.delete(climateScoreSummaries).where(eq(climateScoreSummaries.assessmentCycleId, cycleId))

      await tx.insert(climateScoreSummaries).values({
        id: generateId(),
        assessmentCycleId: cycleId,
        hes: capacity.HES,
        csf: capacity.CSF,
        ecpq: capacity.ECPQ,
        edc: capacity.EDC,
        rrc: capacity.RRC,
        rcs,
        tier,
        formulaVersion,
        criticalAttention,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      // Persist a monthly resilience snapshot from the REAL computed RCS so the
      // trend is read from history instead of regenerated on the fly.
      const [existingSnap] = await tx
        .select({ id: facilityResilienceSnapshot.id })
        .from(facilityResilienceSnapshot)
        .where(
          and(
            eq(facilityResilienceSnapshot.facilityId, access.cycle.facilityId),
            eq(facilityResilienceSnapshot.periodMonth, periodMonth),
          ),
        )
        .limit(1)
      if (existingSnap) {
        await tx
          .update(facilityResilienceSnapshot)
          .set({ resilienceScore: String(rcs) })
          .where(eq(facilityResilienceSnapshot.id, existingSnap.id))
      } else {
        await tx.insert(facilityResilienceSnapshot).values({
          id: generateId(),
          facilityId: access.cycle.facilityId,
          periodMonth,
          resilienceScore: String(rcs),
        })
      }

      await tx.delete(riskDrivers).where(eq(riskDrivers.assessmentCycleId, cycleId))
      if (topRisks.length > 0) {
        await tx.insert(riskDrivers).values(
          topRisks.map((r, idx) => ({
            id: generateId(),
            assessmentCycleId: cycleId,
            title: r.title,
            riskType: r.riskType,
            severity: r.severity,
            priorityScore: r.priorityScore,
            rank: idx + 1,
            createdAt: new Date(),
          }))
        )
      }

      await tx.update(assessmentCycles).set({ updatedAt: new Date() }).where(eq(assessmentCycles.id, cycleId))
    })

    const [score] = await db
      .select()
      .from(climateScoreSummaries)
      .where(eq(climateScoreSummaries.assessmentCycleId, cycleId))
      .limit(1)

    const risks = await db
      .select()
      .from(riskDrivers)
      .where(eq(riskDrivers.assessmentCycleId, cycleId))
      .orderBy(riskDrivers.rank)
      .limit(10)

    return NextResponse.json({ success: true, score: score ?? null, topRisks: risks })
  } catch (error) {
    console.error("[assessment-cycle climate POST]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

