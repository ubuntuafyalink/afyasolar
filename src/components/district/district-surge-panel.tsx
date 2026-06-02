"use client"

import { useMemo } from "react"
import { Waves, Sun, Wind, Droplet, OctagonAlert, PackageCheck, type LucideIcon } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { FOCUS_RING } from "@/lib/dashboard/facility-ui"
import {
  getDistrictSurgePlan,
  SURGE_HAZARDS,
  SERVICE_RESOURCE_KEY,
  type SurgeHazard,
} from "@/lib/dashboard/district-data"
import { useFacilityPreferences } from "@/components/dashboard/facility/facility-preferences-provider"

const HAZARD_ICON: Record<SurgeHazard, LucideIcon> = {
  flood: Waves,
  heat: Sun,
  storm: Wind,
  drought: Droplet,
}

function impactColor(score: number): string {
  if (score >= 60) return "bg-destructive"
  if (score >= 35) return "bg-warning"
  return "bg-success"
}

export function DistrictSurgePanel({
  district,
  hazard,
  onHazard,
}: {
  district: string
  hazard: SurgeHazard
  onHazard: (h: SurgeHazard) => void
}) {
  const { t } = useFacilityPreferences()
  const plan = useMemo(() => getDistrictSurgePlan(district, hazard), [district, hazard])

  return (
    <div className="space-y-4">
      {/* Hazard scenario selector */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t("district.surge.title")}</CardTitle>
          <p className="text-xs text-muted-foreground">{t("district.surge.hint")}</p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2" role="group" aria-label={t("district.surge.title")}>
            {SURGE_HAZARDS.map((h) => {
              const Icon = HAZARD_ICON[h]
              const active = h === hazard
              return (
                <button
                  key={h}
                  type="button"
                  onClick={() => onHazard(h)}
                  aria-pressed={active}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                    FOCUS_RING,
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-muted-foreground hover:bg-muted",
                  )}
                >
                  <Icon className="size-4" aria-hidden />
                  {t(`district.hazard.${h}`)}
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Summary: high-impact count + pre-positioning */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className={plan.highImpactCount > 0 ? "border-destructive/30 bg-destructive/5" : undefined}>
          <CardContent className="flex items-center gap-3 p-4">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
              <OctagonAlert className="size-6" aria-hidden />
            </span>
            <div>
              <p className="text-3xl font-bold tabular-nums text-foreground">{plan.highImpactCount}</p>
              <p className="text-xs text-muted-foreground">{t("district.surge.highImpact")}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <PackageCheck className="size-4 text-primary" aria-hidden />
              {t("district.surge.prePosition")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {plan.affectedServiceCounts.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("district.surge.noAffected")}</p>
            ) : (
              <ul className="space-y-1.5 text-sm">
                {plan.affectedServiceCounts.map((a) => (
                  <li key={a.key} className="flex items-start gap-2">
                    <span className="mt-1 size-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                    <span className="text-foreground">
                      {t(SERVICE_RESOURCE_KEY[a.key])}{" "}
                      <span className="text-muted-foreground">
                        ({t("district.surge.sites", { n: a.sites })})
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Facilities ranked by surge impact */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t("district.ranking.title")}</CardTitle>
          <p className="text-xs text-muted-foreground">{t("district.ranking.hint")}</p>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {plan.facilities.map((f) => (
              <li key={f.facility.id} className="space-y-1.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <span className="text-sm font-medium text-foreground">{f.facility.name}</span>
                    <span className="ml-2 text-xs text-muted-foreground">{f.facility.district}</span>
                  </div>
                  <span className="text-sm font-semibold tabular-nums text-foreground">
                    {t("district.ranking.impact")} {f.impactScore}
                  </span>
                </div>
                <div
                  className="h-2 w-full overflow-hidden rounded-full bg-muted"
                  role="progressbar"
                  aria-valuenow={f.impactScore}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${f.facility.name} ${t("district.ranking.impact")}`}
                >
                  <div className={cn("h-full rounded-full", impactColor(f.impactScore))} style={{ width: `${f.impactScore}%` }} />
                </div>
                {f.affectedServices.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    {f.affectedServices.map((key) => (
                      <Badge key={key} variant="outline" className="text-[10px]">
                        {t(`service.${key}`)}
                      </Badge>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
