"use client"

import { useMemo } from "react"
import { Satellite } from "lucide-react"

import {
  resolveCoords,
  rangeForPreset,
  toSolarResource,
  SOLAR_PARAMETERS,
} from "@/lib/climate/nasa-power"
import { useNasaPower } from "@/hooks/use-nasa-power"
import { deriveEnergyProfile, DEFAULT_ENERGY_PROFILE, type PowerInputs } from "@/lib/dashboard/power-model"
import type { MeuSummary, SizingSummary } from "@/components/solar/afya-solar-sizing-tool"
import { PowerSourceIndicator } from "./power-source-indicator"
import { ServiceHoursRemaining } from "./service-hours-remaining"
import { PowerFlowSankey } from "./power-flow-sankey"
import { Power24hArea } from "./power-24h-area"
import { PowerForecast12h } from "./power-forecast-12h"
import { SolarForecast7d } from "./solar-forecast-7d"
import { PowerLiveReadout } from "./power-live-readout"
import { PowerInterpretation } from "./power-interpretation"
import { useT } from "./facility-preferences-provider"

/**
 * Spec 8.2 "Umeme detail" -> the Power section. When the facility has an Energy
 * Efficiency assessment, the readouts, power flow, autonomy and forecasts are
 * anchored to the REAL assessed load + sized solar, and the expected solar
 * curves are shaped by the REAL Climate Outlook solar resource (NASA POWER
 * peak-sun-hours). Falls back to seeded demo when no assessment is available.
 */
export function PowerSection({
  facilityId,
  batteryLevel,
  meuSummary,
  sizingSummary,
  region,
}: {
  facilityId?: string
  batteryLevel?: number
  meuSummary?: MeuSummary | null
  sizingSummary?: SizingSummary | null
  region?: string | null
}) {
  const t = useT()

  // Prefer the facility's Energy Efficiency assessment; otherwise a deterministic
  // default profile so the page is always constant and climate-anchored.
  const assessed = useMemo(
    () => deriveEnergyProfile(meuSummary, sizingSummary),
    [meuSummary, sizingSummary],
  )
  const profile = assessed ?? DEFAULT_ENERGY_PROFILE
  const hasAssessment = assessed != null

  // Real solar resource from Climate Outlook (peak-sun-hours) for the facility.
  const coords = useMemo(() => resolveCoords({ facilityId, region }), [facilityId, region])
  const range = useMemo(() => rangeForPreset("1y"), [])
  const climate = useNasaPower({
    lat: coords.lat,
    lon: coords.lon,
    temporal: range.temporal,
    start: range.start,
    end: range.end,
    parameters: SOLAR_PARAMETERS,
  })
  const solar = useMemo(() => (climate.data ? toSolarResource(climate.data) : null), [climate.data])

  const inputs: PowerInputs = {
    ...profile,
    peakSunHours: solar?.peakSunHours ?? 4.2,
    sky: solar?.sky ?? "partly",
  }

  const badgeLabel = hasAssessment
    ? solar
      ? t("power.basedOnBoth")
      : t("power.basedOnEnergy")
    : t("power.basedOnClimate")

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold text-foreground">{t("power.title")}</h2>
          <p className="text-sm text-muted-foreground">{t("power.subtitle")}</p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-md border border-success/30 bg-success/10 px-2 py-0.5 text-[11px] font-medium text-success">
          <Satellite className="size-3" aria-hidden />
          {badgeLabel}
        </span>
      </div>

      <PowerLiveReadout facilityId={facilityId} batteryLevel={batteryLevel} inputs={inputs} />

      <PowerInterpretation facilityId={facilityId} batteryLevel={batteryLevel} inputs={inputs} sky={solar?.sky} />

      <div className="grid gap-4 lg:grid-cols-2">
        <PowerSourceIndicator facilityId={facilityId} batteryLevel={batteryLevel} inputs={inputs} />
        <ServiceHoursRemaining facilityId={facilityId} batteryLevel={batteryLevel} inputs={inputs} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <PowerFlowSankey facilityId={facilityId} batteryLevel={batteryLevel} inputs={inputs} />
        <PowerForecast12h facilityId={facilityId} inputs={inputs} />
      </div>

      <Power24hArea facilityId={facilityId} inputs={inputs} />
      <SolarForecast7d facilityId={facilityId} inputs={inputs} />
    </div>
  )
}
