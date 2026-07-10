"use client"

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { Cloud, CloudSun, Sun } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DemoDataBadge } from "@/components/ui/demo-data-badge"
import { get7daySolarForecast } from "@/lib/dashboard/facility-demo-data"

const SKY_ICON = { sunny: Sun, partly: CloudSun, cloudy: Cloud } as const
const SKY_COLOR = {
  sunny: "var(--color-warning)",
  partly: "var(--color-chart-2)",
  cloudy: "var(--color-muted-foreground)",
} as const

/**
 * Spec C16 / 11.3 "Forecast": 7-day solar generation forecast.
 *
 * [data] fed by the local demo module. TODO: wire the real forecast
 * (NASA POWER + pvlib generation model) per spec Parts 5 & 9.
 */
export function SolarForecast7d({ facilityId }: { facilityId?: string }) {
  const data = get7daySolarForecast(facilityId)

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base">7-day solar forecast</CardTitle>
          <DemoDataBadge />
        </div>
        <p className="text-xs text-muted-foreground">Expected generation (kWh) per day.</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="h-44 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
              <YAxis tick={{ fontSize: 11 }} unit=" kWh" stroke="var(--color-muted-foreground)" />
              <Tooltip
                formatter={(value: number | string) => [`${value} kWh`, "Expected"]}
                contentStyle={{ borderRadius: 8, border: "1px solid var(--color-border)", fontSize: 12 }}
              />
              <Bar dataKey="expectedKwh" radius={[4, 4, 0, 0]}>
                {data.map((d, i) => (
                  <Cell key={i} fill={SKY_COLOR[d.sky]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex justify-between gap-1">
          {data.map((d) => {
            const Icon = SKY_ICON[d.sky]
            return (
              <div key={d.day} className="flex flex-1 flex-col items-center gap-0.5">
                <Icon className="size-4 text-muted-foreground" aria-hidden />
                <span className="text-[10px] capitalize text-muted-foreground">{d.sky}</span>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
