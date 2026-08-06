"use client"

import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { get24hPowerBySource } from "@/lib/dashboard/facility-demo-data"
import type { PowerInputs } from "@/lib/dashboard/power-model"

/** Spec 8.2 "Umeme detail": a 24-hour stacked-area chart of power by source. */
export function Power24hArea({ facilityId, inputs }: { facilityId?: string; inputs?: PowerInputs | null }) {
  const data = get24hPowerBySource(facilityId, inputs ?? undefined)

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Last 24 hours by source</CardTitle>
        <p className="text-xs text-muted-foreground">Delivered power (kW) from solar, battery and grid.</p>
      </CardHeader>
      <CardContent>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="time" interval={3} tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
              <YAxis tick={{ fontSize: 11 }} unit=" kW" stroke="var(--color-muted-foreground)" />
              <Tooltip
                contentStyle={{ borderRadius: 8, border: "1px solid var(--color-border)", fontSize: 12 }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area
                type="monotone"
                dataKey="solar"
                stackId="1"
                name="Solar"
                stroke="var(--color-warning)"
                fill="var(--color-warning)"
                fillOpacity={0.5}
              />
              <Area
                type="monotone"
                dataKey="battery"
                stackId="1"
                name="Battery"
                stroke="var(--color-success)"
                fill="var(--color-success)"
                fillOpacity={0.5}
              />
              <Area
                type="monotone"
                dataKey="grid"
                stackId="1"
                name="Grid"
                stroke="var(--color-muted-foreground)"
                fill="var(--color-muted-foreground)"
                fillOpacity={0.35}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
