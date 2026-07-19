"use client"

import * as React from "react"
import { ClipboardList, Leaf, ShieldCheck, Wrench } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { StatCard } from "@/components/ui/stat-card"
import { useAdminPortfolio } from "@/hooks/use-admin-portfolio"
import { useAdminAdaptationsRollup } from "@/hooks/use-admin-adaptations-rollup"
import { useAdminCarbonCredits } from "@/hooks/use-admin-carbon-credits"
import { summarize, childServiceRollup } from "@/lib/dashboard/admin-portfolio-real"

function isImplemented(status: string): boolean {
  const s = status.toLowerCase()
  return s.includes("implement") || s.includes("complete") || s.includes("done")
}

export function AdminImpactSummary() {
  const { facilities, isLoading, isError } = useAdminPortfolio()
  const adaptations = useAdminAdaptationsRollup()
  const carbon = useAdminCarbonCredits()

  const summary = React.useMemo(() => summarize(facilities), [facilities])

  // Services protected: cold-chain + water-pumping currently "ok" (real climate-derived).
  const servicesProtected = React.useMemo(() => {
    const roll = childServiceRollup(facilities)
    return roll
      .filter((r) => r.key === "cold-chain" || r.key === "water-pumping")
      .reduce((s, r) => s + r.ok, 0)
  }, [facilities])

  const adaptationsImplemented = React.useMemo(
    () => (adaptations.data?.items ?? []).filter((i) => isImplemented(i.status)).length,
    [adaptations.data],
  )

  const co2Tons = carbon.data ? Math.round(carbon.data.creditsEarnedTons) : null

  if (isLoading) {
    return <div className="h-40 animate-pulse rounded-lg bg-muted" />
  }
  if (isError) {
    return <p className="text-sm text-destructive">Could not load impact data. Please retry.</p>
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck aria-hidden className="size-5 text-primary" />
          Resilience impact summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Facilities assessed"
            value={`${summary.assessed}/${summary.facilities}`}
            icon={<ClipboardList aria-hidden />}
            accent="primary"
          />
          <StatCard
            title="Services protected"
            value={servicesProtected}
            icon={<ShieldCheck aria-hidden />}
            accent="success"
            meta="Cold-chain & water at low risk"
          />
          <StatCard
            title="Adaptations implemented"
            value={adaptations.isLoading ? "…" : adaptationsImplemented}
            icon={<Wrench aria-hidden />}
            accent="solar"
          />
          <StatCard
            title="CO2 avoided (tons)"
            value={carbon.isLoading ? "…" : co2Tons != null ? co2Tons : "N/A"}
            icon={<Leaf aria-hidden />}
            accent="success"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Portfolio outcomes from real data: completed climate assessments, child-health services kept at
          low climate risk (cold-chain &amp; water, from NASA POWER exposure), adaptation measures
          implemented, and CO2 avoided from recorded carbon credits.
        </p>
      </CardContent>
    </Card>
  )
}
