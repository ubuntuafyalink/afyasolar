"use client"

import { useMemo } from "react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { StatCard } from "@/components/ui/stat-card"
import { Snowflake, Thermometer, TriangleAlert, Info } from "lucide-react"
import { useAdminPortfolio } from "@/hooks/use-admin-portfolio"
import { coldChainProjection } from "@/lib/dashboard/admin-portfolio-real"
import type { ColdChainRisk } from "@/lib/dashboard/admin-portfolio-types"

function RiskBadge({ risk }: { risk: ColdChainRisk }) {
  if (risk === "high") {
    return (
      <Badge variant="destructive">
        <TriangleAlert aria-hidden className="size-3" />
        High risk
      </Badge>
    )
  }
  if (risk === "elevated") {
    return (
      <Badge variant="warning">
        <Thermometer aria-hidden className="size-3" />
        Elevated
      </Badge>
    )
  }
  if (risk === "low") {
    return (
      <Badge variant="success">
        <Snowflake aria-hidden className="size-3" />
        Low risk
      </Badge>
    )
  }
  return <Badge variant="secondary">No data</Badge>
}

/**
 * Cold-chain risk PROJECTED from real NASA POWER heat exposure. There is no
 * fridge temperature telemetry, so this is an exposure proxy, not a measured
 * temperature - labeled accordingly (plan decision 1).
 */
export function AdminColdChainMonitor() {
  const { facilities, isLoading, isError, climateLoading } = useAdminPortfolio()
  const fleet = useMemo(() => coldChainProjection(facilities), [facilities])

  const high = fleet.filter((r) => r.risk === "high").length
  const elevated = fleet.filter((r) => r.risk === "elevated").length

  if (isLoading) {
    return <div className="h-64 animate-pulse rounded-lg bg-muted" />
  }
  if (isError) {
    return <p className="text-sm text-destructive">Could not load portfolio data. Please retry.</p>
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2">
            <Snowflake aria-hidden className="size-5 text-primary" />
            Cold-chain risk
          </CardTitle>
          <Badge variant="outline" className="gap-1 text-muted-foreground">
            <Info aria-hidden className="size-3" />
            Projected from climate heat - no fridge telemetry
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard
            title="High risk (projected)"
            value={high}
            icon={<TriangleAlert />}
            accent="destructive"
            meta="High heat exposure"
          />
          <StatCard
            title="Elevated risk"
            value={elevated}
            icon={<Thermometer />}
            accent="warning"
            meta="Moderate heat exposure"
          />
          <StatCard
            title="Facilities"
            value={fleet.length}
            icon={<Snowflake />}
            accent="muted"
            meta="Across the portfolio"
          />
        </div>

        {climateLoading && (
          <p className="text-xs text-muted-foreground">Loading climate exposure from NASA POWER...</p>
        )}

        <ul className="space-y-2">
          {fleet.map((row) => (
            <li key={row.facility.id} className="rounded-lg border border-border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <span className="font-medium text-foreground">{row.facility.name}</span>
                  <span className="ml-2 text-xs text-muted-foreground">{row.facility.region ?? "—"}</span>
                </div>
                <div className="flex items-center gap-2">
                  {row.heatScore != null && (
                    <span className="text-xs text-muted-foreground">
                      heat <span className="font-semibold tabular-nums text-foreground">{row.heatScore}</span>/100
                    </span>
                  )}
                  <RiskBadge risk={row.risk} />
                </div>
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">{row.note}</p>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
