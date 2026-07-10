"use client"

import { useMemo } from "react"
import { Sun, Zap, BatteryCharging, Plug } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { DemoDataBadge } from "@/components/ui/demo-data-badge"
import { getLivePowerSnapshot } from "@/lib/dashboard/facility-demo-data"
import { useSimulatedTelemetry } from "@/hooks/use-simulated-telemetry"
import { useT } from "./facility-preferences-provider"
import { LiveIndicator } from "./live-indicator"

/**
 * Simulated live power readout: solar / grid / battery / load (kW) and battery
 * SoC, ticking every few seconds via useSimulatedTelemetry. Demonstrates the IoT
 * telemetry experience; pauses when offline/hidden/reduced-motion.
 */
export function PowerLiveReadout({
  facilityId,
  batteryLevel,
}: {
  facilityId?: string
  batteryLevel?: number
}) {
  const t = useT()
  const { tick, lastUpdated, live } = useSimulatedTelemetry()
  const snap = useMemo(
    () => getLivePowerSnapshot(facilityId, tick, batteryLevel),
    [facilityId, tick, batteryLevel],
  )

  const items = [
    { key: "solar", icon: Sun, label: t("telemetry.solar"), value: `${snap.solarKw.toFixed(2)} kW` },
    { key: "grid", icon: Zap, label: t("telemetry.grid"), value: `${snap.gridKw.toFixed(2)} kW` },
    {
      key: "battery",
      icon: BatteryCharging,
      label: t("telemetry.battery"),
      value: `${snap.batteryKw >= 0 ? "+" : ""}${snap.batteryKw.toFixed(2)} kW · ${snap.batterySocPct}%`,
    },
    { key: "load", icon: Plug, label: t("telemetry.load"), value: `${snap.loadKw.toFixed(2)} kW` },
  ]

  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-foreground">{t("telemetry.liveReadout")}</h3>
            <DemoDataBadge />
          </div>
          <LiveIndicator live={live} lastUpdated={lastUpdated} />
        </div>
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {items.map((it) => {
            const Icon = it.icon
            return (
              <div key={it.key} className="rounded-lg border border-border p-3">
                <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Icon className="size-3.5" aria-hidden />
                  {it.label}
                </dt>
                <dd className="mt-1 text-sm font-semibold tabular-nums text-foreground">{it.value}</dd>
              </div>
            )
          })}
        </dl>
      </CardContent>
    </Card>
  )
}
