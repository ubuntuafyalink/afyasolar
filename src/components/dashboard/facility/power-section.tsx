"use client"

import { PowerSourceIndicator } from "./power-source-indicator"
import { ServiceHoursRemaining } from "./service-hours-remaining"
import { PowerFlowSankey } from "./power-flow-sankey"
import { Power24hArea } from "./power-24h-area"
import { PowerForecast12h } from "./power-forecast-12h"
import { SolarForecast7d } from "./solar-forecast-7d"

/**
 * Spec 8.2 "Umeme detail" → the Power section. Current source, power-flow
 * diagram, 24h stacked area by source, 12h forecast, service-hours-remaining,
 * and the 7-day solar forecast. Distinct from the existing "Energy" section
 * (consumption history), which is left unchanged. Desktop-first.
 */
export function PowerSection({
  facilityId,
  batteryLevel,
}: {
  facilityId?: string
  batteryLevel?: number
}) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Power</h2>
        <p className="text-sm text-muted-foreground">
          Where your power is coming from now and what to expect today.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <PowerSourceIndicator facilityId={facilityId} batteryLevel={batteryLevel} />
        <ServiceHoursRemaining facilityId={facilityId} batteryLevel={batteryLevel} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <PowerFlowSankey facilityId={facilityId} batteryLevel={batteryLevel} />
        <PowerForecast12h facilityId={facilityId} />
      </div>

      <Power24hArea facilityId={facilityId} />
      <SolarForecast7d facilityId={facilityId} />
    </div>
  )
}
