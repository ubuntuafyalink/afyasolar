"use client"

import { Battery, Clock, Cloud, CloudSun, Sun } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { getPowerToday } from "@/lib/dashboard/facility-demo-data"

const SOLAR_LABEL = { sunny: "Sunny", partly: "Partly cloudy", cloudy: "Cloudy" } as const
const SOLAR_ICON = { sunny: Sun, partly: CloudSun, cloudy: Cloud } as const

/**
 * Spec 8.2 "card two": today's power forecast. Three lines — expected hours of
 * power (from the 7-day forecast + solar profile), current battery State of
 * Charge, and expected solar (sunny / partly / cloudy).
 *
 * Battery % comes from live energy data when available; the rest is demo data.
 */
export function PowerTodayCard({
  facilityId,
  batteryLevel,
  className,
}: {
  facilityId?: string
  /** Live battery State of Charge (%) when available; falls back to demo data. */
  batteryLevel?: number
  className?: string
}) {
  const demo = getPowerToday(facilityId)
  const soc = typeof batteryLevel === "number" ? Math.round(batteryLevel) : demo.batterySocPct
  const SolarIcon = SOLAR_ICON[demo.expectedSolar]

  const rows = [
    {
      icon: <Clock className="size-5 text-primary" aria-hidden />,
      label: "Expected power today",
      value: `~${demo.expectedHours} hours`,
    },
    {
      icon: <Battery className="size-5 text-success" aria-hidden />,
      label: "Battery charge",
      value: `${soc}%`,
    },
    {
      icon: <SolarIcon className="size-5 text-warning-foreground" aria-hidden />,
      label: "Expected solar",
      value: SOLAR_LABEL[demo.expectedSolar],
    },
  ]

  return (
    <Card className={cn("flex flex-col", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Power today</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 space-y-3">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
              {row.icon}
            </span>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">{row.label}</p>
              <p className="text-lg font-semibold text-foreground">{row.value}</p>
            </div>
          </div>
        ))}
        {/* Battery level bar */}
        <div
          className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuenow={soc}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Battery charge"
        >
          <div
            className={cn(
              "h-full rounded-full transition-all",
              soc < 20 ? "bg-destructive" : soc < 50 ? "bg-warning" : "bg-success",
            )}
            style={{ width: `${Math.min(100, Math.max(0, soc))}%` }}
          />
        </div>
      </CardContent>
    </Card>
  )
}
