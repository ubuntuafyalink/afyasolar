"use client"

import * as React from "react"
import { ClipboardList, Leaf, ShieldCheck, TrendingUp } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DemoDataBadge } from "@/components/ui/demo-data-badge"
import { StatCard } from "@/components/ui/stat-card"
import { getImpactSummary } from "@/lib/dashboard/admin-portfolio-data"

export function AdminImpactSummary() {
  const summary = React.useMemo(() => getImpactSummary(), [])

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck aria-hidden className="size-5 text-primary" />
          Resilience impact summary
        </CardTitle>
        <DemoDataBadge />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Facilities assessed"
            value={summary.facilitiesAssessed}
            icon={<ClipboardList aria-hidden />}
            accent="primary"
          />
          <StatCard
            title="Services protected"
            value={summary.servicesProtected}
            icon={<ShieldCheck aria-hidden />}
            accent="success"
          />
          <StatCard
            title="Resilience points gained"
            value={summary.resiliencePointsGained}
            icon={<TrendingUp aria-hidden />}
            accent="solar"
          />
          <StatCard
            title="CO2 avoided (tons)"
            value={summary.co2AvoidedTons}
            icon={<Leaf aria-hidden />}
            accent="success"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Portfolio-level outcomes aggregated across all assessed facilities: completed assessments,
          essential child-health services kept resilient, cumulative resilience score (RCS) points
          delivered by adaptation measures, and estimated CO2 emissions avoided.
        </p>
      </CardContent>
    </Card>
  )
}
