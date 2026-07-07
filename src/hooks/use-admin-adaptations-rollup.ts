"use client"

import { useQuery } from "@tanstack/react-query"

export type AdaptationItem = {
  id: string
  facilityId: string
  facilityName: string | null
  region: string | null
  riskCategory: string
  recommendation: string
  status: string
  implementedAt: string | null
  createdAt: string | null
  estimatedGainPoints: number
}

export type AdaptationsRollup = {
  items: AdaptationItem[]
  byStatus: Record<string, number>
  byRiskCategory: { riskCategory: string; count: number }[]
  totalFacilitiesWithAdaptations: number
  /** Estimated RCS points realized (completed measures) and still available (active). */
  totalRealizedGain: number
  totalPotentialGain: number
}

/** Real climate-adaptation measures across the portfolio (admin only). */
export function useAdminAdaptationsRollup() {
  return useQuery({
    queryKey: ["admin-adaptations-rollup"],
    queryFn: async () => {
      const res = await fetch("/api/admin/intelligence/adaptations-rollup", { cache: "no-store" })
      if (!res.ok) throw new Error("Failed to load adaptations rollup")
      const json = await res.json()
      if (!json?.success) throw new Error(json?.error || "Invalid response")
      return json.data as AdaptationsRollup
    },
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  })
}
