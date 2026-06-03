"use client"

import { useMemo } from "react"
import { OctagonAlert, TriangleAlert, ShieldCheck, CircleDashed } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { useAdminPortfolio } from "@/hooks/use-admin-portfolio"
import { childServiceRollup } from "@/lib/dashboard/admin-portfolio-real"
import type { ServiceRollup } from "@/lib/dashboard/admin-portfolio-types"

const SERVICE_LABELS: Record<ServiceRollup["key"], string> = {
  "cold-chain": "Vaccine cold-chain",
  maternity: "Maternity",
  neonatal: "Neonatal care",
  diagnostics: "Diagnostics (lab)",
  "water-pumping": "Water pumping",
}

/**
 * Only cold-chain (heat) and water-pumping (drought/flood) have a real climate
 * signal today; the rest report "not assessed" until a real source exists.
 */
const CLIMATE_DERIVED: Record<ServiceRollup["key"], boolean> = {
  "cold-chain": true,
  maternity: false,
  neonatal: false,
  diagnostics: false,
  "water-pumping": true,
}

function ServiceRow({ row }: { row: ServiceRollup }) {
  const total = row.failing + row.atRisk + row.ok + row.notAssessed
  const pct = (n: number) => (total ? (n / total) * 100 : 0)
  const label = SERVICE_LABELS[row.key]
  const derived = CLIMATE_DERIVED[row.key]
  return (
    <li className="space-y-1.5">
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="font-medium text-foreground">
          {label}
          {!derived && (
            <span className="ml-2 text-xs font-normal text-muted-foreground">(no live signal yet)</span>
          )}
        </span>
        <span className="flex items-center gap-3 text-xs">
          <span className="inline-flex items-center gap-1 text-destructive">
            <OctagonAlert aria-hidden className="size-3.5" />
            {row.failing}
          </span>
          <span className="inline-flex items-center gap-1 text-warning-foreground">
            <TriangleAlert aria-hidden className="size-3.5" />
            {row.atRisk}
          </span>
          <span className="inline-flex items-center gap-1 text-success">
            <ShieldCheck aria-hidden className="size-3.5" />
            {row.ok}
          </span>
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <CircleDashed aria-hidden className="size-3.5" />
            {row.notAssessed}
          </span>
        </span>
      </div>
      <div
        className="flex h-3 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={row.ok}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label={`${label}: ${row.failing} failing, ${row.atRisk} at risk, ${row.ok} OK, ${row.notAssessed} not assessed of ${total} sites`}
      >
        {row.failing > 0 && <div className="h-full bg-destructive" style={{ width: `${pct(row.failing)}%` }} />}
        {row.atRisk > 0 && <div className="h-full bg-warning" style={{ width: `${pct(row.atRisk)}%` }} />}
        {row.ok > 0 && <div className="h-full bg-success" style={{ width: `${pct(row.ok)}%` }} />}
      </div>
    </li>
  )
}

/** Portfolio-wide rollup of each critical child service by failing/at-risk/ok. */
export function AdminChildServicesRollup() {
  const { facilities, isLoading, isError } = useAdminPortfolio()
  const rows = useMemo(() => childServiceRollup(facilities), [facilities])

  if (isLoading) {
    return <div className="h-56 animate-pulse rounded-lg bg-muted" />
  }
  if (isError) {
    return <p className="text-sm text-destructive">Could not load portfolio data. Please retry.</p>
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
        <CardTitle className="text-base">Critical services across the portfolio</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-3 text-xs text-muted-foreground">
          Cold-chain and water pumping are derived from real climate exposure (NASA POWER). The other
          services have no live signal yet and show as not assessed.
        </p>
        <div className="mb-4 flex flex-wrap gap-x-4 gap-y-1.5 text-xs">
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden className={cn("size-2.5 rounded-full bg-destructive")} />
            Failing
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden className={cn("size-2.5 rounded-full bg-warning")} />
            At risk
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden className={cn("size-2.5 rounded-full bg-success")} />
            OK
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden className={cn("size-2.5 rounded-full bg-muted-foreground")} />
            Not assessed
          </span>
        </div>
        <ul className="space-y-4">
          {rows.map((row) => (
            <ServiceRow key={row.key} row={row} />
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
