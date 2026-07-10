"use client"

import {
  Building2,
  Gauge,
  OctagonAlert,
  TriangleAlert,
  Users,
  MapPin,
  Network,
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
import { DemoDataBadge } from "@/components/ui/demo-data-badge"
import { cn } from "@/lib/utils"
import {
  getAdminPortfolioSummary,
  getPortfolioRcsTrend,
} from "@/lib/dashboard/admin-portfolio-data"
import type { ResilienceTier } from "@/lib/dashboard/admin-portfolio-data"

const TIER_ORDER: ResilienceTier[] = ["Resilient", "Developing", "At risk", "Critical"]

const TIER_BAR: Record<ResilienceTier, string> = {
  Resilient: "bg-success",
  Developing: "bg-primary",
  "At risk": "bg-warning",
  Critical: "bg-destructive",
}

const TIER_DOT: Record<ResilienceTier, string> = {
  Resilient: "bg-success",
  Developing: "bg-primary",
  "At risk": "bg-warning",
  Critical: "bg-destructive",
}

function TierStackedBar({
  counts,
}: {
  counts: Record<ResilienceTier, number>
}) {
  const total = TIER_ORDER.reduce((s, t) => s + counts[t], 0)
  const summary = TIER_ORDER.map((t) => `${counts[t]} ${t}`).join(", ")
  return (
    <div>
      <div
        className="flex h-3 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={total}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label={`Resilience tiers across ${total} facilities: ${summary}`}
      >
        {TIER_ORDER.map((t) =>
          counts[t] > 0 ? (
            <div
              key={t}
              className={cn("h-full", TIER_BAR[t])}
              style={{ width: `${total ? (counts[t] / total) * 100 : 0}%` }}
            />
          ) : null,
        )}
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs">
        {TIER_ORDER.map((t) => (
          <li key={t} className="flex items-center gap-1.5">
            <span aria-hidden className={cn("size-2.5 rounded-full", TIER_DOT[t])} />
            <span className="text-foreground">{t}</span>
            <span className="font-semibold tabular-nums text-muted-foreground">{counts[t]}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Portfolio-level KPIs, resilience-tier mix and RCS trend for the admin. */
export function AdminPortfolioOverview() {
  const summary = getAdminPortfolioSummary()
  const trend = getPortfolioRcsTrend()

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-foreground">Portfolio overview</h2>
        <DemoDataBadge />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
        <StatCard
          title="Facilities"
          value={summary.facilities}
          icon={<Building2 />}
          accent="primary"
        />
        <StatCard
          title="Average RCS"
          value={`${summary.avgRcs}/100`}
          icon={<Gauge />}
          accent="solar"
          progress={summary.avgRcs}
          progressLabel="Portfolio average RCS"
        />
        <StatCard
          title="Failing-service sites"
          value={summary.failingSites}
          icon={<OctagonAlert />}
          accent="destructive"
          meta="Critical child service down"
        />
        <StatCard
          title="At-risk sites"
          value={summary.atRiskSites}
          icon={<TriangleAlert />}
          accent="warning"
          meta="Service at risk"
        />
        <StatCard
          title="Women-led"
          value={`${summary.womenLedPct}%`}
          icon={<Users />}
          accent="success"
          progress={summary.womenLedPct}
          progressLabel="Women-led share"
        />
        <StatCard
          title="Regions"
          value={summary.regions}
          icon={<MapPin />}
          accent="muted"
        />
        <StatCard
          title="Networks"
          value={summary.networks}
          icon={<Network />}
          accent="muted"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Resilience tiers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Distribution of all {summary.facilities} facilities by resilience tier.
            </p>
            <TierStackedBar counts={summary.tierCounts} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp aria-hidden className="size-4 text-success" />
              RCS over time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
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
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
