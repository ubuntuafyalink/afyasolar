"use client"

import { useMemo } from "react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { StatCard } from "@/components/ui/stat-card"
import { DemoDataBadge } from "@/components/ui/demo-data-badge"
import { Snowflake, Thermometer, TriangleAlert } from "lucide-react"
import {
  getColdChainFleet,
  type ColdChainFleetRow,
} from "@/lib/dashboard/admin-portfolio-data"

function TempBadge({ row }: { row: ColdChainFleetRow }) {
  if (row.status === "danger") {
    return (
      <Badge variant="destructive">
        <TriangleAlert aria-hidden className="size-3" />
        Out of range
      </Badge>
    )
  }
  return (
    <Badge variant="success">
      <Snowflake aria-hidden className="size-3" />
      Safe (28°C)
    </Badge>
  )
}

export function AdminColdChainMonitor() {
  const fleet = useMemo(() => getColdChainFleet(), [])

  const inDanger = fleet.filter((r) => r.status === "danger").length
  const atRisk = fleet.filter((r) => r.atRisk && r.status !== "danger").length

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2">
            <Snowflake aria-hidden className="size-5 text-primary" />
            Cold-Chain Monitor
          </CardTitle>
          <DemoDataBadge />
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard
            title="Fridges out of range"
            value={inDanger}
            icon={<TriangleAlert />}
            accent="destructive"
            meta="Outside the 28°C safe band"
          />
          <StatCard
            title="At-risk (predicted)"
            value={atRisk}
            icon={<Thermometer />}
            accent="warning"
            meta="Excursion forecast ahead"
          />
          <StatCard
            title="Total fridges"
            value={fleet.length}
            icon={<Snowflake />}
            accent="muted"
            meta="Across the portfolio"
          />
        </div>

        <ul className="space-y-2">
          {fleet.map((row) => (
            <li key={row.facility.id} className="rounded-lg border border-border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <span className="font-medium text-foreground">{row.facility.name}</span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    {row.facility.region}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold tabular-nums text-foreground">
                    {row.tempC.toFixed(1)}°C
                  </span>
                  <TempBadge row={row} />
                </div>
              </div>
              {row.atRisk ? (
                <p className="mt-1.5 flex items-center gap-1.5 text-xs text-warning-foreground">
                  <Thermometer aria-hidden className="size-3.5" />
                  Predicted excursion in {row.etaDaysMin}{row.etaDaysMax} days
                  {" "}
                  <span className="text-muted-foreground">
                    ({row.confidencePct}% confidence)
                  </span>
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
