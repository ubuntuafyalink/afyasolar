"use client"

import { useMemo } from "react"
import {
  Building2,
  Gauge,
  OctagonAlert,
  ClipboardCheck,
  MapPin,
  LayoutGrid,
  TrendingUp,
} from "lucide-react"
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { StatCard } from "@/components/ui/stat-card"
import { cn } from "@/lib/utils"
import { useAdminPortfolio } from "@/hooks/use-admin-portfolio"
import { summarize, currentRcsTrend } from "@/lib/dashboard/admin-portfolio-real"
import type { ResilienceTier } from "@/lib/dashboard/admin-portfolio-types"

const TIER_ORDER: ResilienceTier[] = ["Resilient", "Developing", "At risk", "Critical"]

const TIER_BAR: Record<ResilienceTier, string> = {
  Resilient: "bg-success",
  Developing: "bg-primary",
  "At risk": "bg-warning",
  Critical: "bg-destructive",
}

function TierStackedBar({ counts }: { counts: Record<ResilienceTier, number> }) {
  const total = TIER_ORDER.reduce((s, t) => s + counts[t], 0)
  const summary = TIER_ORDER.map((t) => `${counts[t]} ${t}`).join(", ")
  if (total === 0) {
    return <p className="text-xs text-muted-foreground">No facilities assessed yet.</p>
  }
  return (
    <div>
      <div
        className="flex h-3 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={total}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label={`Resilience tiers across ${total} assessed facilities: ${summary}`}
      >
        {TIER_ORDER.map((t) =>
          counts[t] > 0 ? (
            <div
              key={t}
              className={cn("h-full", TIER_BAR[t])}
              style={{ width: `${(counts[t] / total) * 100}%` }}
            />
          ) : null,
        )}
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs">
        {TIER_ORDER.map((t) => (
          <li key={t} className="flex items-center gap-1.5">
            <span aria-hidden className={cn("size-2.5 rounded-full", TIER_BAR[t])} />
            <span className="text-foreground">{t}</span>
            <span className="font-semibold tabular-nums text-muted-foreground">{counts[t]}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Portfolio-level KPIs, resilience-tier mix and current RCS for the admin. */
export function AdminPortfolioOverview() {
  const { facilities, isLoading, isError } = useAdminPortfolio()
  const summary = useMemo(() => summarize(facilities), [facilities])
  const trend = useMemo(() => currentRcsTrend(facilities), [facilities])

  if (isLoading) {
    return <div className="h-40 animate-pulse rounded-lg bg-muted" />
  }
  if (isError) {
    return (
      <p className="text-sm text-destructive">
        Could not load portfolio data. Please retry.
      </p>
    )
  }
  if (summary.facilities === 0) {
    return <p className="text-sm text-muted-foreground">No facilities yet.</p>
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-foreground">Portfolio overview</h2>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard title="Facilities" value={summary.facilities} icon={<Building2 />} accent="primary" />
        <StatCard
          title="Assessed"
          value={`${summary.assessed}/${summary.facilities}`}
          icon={<ClipboardCheck />}
          accent="success"
          meta="Climate assessment saved"
        />
        <StatCard
          title="Average RCS"
          value={summary.avgRcs != null ? `${summary.avgRcs}/100` : "N/A"}
          icon={<Gauge />}
          accent="solar"
          progress={summary.avgRcs ?? 0}
          progressLabel="Portfolio average RCS"
          meta="Assessed facilities"
        />
        <StatCard
          title="Critical sites"
          value={summary.criticalCount}
          icon={<OctagonAlert />}
          accent="destructive"
          meta="Critical tier or flagged"
        />
        <StatCard title="Regions" value={summary.regions} icon={<MapPin />} accent="muted" />
        <StatCard title="Categories" value={summary.categories} icon={<LayoutGrid />} accent="muted" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Resilience tiers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Distribution of the {summary.assessed} assessed facilities by resilience tier.
            </p>
            <TierStackedBar counts={summary.tierCounts} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp aria-hidden className="size-4 text-success" />
              Current portfolio RCS
            </CardTitle>
          </CardHeader>
          <CardContent>
            {trend.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No assessed facilities yet - RCS appears once assessments are saved.
              </p>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={trend} margin={{ top: 8, right: 12, bottom: 0, left: -16 }}>
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
                      name="Avg RCS"
                      stroke="var(--color-primary)"
                      strokeWidth={2}
                      dot={{ r: 5 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
                <p className="mt-2 text-xs text-muted-foreground">
                  History begins this quarter - the trend line builds as assessments recur.
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
