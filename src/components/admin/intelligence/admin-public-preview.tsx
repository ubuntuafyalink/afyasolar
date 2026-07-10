"use client"

import { Globe, Leaf, ShieldCheck, TrendingUp } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { StatCard } from "@/components/ui/stat-card"
import { DemoDataBadge } from "@/components/ui/demo-data-badge"
import { cn } from "@/lib/utils"
import { scoreBarColor } from "@/lib/dashboard/facility-ui"
import {
  getAdminPortfolioSummary,
  getImpactSummary,
  type ResilienceTier,
} from "@/lib/dashboard/admin-portfolio-data"
import { AdminReportButton } from "@/components/admin/intelligence/admin-report-button"

/**
 * Clean "public dashboard preview" of the portfolio: a headline hero with the
 * portfolio-average RCS, the resilience-tier mix, and impact headlines. Previews
 * the planned real-time public dashboard. Demo data only.
 */

const TIER_ORDER: ResilienceTier[] = ["Resilient", "Developing", "At risk", "Critical"]
const TIER_SCORE: Record<ResilienceTier, number> = {
  Resilient: 80,
  Developing: 60,
  "At risk": 40,
  Critical: 20,
}

function TierBar({
  tier,
  count,
  total,
}: {
  tier: ResilienceTier
  count: number
  total: number
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-foreground">{tier}</span>
        <span className="tabular-nums text-muted-foreground">
          {count} ({pct}%)
        </span>
      </div>
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${tier} facilities`}
      >
        <div
          className={cn("h-full rounded-full", scoreBarColor(TIER_SCORE[tier]))}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

export function AdminPublicPreview() {
  const summary = getAdminPortfolioSummary()
  const impact = getImpactSummary()

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2">
            <Globe aria-hidden className="size-5 text-primary" />
            Public dashboard preview
          </CardTitle>
          <DemoDataBadge />
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Hero */}
        <div className="rounded-xl border border-border bg-muted/40 p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Portfolio average resilience score
              </p>
              <p className="text-4xl font-bold tracking-tight text-foreground">
                {summary.avgRcs}
                <span className="text-lg font-medium text-muted-foreground"> / 100</span>
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">{summary.facilities} facilities</Badge>
              <Badge variant="secondary">{summary.regions} regions</Badge>
              <Badge variant="secondary">{summary.networks} networks</Badge>
            </div>
          </div>
        </div>

        {/* Resilience tier mix */}
        <div className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground">Resilience tier mix</p>
          {TIER_ORDER.map((tier) => (
            <TierBar
              key={tier}
              tier={tier}
              count={summary.tierCounts[tier]}
              total={summary.facilities}
            />
          ))}
        </div>

        {/* Impact headlines */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Facilities assessed"
            value={impact.facilitiesAssessed}
            icon={<ShieldCheck />}
            accent="primary"
          />
          <StatCard
            title="Critical services protected"
            value={impact.servicesProtected}
            icon={<ShieldCheck />}
            accent="success"
          />
          <StatCard
            title="Resilience points gained"
            value={impact.resiliencePointsGained}
            icon={<TrendingUp />}
            accent="solar"
          />
          <StatCard
            title="CO2 avoided (tons)"
            value={impact.co2AvoidedTons}
            icon={<Leaf />}
            accent="success"
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed border-border p-4">
          <p className="text-sm text-muted-foreground">
            This previews the planned real-time public dashboard. Figures shown are sample
            values and are not yet wired to a live source.
          </p>
          <AdminReportButton />
        </div>
      </CardContent>
    </Card>
  )
}
