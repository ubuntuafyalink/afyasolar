"use client"

import { useAdminPortfolioForecast } from "@/hooks/use-admin-portfolio-forecast"
import { useOutlookReport } from "@/hooks/use-outlook-report"
import { OutlookReportView } from "@/components/dashboard/outlook-report-view"

/**
 * Portfolio climate outlook report (admin): recommended actions / safe-outlook
 * derived from the same portfolio aggregate the AdminPortfolioForecastCard
 * shows. `months` must be the forecast card's window (lifted into the page) so
 * report and card always describe the same forecast. English-only, like the
 * rest of the admin surface.
 */
export function AdminOutlookReportCard({ months }: { months: number }) {
  const forecast = useAdminPortfolioForecast(months)
  const agg = forecast.data?.aggregate

  const report = useOutlookReport({
    hazards: agg ? { ...agg.byHazard, composite: agg.composite } : undefined,
    lang: "en",
    scope: "portfolio",
    facilityCount: agg?.facilitiesForecast,
    enabled: !!agg,
  })

  return (
    <OutlookReportView
      report={report.data}
      isLoading={forecast.isLoading || report.isLoading}
      isError={forecast.isError || report.isError}
      locale="en"
    />
  )
}
