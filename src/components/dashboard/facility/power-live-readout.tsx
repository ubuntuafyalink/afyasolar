"use client"

import { Sun, Zap, BatteryCharging, Plug } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { getPowerSnapshot } from "@/lib/dashboard/facility-demo-data"
import type { PowerInputs } from "@/lib/dashboard/power-model"
import { useT } from "./facility-preferences-provider"

/**
 * Current power readout: solar / grid / battery / load (kW) and battery SoC.
 * A stable snapshot computed from the facility's assessed load + sized solar +
 * Climate Outlook solar resource (no per-second ticking).
 */
export function PowerLiveReadout({
  facilityId,
  batteryLevel,
  inputs,
}: {
  facilityId?: string
  batteryLevel?: number
  inputs?: PowerInputs | null
}) {
  const t = useT()
  const snap = getPowerSnapshot(facilityId, batteryLevel, inputs ?? undefined)

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
          <h3 className="text-sm font-semibold text-foreground">{t("power.readoutTitle")}</h3>
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
