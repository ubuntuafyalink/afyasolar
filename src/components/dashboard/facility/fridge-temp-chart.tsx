"use client"

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getFridge24hTemps } from "@/lib/dashboard/facility-demo-data"

/**
 * Spec 8.2 "Friji detail": a 24-hour line chart of fridge interior temperature
 * with the 2–8°C safe band shaded green. Built with Recharts (already a
 * dependency).
 */
export function FridgeTempChart({ facilityId }: { facilityId?: string }) {
  const data = getFridge24hTemps(facilityId)

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Last 24 hours</CardTitle>
        <p className="text-xs text-muted-foreground">
          Interior temperature. Safe band 2–8°C is shaded green.
        </p>
      </CardHeader>
      <CardContent>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis
                dataKey="time"
                interval={3}
                tick={{ fontSize: 11 }}
                stroke="var(--color-muted-foreground)"
              />
              <YAxis
                domain={[0, 12]}
                tick={{ fontSize: 11 }}
                unit="°"
                stroke="var(--color-muted-foreground)"
              />
              <ReferenceArea y1={2} y2={8} fill="var(--color-success)" fillOpacity={0.12} />
              <Tooltip
                formatter={(value: number | string) => [`${value}°C`, "Temp"]}
                contentStyle={{
                  borderRadius: 8,
                  border: "1px solid var(--color-border)",
                  fontSize: 12,
                }}
              />
              <Line
                type="monotone"
                dataKey="tempC"
                stroke="var(--color-primary)"
                strokeWidth={2}
                dot={false}
                name="Temp (°C)"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
