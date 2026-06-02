"use client"

import { MapPin, Network } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { scoreBarColor } from "@/lib/dashboard/facility-ui"
import { DemoDataBadge } from "@/components/ui/demo-data-badge"
import { getPortfolioByRegion } from "@/lib/dashboard/ngo-portfolio-data"
import { getPortfolioByNetwork } from "@/lib/dashboard/admin-portfolio-data"

type BreakdownRow = {
  label: string
  facilities: number
  avgRcs: number
  atRiskSites: number
}

function BreakdownList({ rows }: { rows: BreakdownRow[] }) {
  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r.label} className="space-y-1">
          <div className="flex items-center justify-between gap-2 text-sm">
            <span className="font-medium text-foreground">{r.label}</span>
            <span className="text-xs text-muted-foreground">
              {r.facilities} facilities · {r.atRiskSites} at-risk
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="h-2 flex-1 overflow-hidden rounded-full bg-muted"
              role="progressbar"
              aria-valuenow={r.avgRcs}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${r.label} average RCS`}
            >
              <div className={cn("h-full rounded-full", scoreBarColor(r.avgRcs))} style={{ width: `${r.avgRcs}%` }} />
            </div>
            <span className="w-10 shrink-0 text-right text-xs font-semibold tabular-nums text-foreground">
              {r.avgRcs}
            </span>
          </div>
        </li>
      ))}
    </ul>
  )
}

/**
 * Portfolio resilience broken down by region and by faith network/operator.
 * Helps prioritise where to invest (application Area 1). Simulated data.
 */
export function AdminRegionNetwork() {
  const regions = getPortfolioByRegion().map((r) => ({
    label: r.region,
    facilities: r.facilities,
    avgRcs: r.avgRcs,
    atRiskSites: r.atRiskSites,
  }))
  const networks = getPortfolioByNetwork().map((n) => ({
    label: n.network,
    facilities: n.facilities,
    avgRcs: n.avgRcs,
    atRiskSites: n.atRiskSites,
  }))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <DemoDataBadge />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <MapPin className="size-5 text-primary" aria-hidden />
              By region
            </CardTitle>
          </CardHeader>
          <CardContent>
            <BreakdownList rows={regions} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Network className="size-5 text-primary" aria-hidden />
              By network
            </CardTitle>
          </CardHeader>
          <CardContent>
            <BreakdownList rows={networks} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
