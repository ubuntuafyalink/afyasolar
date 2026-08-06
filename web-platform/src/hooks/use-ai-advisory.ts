"use client"

import { useQuery } from "@tanstack/react-query"

import { fetchAiAdvisory, type AiAdvisory } from "@/lib/ai/advisory-service"

export type UseAiAdvisoryArgs = {
  facilityId: string | null
  lat?: number
  lon?: number
  ageDays?: number
  systemKw?: number
  enabled?: boolean
}

/** LLM advisory for a facility via the internal /api/ai/advisory proxy. */
export function useAiAdvisory(args: UseAiAdvisoryArgs) {
  const { facilityId, lat, lon, ageDays, systemKw, enabled = true } = args
  return useQuery<AiAdvisory>({
    queryKey: ["ai-advisory", facilityId, lat ?? null, lon ?? null, ageDays ?? null, systemKw ?? null],
    queryFn: () =>
      fetchAiAdvisory({ facilityId: facilityId as string, lat, lon, ageDays, systemKw }),
    enabled: enabled && !!facilityId,
    staleTime: 10 * 60 * 1000,
    retry: 1,
  })
}
