"use client"

import { useQuery } from "@tanstack/react-query"
import type { FacilitySolarOps } from "@/lib/solar/ops-types"

export type { FacilitySolarOps }

const KEY = ["admin-solar-ops-overview"]

/**
 * Per-facility admin Solar Operations dataset built from REAL assessment + climate
 * data (no device telemetry). Shared by the Estimated Energy, Readiness, Portfolio
 * Analytics, and Facility Status views.
 */
export function useAdminSolarOps() {
  return useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<FacilitySolarOps[]> => {
      const res = await fetch("/api/admin/solar/ops-overview", { cache: "no-store" })
      if (!res.ok) throw new Error("Failed to load solar operations data")
      const json = await res.json()
      if (!json?.success) throw new Error(json?.error || "Invalid response")
      return json.data as FacilitySolarOps[]
    },
    refetchInterval: 5 * 60_000,
    refetchOnWindowFocus: false,
  })
}
