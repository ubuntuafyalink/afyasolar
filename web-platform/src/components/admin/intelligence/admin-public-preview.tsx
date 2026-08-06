"use client"

import { useMemo } from "react"
import { Globe, Leaf, ShieldCheck, Wrench } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { StatCard } from "@/components/ui/stat-card"
import { cn } from "@/lib/utils"
import { scoreBarColor } from "@/lib/dashboard/facility-ui"
import { useAdminPortfolio } from "@/hooks/use-admin-portfolio"
import { useAdminAdaptationsRollup } from "@/hooks/use-admin-adaptations-rollup"
import { useAdminCarbonCredits } from "@/hooks/use-admin-carbon-credits"
import { summarize, childServiceRollup } from "@/lib/dashboard/admin-portfolio-real"
import type { ResilienceTier } from "@/lib/dashboard/admin-portfolio-types"
import { AdminReportButton } from "@/components/admin/intelligence/admin-report-button"

const TIER_ORDER: ResilienceTier[] = ["Resilient", "Developing", "At risk", "Critical"]
const TIER_SCORE: Record<ResilienceTier, number> = {
  Resilient: 80,
  Developing: 60,
  "At risk": 40,
  Critical: 20,
}

function isImplemented(status: string): boolean {
  const s = status.toLowerCase()
  return s.includes("implement") || s.includes("complete") || s.includes("done")
}

function TierBar({ tier, count, total }: { tier: ResilienceTier; count: number; total: number }) {
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
        <div className={cn("h-full rounded-full", scoreBarColor(TIER_SCORE[tier]))} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

/**
 * Clean "public dashboard preview" of the portfolio: a headline hero with the
 * portfolio-average RCS, the resilience-tier mix, and impact headlines. Real
 * data composed from the portfolio + adaptations + carbon credits.
 */
export function AdminPublicPreview() {
  const { facilities, isLoading, isError } = useAdminPortfolio()
  const adaptations = useAdminAdaptationsRollup()
  const carbon = useAdminCarbonCredits()

  const summary = useMemo(() => summarize(facilities), [facilities])
  const servicesProtected = useMemo(() => {
    const roll = childServiceRollup(facilities)
    return roll.filter((r) => r.key === "cold-chain" || r.key === "water-pumping").reduce((s, r) => s + r.ok, 0)
  }, [facilities])
  const adaptationsImplemented = useMemo(
    () => (adaptations.data?.items ?? []).filter((i) => isImplemented(i.status)).length,
    [adaptations.data],
  )
  const co2Tons = carbon.data ? Math.round(carbon.data.creditsEarnedTons) : null

  if (isLoading) {
    return <div className="h-80 animate-pulse rounded-lg bg-muted" />
  }
  if (isError) {
    return <p className="text-sm text-destructive">Could not load portfolio data. Please retry.</p>
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2">
            <Globe aria-hidden className="size-5 text-primary" />
            Public dashboard preview
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Hero */}
        <div className="rounded-xl border border-border bg-muted/40 p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Portfolio average resilience score</p>
              <p className="text-4xl font-bold tracking-tight text-foreground">
                {summary.avgRcs != null ? summary.avgRcs : "N/A"}
                <span className="text-lg font-medium text-muted-foreground"> / 100</span>
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">{summary.facilities} facilities</Badge>
              <Badge variant="secondary">{summary.assessed} assessed</Badge>
              <Badge variant="secondary">{summary.regions} regions</Badge>
            </div>
          </div>
        </div>

        {/* Resilience tier mix (assessed facilities) */}
        <div className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground">Resilience tier mix (assessed)</p>
          {summary.assessed === 0 ? (
            <p className="text-sm text-muted-foreground">No facilities assessed yet.</p>
          ) : (
            TIER_ORDER.map((tier) => (
              <TierBar key={tier} tier={tier} count={summary.tierCounts[tier]} total={summary.assessed} />
            ))
          )}
        </div>

        {/* Impact headlines */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Facilities assessed"
            value={`${summary.assessed}/${summary.facilities}`}
            icon={<ShieldCheck />}
            accent="primary"
          />
          <StatCard
            title="Services protected"
            value={servicesProtected}
            icon={<ShieldCheck />}
            accent="success"
          />
          <StatCard
            title="Adaptations implemented"
            value={adaptations.isLoading ? "…" : adaptationsImplemented}
            icon={<Wrench />}
            accent="solar"
          />
          <StatCard
            title="CO2 avoided (tons)"
            value={carbon.isLoading ? "…" : co2Tons != null ? co2Tons : "N/A"}
            icon={<Leaf />}
            accent="success"
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed border-border p-4">
          <p className="text-sm text-muted-foreground">
            This previews the planned real-time public dashboard, composed from live portfolio data.
          </p>
          <AdminReportButton />
        </div>
      </CardContent>
    </Card>
  )
}
