"use client"

import { useQuery } from "@tanstack/react-query"

/** Persisted CRiPHC score summary (the real, assessed RCS) for a facility. */
export type FacilityRcsSummary = {
  assessmentCycleId: string
  cycleStatus: string | null
  hes: number
  csf: number
  ecpq: number
  edc: number
  rrc: number
  rcs: number
  tier: number | null
  formulaVersion: string | null
  hesFromClimate: boolean
  criticalAttention: boolean
  assessedAt: string | null
}

async function fetchRcsSummary(facilityId: string): Promise<FacilityRcsSummary | null> {
  const res = await fetch(`/api/facility/${facilityId}/rcs-summary`, { cache: "no-store" })
  if (!res.ok) throw new Error(`rcs-summary ${res.status}`)
  const json = (await res.json()) as { summary: FacilityRcsSummary | null }
  return json.summary ?? null
}

/**
 * React Query hook for a facility's most recent persisted CRiPHC assessment
 * score. Returns `null` (not an error) when the facility has never been assessed,
 * so the UI can show an honest "not yet assessed" state instead of a fake score.
 * Disabled until a facilityId is known.
 */
export function useFacilityRcsSummary(facilityId?: string) {
  return useQuery<FacilityRcsSummary | null>({
    queryKey: ["facility-rcs-summary", facilityId],
    queryFn: () => fetchRcsSummary(facilityId as string),
    enabled: Boolean(facilityId),
    staleTime: 5 * 60 * 1000,
  })
}
