"use client"

import { useMemo } from "react"
import { CloudSun, Satellite } from "lucide-react"
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DemoDataBadge } from "@/components/ui/demo-data-badge"
import { getHazardTrend } from "@/lib/dashboard/facility-demo-data"
import { HazardScorePanel } from "./hazard-score-panel"
import { CviPanel } from "./cvi-panel"
import { FacilityLocatorMap } from "./facility-locator-map"
import { OfflineReadyBadge } from "./offline-ready-badge"
import { useFacilityPreferences } from "./facility-preferences-provider"

const HAZARD_LINES = [
  { key: "heat", color: "var(--color-chart-4)" },
  { key: "flood", color: "var(--color-chart-3)" },
  { key: "storm", color: "var(--color-chart-5)" },
  { key: "drought", color: "var(--color-chart-2)" },
] as const

/**
 * Climate Outlook a facility-facing view that frames hazard exposure as if
 * derived from climate datasets (NASA POWER / ERA5), with a multi-decade trend
 * chart, the existing hazard + CVI panels, and a schematic locator map.
 * Simulated data, clearly attributed.
 */
export function ClimateOutlookSection({
  facilityId,
  facilityName,
  region,
}: {
  facilityId?: string
  facilityName?: string | null
  region?: string | null
}) {
  const { t } = useFacilityPreferences()
  const trend = useMemo(() => getHazardTrend(facilityId), [facilityId])

  return (
    <section className="space-y-4" aria-labelledby="climate-outlook-title">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <CloudSun className="size-5 text-primary" aria-hidden />
            <h2 id="climate-outlook-title" className="text-xl font-semibold text-foreground">
              {t("climateOutlook.title")}
            </h2>
          </div>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            {t("climateOutlook.subtitle")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <OfflineReadyBadge />
          <DemoDataBadge />
        </div>
      </div>

      {/* Dataset attribution */}
      <p className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground">
        <Satellite className="size-3.5" aria-hidden />
        {t("climateOutlook.source")}
      </p>

      {/* Hazard trend chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t("climateOutlook.trendTitle")}</CardTitle>
          <p className="text-xs text-muted-foreground">{t("climateOutlook.trendHint")}</p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={trend} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="year" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  fontSize: 12,
                  borderRadius: 8,
                  border: "1px solid var(--color-border)",
                  background: "var(--color-card)",
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {HAZARD_LINES.map((h) => (
                <Line
                  key={h.key}
                  type="monotone"
                  dataKey={h.key}
                  name={t(`climateOutlook.hazard.${h.key}`)}
                  stroke={h.color}
                  strokeWidth={2}
                  dot={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Hazard scores + CVI (reused panels) */}
      {showSkeleton ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="h-64 animate-pulse rounded-md bg-muted" aria-hidden />
          <div className="h-64 animate-pulse rounded-md bg-muted" aria-hidden />
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <HazardScorePanel facilityId={facilityId} scores={showReal ? realScores ?? undefined : undefined} live={showReal} />
          <CviPanel
            facilityId={facilityId}
            baseCvi={showReal ? realCvi ?? undefined : undefined}
            trend={showReal ? realTrend ?? undefined : undefined}
            live={showReal}
          />
        </div>
      )}

      {/* Locator map */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t("climateOutlook.mapTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <FacilityLocatorMap region={region} facilityName={facilityName} />
        </CardContent>
      </Card>
    </section>
  )
}
