"use client"

import { useQuery, keepPreviousData } from "@tanstack/react-query"

import {
  fetchNasaPower,
  type NasaPowerResponse,
  type Temporal,
} from "@/lib/climate/nasa-power"

export type UseNasaPowerArgs = {
  lat: number | null
  lon: number | null
  temporal: Temporal
  start: string
  end: string
  parameters: readonly string[]
}

/**
 * React Query hook for real NASA POWER data via our /api/climate/nasa-power
 * proxy. No session gating (the proxy and NASA POWER are public). Disabled until
 * coordinates are set; keeps the previous result visible while a new query (e.g.
 * a changed location or time range) is in flight.
 */
export function useNasaPower(args: UseNasaPowerArgs) {
  const { lat, lon, temporal, start, end, parameters } = args
  return useQuery<NasaPowerResponse>({
    queryKey: ["nasa-power", lat, lon, temporal, start, end, parameters.join(",")],
    queryFn: () =>
      fetchNasaPower({ lat: lat as number, lon: lon as number, temporal, start, end, parameters }),
    enabled: lat != null && lon != null,
    placeholderData: keepPreviousData,
    staleTime: 6 * 60 * 60 * 1000, // mirror the proxy's 6h cache
  })
}
