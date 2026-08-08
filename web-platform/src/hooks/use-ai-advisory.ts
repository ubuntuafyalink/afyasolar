"use client"

import { useQuery } from "@tanstack/react-query"

import { fetchAiAdvisory, type AiAdvisory, type AiAdvisoryMedical } from "@/lib/ai/advisory-service"

export type UseAiAdvisoryArgs = {
  facilityId: string | null
  lat?: number
  lon?: number
  ageDays?: number
  systemKw?: number
  batteryLevel?: number
  lang?: "en" | "sw"
  medical?: AiAdvisoryMedical
  enabled?: boolean
}

/** Facility operations advisory via the internal /api/ai/advisory proxy. */
export function useAiAdvisory(args: UseAiAdvisoryArgs) {
  const { facilityId, lat, lon, ageDays, systemKw, batteryLevel, lang, medical, enabled = true } = args
  return useQuery<AiAdvisory>({
    queryKey: [
      "ai-advisory", facilityId, lat ?? null, lon ?? null, ageDays ?? null, systemKw ?? null,
      batteryLevel ?? null, lang ?? "en", medical?.total_daily_load ?? null,
    ],
    queryFn: () =>
      fetchAiAdvisory({ facilityId: facilityId as string, lat, lon, ageDays, systemKw, batteryLevel, lang, medical }),
    enabled: enabled && !!facilityId,
    staleTime: 10 * 60 * 1000,
    retry: 1,
  })
}
