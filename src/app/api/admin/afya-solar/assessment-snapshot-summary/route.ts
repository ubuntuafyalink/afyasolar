import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/config"
import { getRawConnection } from "@/lib/db"
import type { RowDataPacket } from "mysql2"

export const dynamic = "force-dynamic"

function parseJsonField(raw: unknown): unknown {
  if (raw == null) return null
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw)
    } catch {
      return null
    }
  }
  if (typeof raw === "object") return raw
  return null
}

type EnergySizing = {
  solarArraySize: number | null
  dailyLoad: number | null
  requiredKw: number | null
  annualSavings: number | null
}

function energyMetrics(payload: unknown) {
  const p = payload as Record<string, unknown> | null
  if (!p || typeof p !== "object") {
    return { bmiPercent: null as number | null, rawScore: null as number | null, sizing: null as EnergySizing | null }
  }
  const ops = (p.operationsData ?? p.operations) as Record<string, unknown> | undefined
  const score = typeof ops?.assessmentScore === "number" ? Number(ops.assessmentScore) : null
  const bmiPercent = score !== null ? Math.round((score / 40) * 100) : null

  // Lightweight sizing metrics for the admin Power table (full sizing/MEU are
  // fetched per-facility on drill-down). Same fallback path the facility uses.
  const sizingData = (p.sizingData ?? null) as Record<string, unknown> | null
  const ss = (p.sizingSummary ?? sizingData?.sizingSummary) as Record<string, unknown> | undefined
  const num = (v: unknown): number | null =>
    v !== undefined && v !== null && !Number.isNaN(Number(v)) ? Number(v) : null
  const sizing: EnergySizing | null = ss
    ? {
        solarArraySize: num(ss.solarArraySize),
        dailyLoad: num(ss.totalDailyLoad),
        requiredKw: num(ss.requiredKw),
        annualSavings: num(ss.annualSavings),
      }
    : null
  const hasSizing = sizing && Object.values(sizing).some((v) => v !== null)
  return { bmiPercent, rawScore: score, sizing: hasSizing ? sizing : null }
}

type ClimateDimensions = { hes: number | null; csf: number | null; ecpq: number | null; edc: number | null; rrc: number | null }

function climateMetrics(payload: unknown) {
  const p = payload as Record<string, unknown> | null
  if (!p || typeof p !== "object") {
    return {
      rcs: null as number | null,
      tier: null as number | null,
      criticalAttention: false,
      evidenceCount: 0,
      dimensions: null as ClimateDimensions | null,
    }
  }
  const score = (p.score ?? p.climateScore) as Record<string, unknown> | undefined
  const num = (v: unknown): number | null =>
    v !== undefined && v !== null && !Number.isNaN(Number(v)) ? Number(v) : null
  const rcs = num(score?.rcs)
  const tierRaw = score?.tier
  const tier =
    typeof tierRaw === "number"
      ? tierRaw
      : tierRaw !== undefined && tierRaw !== null && !Number.isNaN(Number(tierRaw))
        ? Number(tierRaw)
        : null
  const criticalAttention = Boolean(score?.criticalAttention)
  const ev = p.evidence
  const evidenceCount = Array.isArray(ev) ? ev.length : 0
  // CRiPHC capacity dimensions (0..100, higher is better) from the saved climate
  // score row (climate_score_summaries: hes/csf/ecpq/edc/rrc).
  const dimensions: ClimateDimensions = {
    hes: num(score?.hes),
    csf: num(score?.csf),
    ecpq: num(score?.ecpq),
    edc: num(score?.edc),
    rrc: num(score?.rrc),
  }
  const hasAnyDimension = Object.values(dimensions).some((v) => v !== null)
  return { rcs, tier, criticalAttention, evidenceCount, dimensions: hasAnyDimension ? dimensions : null }
}

type SummaryRow = RowDataPacket & {
  facilityId: string
  facilityName: string
  city: string | null
  region: string | null
  facilityStatus: string | null
  energyAssessmentDate: Date | string | null
  energyPayload: unknown
  climateAssessmentDate: Date | string | null
  climatePayload: unknown
}

/**
 * GET /api/admin/afya-solar/assessment-snapshot-summary
 * Read-only latest energy/climate assessment snapshot metadata per facility (no full JSON in UI lists).
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const pool = getRawConnection()
    // Latest energy + climate assessment per facility. TiDB does not allow
    // subqueries in a JOIN ON condition ("ON condition doesn't support
    // subqueries yet"), so we pick the latest row per facility with a
    // ROW_NUMBER() window in a derived table and join on rn = 1.
    const [rows] = await pool.query<SummaryRow[]>(
      `SELECT
        f.id AS facilityId,
        f.name AS facilityName,
        f.city AS city,
        f.region AS region,
        f.status AS facilityStatus,
        e.assessment_date AS energyAssessmentDate,
        e.payload AS energyPayload,
        c.assessment_date AS climateAssessmentDate,
        c.payload AS climatePayload
      FROM facilities f
      LEFT JOIN (
        SELECT facility_id, assessment_date, payload,
          ROW_NUMBER() OVER (PARTITION BY facility_id ORDER BY assessment_date DESC, updated_at DESC) AS rn
        FROM facility_energy_assessments
      ) e ON e.facility_id = f.id AND e.rn = 1
      LEFT JOIN (
        SELECT facility_id, assessment_date, payload,
          ROW_NUMBER() OVER (PARTITION BY facility_id ORDER BY assessment_date DESC, updated_at DESC) AS rn
        FROM facility_climate_assessments
      ) c ON c.facility_id = f.id AND c.rn = 1
      ORDER BY f.name ASC`
    )

    const data = (rows || []).map((row) => {
      const energyPayload = parseJsonField(row.energyPayload)
      const climatePayload = parseJsonField(row.climatePayload)
      const e = energyMetrics(energyPayload)
      const cl = climateMetrics(climatePayload)
      return {
        facilityId: row.facilityId,
        facilityName: row.facilityName,
        city: row.city,
        region: row.region,
        facilityStatus: row.facilityStatus,
        energyAssessmentDate: row.energyAssessmentDate
          ? new Date(row.energyAssessmentDate as Date).toISOString()
          : null,
        climateAssessmentDate: row.climateAssessmentDate
          ? new Date(row.climateAssessmentDate as Date).toISOString()
          : null,
        energyBmiPercent: e.bmiPercent,
        energyBmiRawScore: e.rawScore,
        energySizing: e.sizing,
        climateRcs: cl.rcs,
        climateTier: cl.tier,
        climateCriticalAttention: cl.criticalAttention,
        climateEvidenceCount: cl.evidenceCount,
        climateDimensions: cl.dimensions,
        hasEnergySnapshot: Boolean(row.energyAssessmentDate),
        hasClimateSnapshot: Boolean(row.climateAssessmentDate),
      }
    })

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("[assessment-snapshot-summary GET]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
