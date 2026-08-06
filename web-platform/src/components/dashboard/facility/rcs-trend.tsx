"use client"

import { useMemo } from "react"
import { TrendingUp } from "lucide-react"
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getRcsTrend } from "@/lib/dashboard/facility-demo-data"
import { useFacilityPreferences } from "./facility-preferences-provider"

/** RCS-over-time line chart (quarterly), reusing the recharts conventions. */
export function RcsTrend({ facilityId, hesScore }: { facilityId?: string; hesScore?: number }) {
  const { t } = useFacilityPreferences()
  const data = useMemo(
    () => getRcsTrend(facilityId, hesScore != null ? { hesScore } : undefined),
    [facilityId, hesScore],
  )
  const first = data[0]?.rcs ?? 0
  const last = data[data.length - 1]?.rcs ?? 0
  const change = last - first

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <TrendingUp className="size-5 text-primary" aria-hidden />
          {t("rcs.trend.title")}
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          {change >= 0
            ? t("rcs.trend.up", { n: change })
            : t("rcs.trend.down", { n: Math.abs(change) })}
        </p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={data} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
            <Tooltip
              contentStyle={{
                fontSize: 12,
                borderRadius: 8,
                border: "1px solid var(--color-border)",
                background: "var(--color-card)",
              }}
            />
            <Line
              type="monotone"
              dataKey="rcs"
              name={t("rcs.trend.title")}
              stroke="var(--color-primary)"
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
