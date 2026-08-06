"use client"

import { useQuery } from "@tanstack/react-query"

/** Subset of /api/admin/facilities/comprehensive we consume for the portfolio. */
export type ComprehensiveFacility = {
  id: string
  name: string
  region: string | null
  city: string | null
  category: string | null
  status: string | null
  latitude: number | null
  longitude: number | null
  deviceCount: number
  activeDevices: number
  inactiveDevices: number
  userCount: number
}

/** All facilities with coordinates + device/user counts (admin only). */
export function useAdminFacilitiesComprehensive() {
  return useQuery({
    queryKey: ["admin-facilities-comprehensive"],
    queryFn: async () => {
      const res = await fetch("/api/admin/facilities/comprehensive", { cache: "no-store" })
      if (!res.ok) throw new Error("Failed to load facilities")
      const json = await res.json()
      if (!json?.success) throw new Error(json?.error || "Invalid response")
      return json.data as ComprehensiveFacility[]
    },
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  })
}
