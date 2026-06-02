"use client"

import { useState } from "react"
import { Droplets, Flame, Sun, Wind } from "lucide-react"
import type { LucideIcon } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DemoDataBadge } from "@/components/ui/demo-data-badge"
import { cn } from "@/lib/utils"
import { FOCUS_RING } from "@/lib/dashboard/facility-ui"
import { getResiHealthCvi } from "@/lib/dashboard/facility-demo-data"

const HAZARD_META: { key: keyof ReturnType<typeof getResiHealthCvi>["byHazard"]; label: string; icon: LucideIcon }[] = [
  { key: "flood", label: "Flood", icon: Droplets },
  { key: "drought", label: "Drought", icon: Sun },
  { key: "heat", label: "Heat", icon: Flame },
  { key: "storm", label: "Storm", icon: Wind },
]

function cviColor(v: number): string {
  if (v >= 66) return "bg-destructive"
  if (v >= 40) return "bg-warning"
  return "bg-success"
}

/**
 * Spec 10.5: the Resi-Health Grid Climate Vulnerability Index (0100), stratified
 * by hazard and projected to 2030 / 2050.
 *
 * [data] fed by the local demo module. TODO: wire the real Resi-Health Grid
 * (NASA POWER, ERA5, CHIRPS, flood layers, Bayesian model) per spec Part 10.5.
 */
export function CviPanel({ facilityId }: { facilityId?: string }) {
  const [year, setYear] = useState<2030 | 2050>(2030)
  const cvi = getResiHealthCvi(facilityId, year)

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base">Climate Vulnerability Index</CardTitle>
          <DemoDataBadge />
        </div>
        <div className="flex items-center gap-2 pt-1">
          {([2030, 2050] as const).map((y) => (
            <button
              key={y}
              type="button"
              aria-pressed={year === y}
              onClick={() => setYear(y)}
              className={cn(
                "rounded-md border px-3 py-1 text-sm font-medium transition-colors",
                FOCUS_RING,
                year === y
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground hover:bg-muted",
              )}
            >
              {y}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4 rounded-lg border border-border p-4">
          <div>
            <p className="text-xs text-muted-foreground">Composite CVI · {year}</p>
            <p className="text-4xl font-black tracking-tight text-foreground">{cvi.composite}</p>
          </div>
          <Badge
            variant="secondary"
            className={cn(
              cvi.composite >= 66
                ? "bg-destructive/10 text-destructive"
                : cvi.composite >= 40
                  ? "bg-warning/15 text-warning-foreground"
                  : "bg-success/10 text-success",
            )}
          >
            {cvi.composite >= 66 ? "High" : cvi.composite >= 40 ? "Moderate" : "Lower"} vulnerability
          </Badge>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {HAZARD_META.map((h) => {
            const v = cvi.byHazard[h.key]
            const Icon = h.icon
            return (
              <div key={h.key} className="space-y-1">
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="flex items-center gap-1.5 font-medium text-foreground">
                    <Icon className="size-4 text-muted-foreground" aria-hidden />
                    {h.label}
                  </span>
                  <span className="text-xs text-muted-foreground">{v}/100</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div className={cn("h-full rounded-full", cviColor(v))} style={{ width: `${v}%` }} />
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
