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

export type HazardTrendYear = { year: number; heat: number; flood: number; storm: number; drought: number }

export type PortfolioClimateAggregate = {
  trend: HazardTrendYear[]
  byHazard: { flood: number; drought: number; heat: number; storm: number }
  composite: number
  facilitiesWithClimate: number
}

export type PortfolioClimateData = {
  rows: PortfolioClimateRow[]
  aggregate: PortfolioClimateAggregate
}

/** Real NASA POWER climate exposure for every facility + portfolio aggregate (admin). */
export function useAdminPortfolioClimate() {
  return useQuery({
    queryKey: ["admin-portfolio-climate"],
    queryFn: async (): Promise<PortfolioClimateData> => {
      const res = await fetch("/api/admin/intelligence/portfolio-climate", { cache: "no-store" })
      if (!res.ok) throw new Error("Failed to load portfolio climate data")
      const json = await res.json()
      if (!json?.success) throw new Error(json?.error || "Invalid response")
      return {
        rows: (json.data ?? []) as PortfolioClimateRow[],
        aggregate: json.aggregate as PortfolioClimateAggregate,
      }
    },
    // NASA upstream is cached 6h server-side; refresh sparingly on the client.
    staleTime: 6 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  })
}
