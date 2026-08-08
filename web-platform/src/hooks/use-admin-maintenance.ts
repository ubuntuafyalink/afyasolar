"use client"

import { useQuery } from "@tanstack/react-query"

import type {
  FacilityMaintenance,
  PortfolioMaintenanceAggregate,
} from "@/lib/ai/portfolio-maintenance-server"

export type AdminMaintenanceData = {
  rows: FacilityMaintenance[]
  aggregate: PortfolioMaintenanceAggregate
}

/** Portfolio predictive-maintenance summary (RUL + anomaly per facility), admin. */
export function useAdminMaintenance() {
  return useQuery({
    queryKey: ["admin-maintenance"],
    queryFn: async (): Promise<AdminMaintenanceData> => {
      const res = await fetch("/api/admin/solar/maintenance", { cache: "no-store" })
      if (!res.ok) throw new Error("Failed to load portfolio maintenance")
      const json = await res.json()
      if (!json?.success) throw new Error(json?.error || "Invalid response")
      return {
        rows: (json.data ?? []) as FacilityMaintenance[],
        aggregate: json.aggregate as PortfolioMaintenanceAggregate,
      }
    },
    staleTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
  })
}
