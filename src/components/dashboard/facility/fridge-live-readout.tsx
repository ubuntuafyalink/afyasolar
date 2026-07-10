"use client"

import { useMemo } from "react"
import { Thermometer } from "lucide-react"

import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { DemoDataBadge } from "@/components/ui/demo-data-badge"
import { getLiveFridgeTempC } from "@/lib/dashboard/facility-demo-data"
import { useSimulatedTelemetry } from "@/hooks/use-simulated-telemetry"
import { useT } from "./facility-preferences-provider"
import { LiveIndicator } from "./live-indicator"

/** Simulated live fridge interior temperature, ticking with the telemetry feed. */
export function FridgeLiveReadout({ facilityId }: { facilityId?: string }) {
  const t = useT()
  const { tick, lastUpdated, live } = useSimulatedTelemetry()
  const tempC = useMemo(() => getLiveFridgeTempC(facilityId, tick), [facilityId, tick])
  const safe = tempC >= 2 && tempC <= 8

  return (
    <Card>
      <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-lg",
              safe ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive",
            )}
          >
            <Thermometer className="size-5" aria-hidden />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold tabular-nums text-foreground">
                {tempC.toFixed(1)}°C
              </span>
              <DemoDataBadge />
            </div>
            <p className={cn("text-xs", safe ? "text-success" : "text-destructive")}>
              {safe ? t("telemetry.fridgeSafe") : t("telemetry.fridgeUnsafe")}
            </p>
          </div>
        </div>
        <LiveIndicator live={live} lastUpdated={lastUpdated} />
      </CardContent>
    </Card>
  )
}
