"use client"

import { BatteryCharging, Sun, Zap } from "lucide-react"
import type { LucideIcon } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { getPowerSnapshot, type PowerSource } from "@/lib/dashboard/facility-demo-data"
import type { PowerInputs } from "@/lib/dashboard/power-model"

const SOURCE_META: Record<
  PowerSource,
  { icon: LucideIcon; label: string; tint: string; chip: string }
> = {
  solar: {
    icon: Sun,
    label: "Running on solar",
    tint: "border-warning/40 bg-warning/5",
    chip: "bg-warning/15 text-warning-foreground",
  },
  grid: {
    icon: Zap,
    label: "Running on grid (TANESCO)",
    tint: "border-primary/30 bg-primary/5",
    chip: "bg-primary/10 text-primary",
  },
  battery: {
    icon: BatteryCharging,
    label: "Running on battery",
    tint: "border-success/30 bg-success/5",
    chip: "bg-success/10 text-success",
  },
}

/** Spec 8.2 "Umeme detail": current power source as a single large coloured icon. */
export function PowerSourceIndicator({
  facilityId,
  batteryLevel,
  inputs,
}: {
  facilityId?: string
  batteryLevel?: number
  inputs?: PowerInputs | null
}) {
  const snap = getPowerSnapshot(facilityId, batteryLevel, inputs ?? undefined)
  const meta = SOURCE_META[snap.activeSource]
  const Icon = meta.icon

  return (
    <Card className={cn("border-2", meta.tint)}>
      <CardContent className="flex items-center gap-4 p-5">
        <span className={cn("flex size-16 shrink-0 items-center justify-center rounded-xl", meta.chip)}>
          <Icon className="size-9" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-lg font-semibold text-foreground">{meta.label}</p>
          <p className="text-sm text-muted-foreground">
            Load {snap.loadKw.toFixed(1)} kW · Battery {snap.batterySocPct}%
            {snap.batteryKw > 0 ? " (charging)" : snap.batteryKw < 0 ? " (in use)" : ""}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
