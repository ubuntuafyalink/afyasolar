"use client"

import { useMemo, useState } from "react"
import { Landmark, Building2, Gauge, ShieldAlert, Baby } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { FOCUS_RING } from "@/lib/dashboard/facility-ui"
import { DemoDataBadge } from "@/components/ui/demo-data-badge"
import { LazyMotionProvider } from "@/components/motion/lazy-motion-provider"
import { FacilityToolbar } from "@/components/dashboard/facility/facility-toolbar"
import { OfflineReadyBadge } from "@/components/dashboard/facility/offline-ready-badge"
import { OfflineBanner } from "@/components/dashboard/facility/offline-banner"
import { FacilityLocatorMap } from "@/components/dashboard/facility/facility-locator-map"
import { useFacilityPreferences } from "@/components/dashboard/facility/facility-preferences-provider"
import {
  getDistricts,
  getDistrictSummary,
  type SurgeHazard,
} from "@/lib/dashboard/district-data"
import { DistrictSurgePanel } from "./district-surge-panel"

/**
 * District Health Office dashboard (frontend + simulated data). Built around
 * PROACTIVE SURGE PLANNING: pick a district and a hazard scenario, see which
 * facilities and child services would be hit hardest, and where to pre-position
 * resources. Bilingual + accessible; reuses the per-facility seed.
 */
export function DistrictDashboard() {
  const { t } = useFacilityPreferences()
  const districts = useMemo(() => getDistricts(), [])
  const [district, setDistrict] = useState(districts[0])
  const [hazard, setHazard] = useState<SurgeHazard>("flood")
  const summary = useMemo(() => getDistrictSummary(district), [district])

  return (
    <LazyMotionProvider>
      <div className="min-h-screen bg-muted/30">
        <OfflineBanner />
        <header className="sticky top-0 z-30 border-b border-border bg-card shadow-sm">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-2 min-w-0">
              <Landmark className="size-6 text-primary" aria-hidden />
              <h1 className="truncate text-xl font-semibold text-foreground sm:text-2xl">
                {t("district.title")}
              </h1>
            </div>
            <FacilityToolbar />
          </div>
        </header>

        <main id="district-main" className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <p className="max-w-2xl text-sm text-muted-foreground">{t("district.subtitle")}</p>
            <div className="flex items-center gap-2">
              <OfflineReadyBadge />
              <DemoDataBadge />
            </div>
          </div>

          {/* District selector */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-foreground">{t("district.selectDistrict")}:</span>
            <div className="flex flex-wrap gap-2" role="group" aria-label={t("district.selectDistrict")}>
              {districts.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDistrict(d)}
                  aria-pressed={d === district}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                    FOCUS_RING,
                    d === district
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-muted-foreground hover:bg-muted",
                  )}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Kpi icon={<Building2 className="size-4" aria-hidden />} value={summary.facilities} label={t("district.kpi.facilities")} />
            <Kpi icon={<Gauge className="size-4" aria-hidden />} value={summary.avgRcs} label={t("district.kpi.avgRcs")} />
            <Kpi icon={<ShieldAlert className="size-4" aria-hidden />} value={summary.lowResilienceSites} label={t("district.kpi.lowResilience")} tone={summary.lowResilienceSites > 0} />
            <Kpi icon={<Baby className="size-4" aria-hidden />} value={summary.childAtRiskSites} label={t("district.kpi.childAtRisk")} tone={summary.childAtRiskSites > 0} />
          </div>

          {/* Surge planning */}
          <DistrictSurgePanel district={district} hazard={hazard} onHazard={setHazard} />

          {/* Map */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{t("district.map.title")}</CardTitle>
            </CardHeader>
            <CardContent>
              <FacilityLocatorMap region={district} facilityName={district} />
            </CardContent>
          </Card>
        </main>
      </div>
    </LazyMotionProvider>
  )
}

function Kpi({
  icon,
  value,
  label,
  tone,
}: {
  icon: React.ReactNode
  value: React.ReactNode
  label: string
  tone?: boolean
}) {
  return (
    <Card className={cn(tone && "border-destructive/30 bg-destructive/5")}>
      <CardContent className="flex flex-col gap-1 p-3">
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {icon}
          <span className="truncate">{label}</span>
        </span>
        <span className="text-2xl font-bold tabular-nums text-foreground">{value}</span>
      </CardContent>
    </Card>
  )
}
