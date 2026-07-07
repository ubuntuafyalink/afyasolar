/**
 * Portfolio climate refresh: the monthly job that keeps the REAL climate layer
 * current for every facility. Two effects, both idempotent per month:
 *
 *  1. Upserts facility_climate_profile (dataSource="real") from live NASA POWER
 *     hazard exposure — so admin + facility surfaces read real profiles, not the
 *     simulateClimateProfile fallback.
 *  2. For every facility that has completed a CRiPHC assessment, writes this
 *     month's facility_resilience_snapshot with the RCS RE-COMBINED from the
 *     stored questionnaire dimensions + a FRESH Hazard Exposure derived from this
 *     month's climate. The RCS trend then becomes real history that also responds
 *     to changing climate, instead of a seeded curve. Facilities with no
 *     assessment get no snapshot (we never invent an RCS).
 *
 * Shared by the admin "refresh" action and the /api/cron/refresh-climate trigger.
 */
import { and, desc, eq } from "drizzle-orm"

import { db } from "@/lib/db"
import {
  assessmentCycles,
  climateScoreSummaries,
  facilityClimateProfile,
  facilityResilienceSnapshot,
  facilityRiskPrediction,
} from "@/lib/db/schema"
import { generateId } from "@/lib/utils"
import { computePortfolioClimate } from "@/lib/climate/portfolio-climate-server"
import { combineRcs, hesFromComposite, type ModuleCode } from "@/lib/climate/criphc-scoring"
import { NORMALIZATION_VERSION } from "@/lib/climate/nasa-power"
import { ensureClimateNormalization } from "@/lib/db/ensure-climate-normalization"
import { ensureRiskPrediction } from "@/lib/db/ensure-risk-prediction"
import { featuresFromFacilityData } from "@/lib/intelligence/risk-features"
import { assessRisk } from "@/lib/intelligence/risk-model"

export type RefreshPortfolioClimateResult = {
  success: true
  dryRun: boolean
  scanned: number
  profilesUpserted: number
  snapshotsWritten: number
  riskPredictionsLogged: number
  degraded: number
  periodMonth: string
}

