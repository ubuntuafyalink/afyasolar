"use client"

import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { Sliders, AlertTriangle, ArrowUpRight, Info } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import {
  resolveCoords,
  rangeForPreset,
  toSolarResource,
  fetchNasaPower,
  SOLAR_PARAMETERS,
  type NasaPowerResponse,
} from "@/lib/climate/nasa-power"
import { deriveEnergyProfile, DEFAULT_ENERGY_PROFILE, BATTERY_DOD } from "@/lib/dashboard/power-model"
import { buildDemandActions, type DemandPriority } from "@/lib/intelligence/demand-management"
import type { MeuSummary, SizingSummary } from "@/components/solar/afya-solar-sizing-tool"
import { useFacilityPreferences } from "./facility-preferences-provider"

const PRIORITY_STYLE: Record<DemandPriority, { border: string; icon: typeof AlertTriangle; label: string }> = {
  critical: { border: "border-destructive/30 bg-destructive/5", icon: AlertTriangle, label: "critical" },
  high: { border: "border-warning/30 bg-warning/5", icon: ArrowUpRight, label: "high" },
  advisory: { border: "border-border bg-muted/30", icon: Info, label: "advisory" },
}

/**
 * "Load plan" — advisory demand-management from the facility's real energy state
 * (battery autonomy + today's solar). Tells staff which loads to shed or schedule
 * and when. Advisory only: the platform does not actuate any hardware.
 */
export function DemandManagementCard({
  facilityId,
  region,
  meuSummary,
  sizingSummary,
}: {
  facilityId?: string
  region?: string | null
  meuSummary?: MeuSummary | null
  sizingSummary?: SizingSummary | null
}) {
  const { locale } = useFacilityPreferences()
  const pick = (b: { en: string; sw: string }) => (locale === "sw" ? b.sw : b.en)

  const coords = useMemo(() => resolveCoords({ facilityId, region }), [facilityId, region])
  const range = useMemo(() => rangeForPreset("1y"), [])
  const solarQuery = useQuery<NasaPowerResponse>({
    queryKey: ["demand-solar", coords.lat, coords.lon, range.start, range.end],
    queryFn: () =>
      fetchNasaPower({
        lat: coords.lat,
        lon: coords.lon,
        temporal: range.temporal,
        start: range.start,
        end: range.end,
        parameters: SOLAR_PARAMETERS,
      }),
    staleTime: 6 * 60 * 60 * 1000,
  })

  const actions = useMemo(() => {
    const profile = deriveEnergyProfile(meuSummary, sizingSummary) ?? DEFAULT_ENERGY_PROFILE
    const solar = solarQuery.data ? toSolarResource(solarQuery.data) : null
    const autonomyHours =
      profile.criticalLoadKw > 0 ? (profile.batteryCapacityKwh * BATTERY_DOD * 0.9) / profile.criticalLoadKw : 0
    return buildDemandActions({
      autonomyHours,
      peakSunHours: solar?.peakSunHours ?? 4.2,
      sky: solar?.sky ?? "partly",
      criticalLoadKw: profile.criticalLoadKw,
      solarCapacityKw: profile.solarCapacityKw,
      dailyLoadKwh: profile.dailyLoadKwh,
    })
  }, [meuSummary, sizingSummary, solarQuery.data])

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sliders className="size-5 text-primary" aria-hidden /> Load plan
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Advisory demand management from your real energy state — what to shed or schedule (not automated).
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        {actions.map((a, i) => {
          const style = PRIORITY_STYLE[a.priority]
          const Icon = style.icon
          return (
            <div key={i} className={cn("rounded-lg border p-3", style.border)}>
              <div className="flex items-center gap-2">
                <Icon
                  className={cn(
                    "size-4 shrink-0",
                    a.priority === "critical" ? "text-destructive" : a.priority === "high" ? "text-warning" : "text-muted-foreground",
                  )}
                  aria-hidden
                />
                <span className="text-sm font-medium text-foreground">{pick(a.title)}</span>
              </div>
              <p className="mt-1 pl-6 text-xs text-muted-foreground">{pick(a.detail)}</p>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
