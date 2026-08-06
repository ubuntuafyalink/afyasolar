"use client"

import { useQuery, keepPreviousData } from "@tanstack/react-query"

import type {
  PortfolioForecastAggregate,
  FacilityForecast,
} from "@/lib/climate/portfolio-forecast-server"

export type PortfolioForecastData = {
  rows: FacilityForecast[]
  aggregate: PortfolioForecastAggregate
}

/**
 * Portfolio-level AI climate forecast (Chronos zero-shot) across facilities (admin).
 * `months` re-runs the forecast over a shorter window (the AI service re-derives
 * the hazard indices, not just a chart slice). Previous data is kept visible while
 * the new window is fetched, so the card can animate the re-prediction in place.
 */
export function useAdminPortfolioForecast(months?: number) {
  return useQuery({
    queryKey: ["admin-portfolio-forecast", months ?? "full"],
    queryFn: async (): Promise<PortfolioForecastData> => {
      const qs = months ? `?months=${months}` : ""
      const res = await fetch(`/api/admin/intelligence/portfolio-forecast${qs}`, { cache: "no-store" })
      if (!res.ok) throw new Error("Failed to load portfolio forecast")
      const json = await res.json()
      if (!json?.success) throw new Error(json?.error || "Invalid response")
      return {
        rows: (json.data ?? []) as FacilityForecast[],
        aggregate: json.aggregate as PortfolioForecastAggregate,
      }
    },
    placeholderData: keepPreviousData, // keep the old window on screen while re-predicting
    staleTime: 30 * 60 * 1000, // AI service caches per-coord; refresh sparingly
    refetchOnWindowFocus: false,
  })
}
