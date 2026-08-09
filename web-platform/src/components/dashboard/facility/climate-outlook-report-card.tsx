"use client"

import { useAiForecast } from "@/hooks/use-ai-forecast"
import { useOutlookReport } from "@/hooks/use-outlook-report"
import { OutlookReportView } from "@/components/dashboard/outlook-report-view"
import type { Locale } from "@/lib/dashboard/explainer-copy"
import { useFacilityPreferences } from "./facility-preferences-provider"

/**
 * Facility climate outlook report: recommended actions / safe-outlook derived
 * from the same forecast the AiForecastCard above shows. Calls useAiForecast
 * with the SAME arguments (incl. the systemKw default of 5 and the shared
 * months window lifted into the section) so React Query serves it from the
 * forecast card's cache — keep the defaults in lockstep.
 */
export function ClimateOutlookReportCard({
  lat,
  lon,
  systemKw = 5,
  months,
}: {
  lat: number
  lon: number
  systemKw?: number
  months?: number
}) {
  const locale = (useFacilityPreferences().locale as Locale) ?? "en"

  const forecast = useAiForecast({ lat, lon, horizon: "monthly", systemKw, months })
  const report = useOutlookReport({
    hazards: forecast.data?.hazards,
    lang: locale,
    scope: "facility",
    enabled: !!forecast.data,
  })

  return (
    <OutlookReportView
      report={report.data}
      isLoading={forecast.isLoading || report.isLoading}
      isError={forecast.isError || report.isError}
      locale={locale}
    />
  )
}
