"use client"

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { BatteryCharging, Sun, Zap } from "lucide-react"
import type { LucideIcon } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getPower12hForecast, type PowerSource } from "@/lib/dashboard/facility-demo-data"
import type { PowerInputs } from "@/lib/dashboard/power-model"

const SOURCE_ICON: Record<PowerSource, LucideIcon> = {
  solar: Sun,
  grid: Zap,
  battery: BatteryCharging,
}
const SOURCE_COLOR: Record<PowerSource, string> = {
  solar: "text-warning-foreground",
  grid: "text-primary",
  battery: "text-success",
}

/** Spec 8.2 "Umeme detail": 12h forecast of expected source and battery SoC. */
export function PowerForecast12h({
  facilityId,
  inputs,
}: {
  facilityId?: string
  inputs?: PowerInputs | null
}) {
  const data = getPower12hForecast(facilityId, inputs ?? undefined)

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Next 12 hours</CardTitle>
        <p className="text-xs text-muted-foreground">Expected power source and battery charge.</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="h-40 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="time" interval={1} tick={{ fontSize: 10 }} stroke="var(--color-muted-foreground)" />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} unit="%" stroke="var(--color-muted-foreground)" />
              <Tooltip
                formatter={(value: number | string) => [`${value}%`, "Battery"]}
                contentStyle={{ borderRadius: 8, border: "1px solid var(--color-border)", fontSize: 12 }}
              />
              <Line
                type="monotone"
                dataKey="batterySocPct"
                stroke="var(--color-success)"
                strokeWidth={2}
                dot={false}
                name="Battery %"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Expected source per hour */}
        <div className="flex gap-1 overflow-x-auto pb-1">
          {data.map((p) => {
            const Icon = SOURCE_ICON[p.source]
            return (
              <div
                key={p.time}
                className="flex min-w-11 flex-col items-center gap-0.5 rounded-md border border-border px-1.5 py-1"
                title={`${p.time} · ${p.source}`}
              >
                <span className="text-[10px] text-muted-foreground">{p.time.slice(0, 2)}</span>
                <Icon className={`size-4 ${SOURCE_COLOR[p.source]}`} aria-hidden />
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
