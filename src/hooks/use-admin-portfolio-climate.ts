"use client"

import { useQuery } from "@tanstack/react-query"

export type PortfolioClimateRow = {
  facilityId: string
  region: string | null
  lat: number
  lon: number
  coordsSource: "facility" | "region" | "default"
  byHazard: { flood: number; drought: number; heat: number; storm: number }
  composite: number
  hesScore: number
  topHazard: { type: string; score: number }
  hazardScores: { type: string; score: number; trend: string; note: string }[]
  degraded: boolean
}

/** Real NASA POWER climate exposure for every facility (admin only). */
export function useAdminPortfolioClimate() {
  return useQuery({
    queryKey: ["admin-portfolio-climate"],
    queryFn: async () => {
      const res = await fetch("/api/admin/intelligence/portfolio-climate", { cache: "no-store" })
      if (!res.ok) throw new Error("Failed to load portfolio climate data")
      const json = await res.json()
      if (!json?.success) throw new Error(json?.error || "Invalid response")
      return json.data as PortfolioClimateRow[]
    },
    // NASA upstream is cached 6h server-side; refresh sparingly on the client.
    staleTime: 6 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  })
}