function currentPeriodMonth(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

type SummaryCaps = { csf: number; ecpq: number; edc: number; rrc: number; criticalAttention: boolean }

/** Latest persisted score summary per facility (facilityId -> capacities). */
async function latestSummaryByFacility(): Promise<Map<string, SummaryCaps>> {
  const rows = await db
    .select({
      facilityId: assessmentCycles.facilityId,
      csf: climateScoreSummaries.csf,
      ecpq: climateScoreSummaries.ecpq,
      edc: climateScoreSummaries.edc,
      rrc: climateScoreSummaries.rrc,
      criticalAttention: climateScoreSummaries.criticalAttention,
      updatedAt: climateScoreSummaries.updatedAt,
    })
    .from(climateScoreSummaries)
    .innerJoin(assessmentCycles, eq(climateScoreSummaries.assessmentCycleId, assessmentCycles.id))
    .orderBy(desc(climateScoreSummaries.updatedAt))

  const byFacility = new Map<string, SummaryCaps>()
  for (const r of rows) {
    if (!r.facilityId || byFacility.has(r.facilityId)) continue // rows are newest-first
    byFacility.set(r.facilityId, {
      csf: Number(r.csf ?? 0),
      ecpq: Number(r.ecpq ?? 0),
      edc: Number(r.edc ?? 0),
      rrc: Number(r.rrc ?? 0),
      criticalAttention: Boolean(r.criticalAttention),
    })
  }
  return byFacility
}

export async function refreshPortfolioClimate(
  opts: { dryRun?: boolean } = {},
): Promise<RefreshPortfolioClimateResult> {
  const dryRun = Boolean(opts.dryRun)
  const periodMonth = currentPeriodMonth()

  // Ensure schema (idempotent, real runs only).
  if (!dryRun) {
    await ensureClimateNormalization()
    await ensureRiskPrediction()
  }

  const [{ data }, summaries] = await Promise.all([
    computePortfolioClimate(),
    latestSummaryByFacility(),
  ])

  const now = new Date()
  let profilesUpserted = 0
  let snapshotsWritten = 0
  let riskPredictionsLogged = 0
  let degraded = 0

  for (const c of data) {
    if (c.degraded) {
      degraded += 1
      continue
    }

    // 1) Upsert the real climate profile.
    const profileValues = {
      floodRiskScore: String(c.byHazard.flood),
      heatRiskScore: String(c.byHazard.heat),
      windRiskScore: String(c.byHazard.storm),
      rainRiskScore: String(c.byHazard.drought),
      overallResilienceScore: String(c.hesScore),
      latitude: String(c.lat),
      longitude: String(c.lon),
      dataSource: "real" as const,
      normalizationVersion: NORMALIZATION_VERSION,
    }
    if (!dryRun) {
      try {
        const existing = await db
          .select({ facilityId: facilityClimateProfile.facilityId })
          .from(facilityClimateProfile)
          .where(eq(facilityClimateProfile.facilityId, c.facilityId))
          .limit(1)
        if (existing.length > 0) {
          await db
            .update(facilityClimateProfile)
            .set(profileValues)
            .where(eq(facilityClimateProfile.facilityId, c.facilityId))
        } else {
          await db.insert(facilityClimateProfile).values({ facilityId: c.facilityId, ...profileValues })
        }
        profilesUpserted += 1
      } catch (e) {
        console.warn("[refresh-portfolio-climate] profile upsert", c.facilityId, e)
      }
    } else {
      profilesUpserted += 1
    }

    // 2) Monthly resilience snapshot only for assessed facilities, RCS recombined
    //    with a fresh HES from this month's climate.
    const s = summaries.get(c.facilityId)

    // Log a disruption-risk prediction for every non-degraded facility (feeds the
    // future calibration/fitting join to realized outcomes).
    const { features, completeness, dataGaps } = featuresFromFacilityData({
      cvi: { composite: c.composite, byHazard: { heat: c.byHazard.heat } },
      rcs: s ? { csf: s.csf, ecpq: s.ecpq, rrc: s.rrc, criticalAttention: s.criticalAttention } : null,
    })
    const risk = assessRisk(features, completeness, dataGaps)
    if (!dryRun) {
      try {
        await db.insert(facilityRiskPrediction).values({
          id: generateId(),
          facilityId: c.facilityId,
          scoredAt: now,
          version: risk.version,
          probability: String(risk.probability),
          tier: risk.tier,
          features: JSON.stringify(features),
          completeness: String(completeness),
        })
        riskPredictionsLogged += 1
      } catch (e) {
        console.warn("[refresh-portfolio-climate] risk prediction", c.facilityId, e)
      }
    } else {
      riskPredictionsLogged += 1
    }

    // Monthly resilience snapshot only for assessed facilities.
    if (!s) continue
    const capacity: Record<ModuleCode, number> = {
      HES: hesFromComposite(c.composite),
      CSF: s.csf,
      ECPQ: s.ecpq,
      EDC: s.edc,
      RRC: s.rrc,
    }
    const rcs = combineRcs(capacity)
    if (!dryRun) {
      try {
        const [snap] = await db
          .select({ id: facilityResilienceSnapshot.id })
          .from(facilityResilienceSnapshot)
          .where(
            and(
              eq(facilityResilienceSnapshot.facilityId, c.facilityId),
              eq(facilityResilienceSnapshot.periodMonth, periodMonth),
            ),
          )
          .limit(1)
        if (snap) {
          await db
            .update(facilityResilienceSnapshot)
            .set({ resilienceScore: String(rcs) })
            .where(eq(facilityResilienceSnapshot.id, snap.id))
        } else {
          await db.insert(facilityResilienceSnapshot).values({
            id: generateId(),
            facilityId: c.facilityId,
            periodMonth,
            resilienceScore: String(rcs),
          })
        }
        snapshotsWritten += 1
      } catch (e) {
        console.warn("[refresh-portfolio-climate] snapshot upsert", c.facilityId, e)
      }
    } else {
      snapshotsWritten += 1
    }
  }

  return {
    success: true,
    dryRun,
    scanned: data.length,
    profilesUpserted,
    snapshotsWritten,
    riskPredictionsLogged,
    degraded,
    periodMonth,
  }
}
