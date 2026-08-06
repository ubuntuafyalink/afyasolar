import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/config"
import { getRawConnection } from "@/lib/db"
import type { RowDataPacket } from "mysql2"
import {
  extractBmiFromOperationsData,
  extractSizingSummaryFromSizingData,
  extractMeuSummaryFromSizingData,
  extractClimateScore,
} from "@/lib/assessment-cycle-overview-metrics"
import { computePortfolioClimate } from "@/lib/climate/portfolio-climate-server"
import { resolveEstimatedDailyKwh, deriveAnnuals } from "@/lib/solar/ops-estimate"
import type { FacilitySolarOps } from "@/lib/solar/ops-types"

export const dynamic = "force-dynamic"
export const revalidate = 0

type Row = {
  facilityId: string
  facilityName: string
  city: string | null
  region: string | null
  facilityStatus: string | null
  energyDate: Date | string | null
  energyPayload: unknown
  climateDate: Date | string | null
  climatePayload: unknown
  systemKw: unknown
  subscriptionStatus: string | null
  packageName: string | null
}

/** Reduce desc-ordered rows to the latest (first-seen) row per facility_id. */
function latestByFacility<T extends { facility_id: string }>(rows: T[]): Map<string, T> {
  const m = new Map<string, T>()
  for (const r of rows) if (!m.has(r.facility_id)) m.set(r.facility_id, r)
  return m
}

function parseJson(raw: unknown): Record<string, unknown> | null {
  if (raw == null) return null
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw)
    } catch {
      return null
    }
  }
  if (typeof raw === "object") return raw as Record<string, unknown>
  return null
}

