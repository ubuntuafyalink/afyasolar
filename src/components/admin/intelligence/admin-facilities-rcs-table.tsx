"use client"

import * as React from "react"
import Link from "next/link"
import {
  Search,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  OctagonAlert,
  TriangleAlert,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { FOCUS_RING, scoreBarColor } from "@/lib/dashboard/facility-ui"
import { useAdminPortfolio } from "@/hooks/use-admin-portfolio"
import { childServiceStatus } from "@/lib/dashboard/admin-portfolio-real"
import type { PortfolioFacility } from "@/lib/dashboard/admin-portfolio-types"

type SortKey = "name" | "rcs"
type SortDir = "asc" | "desc"

const TIER_BADGE: Record<string, "success" | "default" | "warning" | "destructive"> = {
  Resilient: "success",
  Developing: "default",
  "At risk": "warning",
  Critical: "destructive",
}

const TIER_ICON: Record<string, LucideIcon> = {
  Resilient: ShieldCheck,
  Developing: ShieldCheck,
  "At risk": TriangleAlert,
  Critical: OctagonAlert,
}

function SortHeader({
  label,
  active,
  dir,
  onClick,
  className,
}: {
  label: string
  active: boolean
  dir: SortDir
  onClick: () => void
  className?: string
}) {
  const Icon = !active ? ArrowUpDown : dir === "asc" ? ArrowUp : ArrowDown
  return (
    <th scope="col" className={cn("px-3 py-2 text-left font-medium", className)}>
      <button
        type="button"
        onClick={onClick}
        aria-label={`Sort by ${label}${active ? ` (${dir === "asc" ? "ascending" : "descending"})` : ""}`}
        className={cn(
          "inline-flex items-center gap-1 rounded text-muted-foreground hover:text-foreground",
          FOCUS_RING,
        )}
      >
        {label}
        <Icon aria-hidden className="size-3.5" />
      </button>
    </th>
  )
}

/**
 * Real child-service indicator. Only cold-chain (heat) and water-pumping
 * (drought/flood) are climate-derivable today; the cell summarises those. When
 * a facility has no climate data yet it shows a pending note.
 */
function ChildServicesCell({ row }: { row: PortfolioFacility }) {
  if (!row.climate) {
    return <span className="text-xs text-muted-foreground">Climate pending</span>
  }
  const keys = ["cold-chain", "water-pumping"] as const
  let failing = 0
  let atRisk = 0
  for (const k of keys) {
    const s = childServiceStatus(row, k)
    if (s === "failing") failing += 1
    else if (s === "at-risk") atRisk += 1
  }
  if (failing === 0 && atRisk === 0) {
    return (
      <Badge variant="success" className="gap-1">
        <ShieldCheck aria-hidden className="size-3" />
        All OK
      </Badge>
    )
  }
  return (
    <div className="flex flex-wrap gap-1">
      {failing > 0 && (
        <Badge variant="destructive" className="gap-1">
          <OctagonAlert aria-hidden className="size-3" />
          {failing} failing
        </Badge>
      )}
      {atRisk > 0 && (
        <Badge variant="warning" className="gap-1">
          <TriangleAlert aria-hidden className="size-3" />
          {atRisk} at risk
        </Badge>
      )}
    </div>
  )
}

/** Sortable, filterable RCS table of every facility; rows link to the facility. */
export function AdminFacilitiesRcsTable() {
  const { facilities, isLoading, isError } = useAdminPortfolio()
  const [query, setQuery] = React.useState("")
  const [sortKey, setSortKey] = React.useState<SortKey>("rcs")
  const [sortDir, setSortDir] = React.useState<SortDir>("asc")

  const rows = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    const filtered = q
      ? facilities.filter(
          (r) =>
            r.name.toLowerCase().includes(q) ||
            (r.region ?? "").toLowerCase().includes(q) ||
            (r.category ?? "").toLowerCase().includes(q),
        )
      : facilities.slice()
    filtered.sort((a, b) => {
      if (sortKey === "name") {
        const cmp = a.name.localeCompare(b.name)
        return sortDir === "asc" ? cmp : -cmp
      }
      // RCS: unassessed (null) always sort to the bottom regardless of dir.
      const ra = a.climateRcs
      const rb = b.climateRcs
      if (ra == null && rb == null) return 0
      if (ra == null) return 1
      if (rb == null) return -1
      const cmp = ra - rb
      return sortDir === "asc" ? cmp : -cmp
    })
    return filtered
  }, [facilities, query, sortKey, sortDir])

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(key)
      setSortDir("asc")
    }
  }

  if (isLoading) {
    return <div className="h-64 animate-pulse rounded-lg bg-muted" />
  }
  if (isError) {
    return <p className="text-sm text-destructive">Could not load facilities. Please retry.</p>
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-col gap-3 pb-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-base">Facilities by resilience</CardTitle>
          </div>
          <div className="relative w-full sm:w-64">
            <Search
              aria-hidden
              className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter by name, region, category"
              aria-label="Filter facilities by name, region or category"
              className={cn(
                "h-9 w-full rounded-md border border-border bg-background pl-8 pr-3 text-sm text-foreground placeholder:text-muted-foreground",
                FOCUS_RING,
              )}
            />
          </div>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-sm">
              <thead className="border-b border-border bg-muted/40 text-xs">
                <tr>
                  <SortHeader
                    label="Facility"
                    active={sortKey === "name"}
                    dir={sortDir}
                    onClick={() => toggleSort("name")}
                  />
                  <th scope="col" className="px-3 py-2 text-left font-medium text-muted-foreground">
                    Region
                  </th>
                  <th scope="col" className="px-3 py-2 text-left font-medium text-muted-foreground">
                    Category
                  </th>
                  <SortHeader
                    label="RCS"
                    active={sortKey === "rcs"}
                    dir={sortDir}
                    onClick={() => toggleSort("rcs")}
                  />
                  <th scope="col" className="px-3 py-2 text-left font-medium text-muted-foreground">
                    Child services
                  </th>
                  <th scope="col" className="px-3 py-2 text-left font-medium text-muted-foreground">
                    Top hazard
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const TierIcon = row.tier ? TIER_ICON[row.tier] ?? ShieldCheck : ShieldCheck
                  return (
                    <tr key={row.id} className="border-b border-border/60 last:border-0 hover:bg-muted/40">
                      <td className="px-3 py-2">
                        <Link
                          href={`/dashboard/admin/facility/${row.id}`}
                          className={cn(
                            "rounded text-left font-medium text-foreground hover:underline",
                            FOCUS_RING,
                          )}
                          aria-label={`Open ${row.name}`}
                        >
                          {row.name}
                          <span className="block text-xs font-normal text-muted-foreground">
                            {row.city ?? "—"}
                          </span>
                        </Link>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{row.region ?? "—"}</td>
                      <td className="px-3 py-2 text-muted-foreground">{row.category ?? "—"}</td>
                      <td className="px-3 py-2">
                        {row.climateRcs == null ? (
                          <span className="text-xs text-muted-foreground">Not assessed yet</span>
                        ) : (
                          <div className="flex items-center gap-2">
                            <div
                              className="h-2 w-16 overflow-hidden rounded-full bg-muted"
                              role="progressbar"
                              aria-valuenow={row.climateRcs}
                              aria-valuemin={0}
                              aria-valuemax={100}
                              aria-label={`${row.name} RCS`}
                            >
                              <div
                                className={cn("h-full rounded-full", scoreBarColor(row.climateRcs))}
                                style={{ width: `${row.climateRcs}%` }}
                              />
                            </div>
                            <span className="tabular-nums font-medium text-foreground">{row.climateRcs}</span>
                            {row.tier && (
                              <Badge variant={TIER_BADGE[row.tier] ?? "default"} className="gap-1">
                                <TierIcon aria-hidden className="size-3" />
                                {row.tier}
                              </Badge>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <ChildServicesCell row={row} />
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {row.climate ? (
                          <>
                            {row.climate.topHazard.type}{" "}
                            <span className="tabular-nums text-foreground">
                              ({row.climate.topHazard.score})
                            </span>
                          </>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  )
                })}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-3 py-8 text-center text-sm text-muted-foreground">
                      {facilities.length === 0 ? "No facilities yet." : `No facilities match "${query}".`}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
