"use client"

import { useQuery, keepPreviousData } from "@tanstack/react-query"

import { fetchAiForecast, type AiClimateForecast } from "@/lib/climate/ai-forecast-service"

export type UseAiForecastArgs = {
  lat: number | null
  lon: number | null
  horizon?: "daily" | "monthly"
  systemKw?: number
  /** Forecast window; a new value re-runs the forecast (server re-derives hazards). */
  months?: number
  enabled?: boolean
}

/**
 * React Query hook for the AI service's climate forecast via the internal
 * /api/ai/forecast proxy. Disabled until coordinates are set; keeps the previous
 * result visible while a new location's or window's forecast is in flight.
 */
export function useAiForecast(args: UseAiForecastArgs) {
  const { lat, lon, horizon = "monthly", systemKw, months, enabled = true } = args
  return useQuery<AiClimateForecast>({
    queryKey: ["ai-forecast", lat, lon, horizon, systemKw ?? null, months ?? null],
    queryFn: () =>
      fetchAiForecast({ lat: lat as number, lon: lon as number, horizon, systemKw, months }),
    enabled: enabled && lat != null && lon != null,
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })
}
