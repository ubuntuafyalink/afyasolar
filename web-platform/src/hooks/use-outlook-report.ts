"use client"

import { useQuery } from "@tanstack/react-query"

import {
  fetchOutlookReport,
  type AiOutlookReport,
  type OutlookHazardsInput,
} from "@/lib/ai/outlook-report-service"

export type UseOutlookReportArgs = {
  hazards?: OutlookHazardsInput
  lang?: "en" | "sw"
  scope?: "facility" | "portfolio"
  facilityCount?: number
  enabled?: boolean
}

/**
 * Climate outlook report via /api/ai/outlook-report, derived from hazard scores
 * the caller already has (e.g. from useAiForecast or the portfolio aggregate).
 * Only fetches once hazards are available; cached per scope + language + scores.
 */
export function useOutlookReport({ hazards, lang = "en", scope = "facility", facilityCount, enabled = true }: UseOutlookReportArgs) {
  return useQuery<AiOutlookReport>({
    queryKey: [
      "outlook-report", scope, lang,
      hazards?.heat ?? null, hazards?.flood ?? null, hazards?.storm ?? null,
      hazards?.drought ?? null, hazards?.composite ?? null,
      facilityCount ?? null,
    ],
    queryFn: () =>
      fetchOutlookReport({
        hazards: hazards as OutlookHazardsInput,
        lang,
        scope,
        context: facilityCount ? { facility_count: facilityCount } : undefined,
      }),
    enabled: enabled && hazards != null,
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  })
}
