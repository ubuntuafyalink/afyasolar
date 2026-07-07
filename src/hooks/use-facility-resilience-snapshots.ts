"use client"

import { useQuery } from "@tanstack/react-query"

/** One month of real, persisted resilience history for a facility. */
export type ResilienceSnapshot = {
  periodMonth: string
  rcs: number
  adaptationCompletionPct: number | null
}

async function fetchSnapshots(facilityId: string): Promise<ResilienceSnapshot[]> {
  const res = await fetch(`/api/facility/${facilityId}/resilience-snapshots`, { cache: "no-store" })
  if (!res.ok) throw new Error(`resilience-snapshots ${res.status}`)
  const json = (await res.json()) as { snapshots: ResilienceSnapshot[] }
  return json.snapshots ?? []
}

/**
 * React Query hook for a facility's real monthly resilience history. Returns an
 * empty array (not an error) when no snapshots have accrued yet, so the RCS trend
 * chart can fall back to an illustrative series. Disabled until a facilityId is set.
 */
export function useFacilityResilienceSnapshots(facilityId?: string) {
  return useQuery<ResilienceSnapshot[]>({
    queryKey: ["facility-resilience-snapshots", facilityId],
    queryFn: () => fetchSnapshots(facilityId as string),
    enabled: Boolean(facilityId),
    staleTime: 30 * 60 * 1000,
  })
}
