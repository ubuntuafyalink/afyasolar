"use client"

import { useQuery } from "@tanstack/react-query"

import { fetchAiMaintenance, type AiMaintenance } from "@/lib/ai/maintenance-service"

export type UseAiMaintenanceArgs = {
  facilityId: string | null
  ageDays?: number
  systemKw?: number
  enabled?: boolean
}

/** Battery RUL + anomaly for a facility via the internal /api/ai/maintenance proxy. */
export function useAiMaintenance(args: UseAiMaintenanceArgs) {
  const { facilityId, ageDays, systemKw, enabled = true } = args
  return useQuery<AiMaintenance>({
    queryKey: ["ai-maintenance", facilityId, ageDays ?? null, systemKw ?? null],
    queryFn: () => fetchAiMaintenance({ facilityId: facilityId as string, ageDays, systemKw }),
    enabled: enabled && !!facilityId,
    staleTime: 10 * 60 * 1000,
    retry: 1,
  })
}