function numOrNull(v: unknown): number | null {
  if (v == null) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function toIso(v: Date | string | null): string | null {
  if (!v) return null
  const d = v instanceof Date ? v : new Date(v)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Fetch each table separately and merge latest-per-facility in JS. This avoids
    // correlated subqueries in JOIN ON conditions, which TiDB does not support.
    const pool = getRawConnection()
    const [facs] = await pool.query<RowDataPacket[]>(
      `SELECT id, name, city, region, status FROM facilities ORDER BY name ASC`,
    )
    const [energyRows] = await pool.query<RowDataPacket[]>(
      `SELECT facility_id, assessment_date, payload FROM facility_energy_assessments ORDER BY assessment_date DESC, updated_at DESC`,
    )
    const [climateRows] = await pool.query<RowDataPacket[]>(
      `SELECT facility_id, assessment_date, payload FROM facility_climate_assessments ORDER BY assessment_date DESC, updated_at DESC`,
    )
    const [subRows] = await pool.query<RowDataPacket[]>(
      `SELECT facility_id, package_rated_kw, subscription_status, package_name FROM afyasolar_subscribers ORDER BY created_at DESC`,
    )

    const energyByFac = latestByFacility(energyRows as Array<{ facility_id: string; assessment_date: Date | string | null; payload: unknown }>)
    const climateByFac = latestByFacility(climateRows as Array<{ facility_id: string; assessment_date: Date | string | null; payload: unknown }>)
    const subByFac = latestByFacility(subRows as Array<{ facility_id: string; package_rated_kw: unknown; subscription_status: string | null; package_name: string | null }>)

    const rows: Row[] = (facs as Array<RowDataPacket & { id: string; name: string; city: string | null; region: string | null; status: string | null }>).map((f) => {
      const e = energyByFac.get(f.id)
      const c = climateByFac.get(f.id)
      const s = subByFac.get(f.id)
      return {
        facilityId: f.id,
        facilityName: f.name,
        city: f.city,
        region: f.region,
        facilityStatus: f.status,
        energyDate: e?.assessment_date ?? null,
        energyPayload: e?.payload ?? null,
        climateDate: c?.assessment_date ?? null,
        climatePayload: c?.payload ?? null,
        systemKw: s?.package_rated_kw ?? null,
        subscriptionStatus: s?.subscription_status ?? null,
        packageName: s?.package_name ?? null,
      }
    })

    // Real NASA hazards + peak-sun-hours per facility (coordinate-deduped, 6h cached).
    // Best-effort: if NASA is unavailable, estimates fall back to assessment-only.
    const climateByFacility = new Map<string, { composite: number; topHazard: { type: string; score: number }; psh: number | null }>()
    try {
      const portfolio = await computePortfolioClimate()
      for (const c of portfolio.data) {
        if (c.degraded) continue
        climateByFacility.set(c.facilityId, {
          composite: c.composite,
          topHazard: c.topHazard,
          psh: c.solar?.peakSunHours ?? null,
        })
      }
    } catch (e) {
      console.warn("[ops-overview] portfolio climate unavailable:", e)
    }

    const data: FacilitySolarOps[] = (rows || []).map((row) => {
      const energy = parseJson(row.energyPayload)
      const climate = parseJson(row.climatePayload)

      const bmi = energy ? extractBmiFromOperationsData(energy.operationsData) : null
      const sizing = energy ? extractSizingSummaryFromSizingData(energy) : null
      const meu = energy ? extractMeuSummaryFromSizingData(energy) : null
      const ops = energy && typeof energy.operationsData === "object" ? (energy.operationsData as Record<string, unknown>) : null
      const sectionRaw = ops && typeof ops.sectionScores === "object" ? (ops.sectionScores as Record<string, unknown>) : null
      const sectionScores = sectionRaw
        ? {
            reliability: Number(sectionRaw.reliability) || 0,
            wastage: Number(sectionRaw.wastage) || 0,
            thermal: Number(sectionRaw.thermal) || 0,
            behavior: Number(sectionRaw.behavior) || 0,
          }
        : null

      const quote = energy && typeof energy.quoteData === "object" ? (energy.quoteData as Record<string, unknown>) : null
      const solarProd = quote && typeof quote.solar_production === "object" ? (quote.solar_production as Record<string, unknown>) : null
      const sysDesign = quote && typeof quote.system_design === "object" ? (quote.system_design as Record<string, unknown>) : null
      const assessmentDailyKwh = solarProd ? numOrNull(solarProd.estimated_daily_solar_generation_kwh) : null

      const climateScore = climate ? extractClimateScore(climate.score) : null

      const cInfo = climateByFacility.get(row.facilityId)
      const peakSunHours = cInfo?.psh ?? null

      const systemKw =
        numOrNull(row.systemKw) ?? sizing?.solarArraySize ?? (sysDesign ? numOrNull(sysDesign.pv_system_size_kw) : null)

      const { estimatedDailyKwh, source } = resolveEstimatedDailyKwh({
        assessmentDailyKwh,
        systemKw,
        peakSunHours,
      })
      const annuals = deriveAnnuals(estimatedDailyKwh, sizing?.annualSavings ?? null)

      return {
        facilityId: row.facilityId,
        facilityName: row.facilityName,
        region: row.region,
        city: row.city,
        facilityStatus: row.facilityStatus,
        systemKw,
        subscriptionStatus: row.subscriptionStatus,
        packageName: row.packageName,
        hasEnergyAssessment: Boolean(row.energyDate),
        energyAssessmentDate: toIso(row.energyDate),
        bmiPercent: bmi?.bmiPercent ?? null,
        sectionScores,
        dailyLoadKwh: sizing?.totalDailyLoad ?? meu?.totalDailyLoad ?? null,
        annualSavingsTzs: sizing?.annualSavings ?? null,
        hasClimateAssessment: Boolean(row.climateDate),
        climateAssessmentDate: toIso(row.climateDate),
        rcs: climateScore?.rcs ?? null,
        tier: climateScore?.tier ?? null,
        criticalAttention: Boolean(climateScore?.criticalAttention),
        hazardComposite: cInfo?.composite ?? null,
        topHazard: cInfo?.topHazard ?? null,
        peakSunHours,
        estimatedSource: source,
        estimatedDailyKwh,
        estimatedAnnualKwh: annuals.estimatedAnnualKwh,
        estimatedAnnualCo2Kg: annuals.estimatedAnnualCo2Kg,
        estimatedAnnualSavingsTzs: annuals.estimatedAnnualSavingsTzs,
      }
    })

    return NextResponse.json({ success: true, data, generatedAt: new Date().toISOString() })
  } catch (error) {
    console.error("[admin/solar/ops-overview GET]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
