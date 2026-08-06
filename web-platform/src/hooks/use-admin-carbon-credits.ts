"use client"

import { useQuery } from "@tanstack/react-query"

export type CarbonCreditRow = {
  id: string
  facilityId: string
  facilityName: string
  co2Saved: number // kg
  creditsEarned: number // tons
  totalValue: number // USD
  energyGenerated: number // kWh
  verificationStatus: string
  period: string
}

export type CarbonCreditTotals = {
  rows: CarbonCreditRow[]
  co2SavedKg: number
  creditsEarnedTons: number
  totalValueUsd: number
  energyGeneratedKwh: number
}

/** Portfolio carbon credits with client-side totals (admin only). */
export function useAdminCarbonCredits() {
  return useQuery({
    queryKey: ["admin-carbon-credits-portfolio"],
    queryFn: async (): Promise<CarbonCreditTotals> => {
      const res = await fetch("/api/admin/carbon-credits?limit=1000", { cache: "no-store" })
      if (!res.ok) throw new Error("Failed to load carbon credits")
      const json = await res.json()
      if (!json?.success) throw new Error(json?.error || "Invalid response")
      const rows = (json.data ?? []) as CarbonCreditRow[]
      return {
        rows,
        co2SavedKg: rows.reduce((s, r) => s + Number(r.co2Saved || 0), 0),
        creditsEarnedTons: rows.reduce((s, r) => s + Number(r.creditsEarned || 0), 0),
        totalValueUsd: rows.reduce((s, r) => s + Number(r.totalValue || 0), 0),
        energyGeneratedKwh: rows.reduce((s, r) => s + Number(r.energyGenerated || 0), 0),
      }
    },
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  })
}
