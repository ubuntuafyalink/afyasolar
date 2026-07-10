"use client"

import { useMemo } from "react"
import { TrendingUp, BadgeCheck, Info } from "lucide-react"
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
import { useFacilityResilienceSnapshots } from "@/hooks/use-facility-resilience-snapshots"
import { useFacilityPreferences } from "./facility-preferences-provider"

/** Format a "YYYY-MM" period as a short localized month label (e.g. "Jul 25"). */
function monthLabel(period: string, locale: string): string {
  const [y, m] = period.split("-").map(Number)
  if (!y || !m) return period
  const d = new Date(Date.UTC(y, m - 1, 1))
  const mon = d.toLocaleDateString(locale === "sw" ? "sw-TZ" : "en-GB", {
    month: "short",
    timeZone: "UTC",
  })
  return `${mon} ${String(y).slice(2)}`
}

/**
 * RCS-over-time line chart. Prefers the facility's REAL monthly history from
 * facility_resilience_snapshot; when fewer than two real snapshots exist yet it
 * falls back to a clearly-labelled illustrative curve so the card is never blank
 * but also never passes seeded data off as real.
 */
export function RcsTrend({ facilityId, hesScore }: { facilityId?: string; hesScore?: number }) {
  const { t, locale } = useFacilityPreferences()
  const snapshotsQuery = useFacilityResilienceSnapshots(facilityId)
  const snapshots = snapshotsQuery.data
  const isReal = (snapshots?.length ?? 0) >= 2

  const data = useMemo(() => {
    if (isReal && snapshots) {
      return snapshots.map((s) => ({ label: monthLabel(s.periodMonth, locale), rcs: s.rcs }))
    }
    return getRcsTrend(facilityId, hesScore != null ? { hesScore } : undefined)
  }, [isReal, snapshots, facilityId, hesScore, locale])

  const first = data[0]?.rcs ?? 0
  const last = data[data.length - 1]?.rcs ?? 0
  const change = last - first

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="size-5 text-primary" aria-hidden />
            {t("rcs.trend.title")}
          </CardTitle>
          {isReal ? (
            <span className="inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
              <BadgeCheck className="size-3" aria-hidden />
              {t("rcs.trend.real")}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-md border border-warning/30 bg-warning/15 px-1.5 py-0.5 text-[10px] font-medium text-warning-foreground">
              <Info className="size-3" aria-hidden />
              {t("rcs.source.estimated")}
            </span>
          )}
        </div>
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
        {!isReal ? (
          <p className="mt-2 text-[11px] text-muted-foreground">{t("rcs.trend.illustrative")}</p>
        ) : null}
      </CardContent>
    </Card>
  )
}
