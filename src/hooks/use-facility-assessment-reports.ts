"use client"

import { useQuery } from "@tanstack/react-query"
import type { SizingSummary, MeuSummary } from "@/components/solar/afya-solar-sizing-tool"
import type { SectionScores } from "@/lib/intelligence/recommendations"

/** Facility-level extras the energy report charts need (outage/cost context). */
export type FacilityEnergyExtras = {
  averageOutageHours: number
  facilityType: "on-grid" | "off-grid" | "hybrid"
  monthlyGridBill: number
  dieselLitresPerDay: number
  dieselPricePerLitre: number
}

export type FacilityAssessmentReports = {
  sizingSummary: SizingSummary | null
  meuSummary: MeuSummary | null
  /** Outage/cost context for the report charts; null when not captured. */
  facilityExtras: FacilityEnergyExtras | null
  /** Operational checklist section scores (reliability/wastage/thermal/behavior). */
  sectionScores: SectionScores | null
  /** Raw BMI assessment score (/40) from the operational checklist; null when absent. */
  assessmentScore: number | null
  /** BMI history series for the trend chart; null when absent. */
  bmiTrend: { date: string; value: number }[] | null
  /** Saved climate RCS (0..100) for the report header; null when no climate assessment. */
  resilienceScore: number | null
  region: string | null
}

/**
 * A single facility's saved energy + climate assessment, used to feed the
 * embedded read-only report (PowerSection / IntelligenceChartGrid) in admin
 * drill-downs. Admins are authorized to read any facility's reports (the route
 * allows role==="admin"). Extraction paths mirror facility-dashboard-content.tsx.
 */
export function useFacilityAssessmentReports(facilityId?: string | null) {
  return useQuery({
    queryKey: ["facility-assessment-reports", facilityId],
    enabled: !!facilityId,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<FacilityAssessmentReports> => {
      const res = await fetch(`/api/facility/${facilityId}/assessment-reports`, { cache: "no-store" })
      if (!res.ok) throw new Error("Failed to load assessment reports")
      const json = await res.json()
      const energy = (json?.latestEnergy?.payload ?? null) as Record<string, any> | null
      const climate = (json?.latestClimate?.payload ?? null) as Record<string, any> | null

      const sizingSummary =
        (energy?.sizingSummary ?? energy?.sizingData?.sizingSummary ?? null) as SizingSummary | null
      const meuSummary =
        (energy?.meuSummary ?? energy?.meu ?? energy?.sizingData?.meuSummary ?? null) as MeuSummary | null
      const facilityExtras =
        (energy?.facilityData ?? energy?.facilityContext ?? energy?.sizingData?.facilityData ?? null) as
          | FacilityEnergyExtras
          | null

      const operations = energy?.operationsData ?? energy?.operations ?? null
      const sectionScores =
        operations?.sectionScores && typeof operations.sectionScores === "object"
          ? (operations.sectionScores as SectionScores)
          : null
      const assessmentScore =
        typeof operations?.assessmentScore === "number" ? Number(operations.assessmentScore) : null

      const bmiTrendRaw = energy?.bmiTrendJson ?? energy?.bmiTrend ?? null
      const bmiTrend =
        Array.isArray(bmiTrendRaw) && bmiTrendRaw.length > 0
          ? (bmiTrendRaw as { date: string; value: number }[])
          : null

      const rcsRaw = climate?.score?.rcs ?? climate?.climateScore?.rcs
      const resilienceScore = rcsRaw !== undefined && rcsRaw !== null ? Number(rcsRaw) : null

      return {
        sizingSummary,
        meuSummary,
        facilityExtras,
        sectionScores,
        assessmentScore,
        bmiTrend,
        resilienceScore,
        region: null,
      }
    },
  })
}
