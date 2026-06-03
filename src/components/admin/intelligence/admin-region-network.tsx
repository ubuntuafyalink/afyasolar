"use client"

import { useMemo } from "react"
import { MapPin, LayoutGrid } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { scoreBarColor } from "@/lib/dashboard/facility-ui"
import { useAdminPortfolio } from "@/hooks/use-admin-portfolio"
import { byRegion, byCategory } from "@/lib/dashboard/admin-portfolio-real"

type BreakdownRow = {
  label: string
  facilities: number
  assessed: number
  avgRcs: number | null
  criticalSites: number
}

function BreakdownList({ rows }: { rows: BreakdownRow[] }) {
  if (rows.length === 0) {
    return <p className="text-xs text-muted-foreground">No facilities yet.</p>
  }
  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r.label} className="space-y-1">
          <div className="flex items-center justify-between gap-2 text-sm">
            <span className="font-medium text-foreground">{r.label}</span>
            <span className="text-xs text-muted-foreground">
              {r.facilities} facilities · {r.criticalSites} critical
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="h-2 flex-1 overflow-hidden rounded-full bg-muted"
              role="progressbar"
              aria-valuenow={r.avgRcs ?? 0}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${r.label} average RCS`}
            >
              <div
                className={cn("h-full rounded-full", scoreBarColor(r.avgRcs ?? 0))}
                style={{ width: `${r.avgRcs ?? 0}%` }}
              />
            </div>
            <span className="w-12 shrink-0 text-right text-xs font-semibold tabular-nums text-foreground">
              {r.avgRcs != null ? r.avgRcs : "N/A"}
            </span>
          </div>
        </li>
      ))}
    </ul>
  )
}

/**
 * Portfolio resilience broken down by region and by facility category. Helps
 * prioritise where to invest (application Area 1). Real data; facilities with no
 * saved assessment show no RCS contribution.
 */
export function AdminRegionNetwork() {
  const { facilities, isLoading, isError } = useAdminPortfolio()
  const regions = useMemo(
    () =>
      byRegion(facilities).map((r) => ({
        label: r.region,
        facilities: r.facilities,
        assessed: r.assessed,
        avgRcs: r.avgRcs,
        criticalSites: r.criticalSites,
      })),
    [facilities],
  )
  const categories = useMemo(
    () =>
      byCategory(facilities).map((c) => ({
        label: c.category,
        facilities: c.facilities,
        assessed: c.assessed,
        avgRcs: c.avgRcs,
        criticalSites: c.criticalSites,
      })),
    [facilities],
  )

  if (isLoading) {
    return <div className="h-40 animate-pulse rounded-lg bg-muted" />
  }
  if (isError) {
    return <p className="text-sm text-destructive">Could not load portfolio data. Please retry.</p>
  }

  return (
    <div className="space-y-4">
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
              <LayoutGrid className="size-5 text-primary" aria-hidden />
              By category
            </CardTitle>
          </CardHeader>
          <CardContent>
            <BreakdownList rows={categories} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
