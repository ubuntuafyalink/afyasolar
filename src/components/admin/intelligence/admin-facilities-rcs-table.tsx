"use client"

import * as React from "react"
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
import { DemoDataBadge } from "@/components/ui/demo-data-badge"
import { cn } from "@/lib/utils"
import { FOCUS_RING, scoreBarColor } from "@/lib/dashboard/facility-ui"
import { getPortfolioRows, type PortfolioRow } from "@/lib/dashboard/admin-portfolio-data"
import { NgoFacilityDetail } from "@/components/ngo/ngo-facility-detail"

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

function ChildServicesCell({ row }: { row: PortfolioRow }) {
  if (row.childFailing === 0 && row.childAtRisk === 0) {
    return (
      <Badge variant="success" className="gap-1">
        <ShieldCheck aria-hidden className="size-3" />
        All OK
      </Badge>
    )
  }
  return (
    <div className="flex flex-wrap gap-1">
      {row.childFailing > 0 && (
        <Badge variant="destructive" className="gap-1">
          <OctagonAlert aria-hidden className="size-3" />
          {row.childFailing} failing
        </Badge>
      )}
      {row.childAtRisk > 0 && (
        <Badge variant="warning" className="gap-1">
          <TriangleAlert aria-hidden className="size-3" />
          {row.childAtRisk} at risk
        </Badge>
      )}
    </div>
  )
}

/** Sortable, filterable RCS table of every facility; rows open a detail drawer. */
export function AdminFacilitiesRcsTable() {
  const allRows = React.useMemo(() => getPortfolioRows(), [])
  const [query, setQuery] = React.useState("")
  const [sortKey, setSortKey] = React.useState<SortKey>("rcs")
  const [sortDir, setSortDir] = React.useState<SortDir>("asc")
  const [selected, setSelected] = React.useState<PortfolioRow | null>(null)

  const rows = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    const filtered = q
      ? allRows.filter(
          (r) =>
            r.name.toLowerCase().includes(q) ||
            r.region.toLowerCase().includes(q) ||
            r.network.toLowerCase().includes(q),
        )
      : allRows.slice()
    filtered.sort((a, b) => {
      const cmp = sortKey === "name" ? a.name.localeCompare(b.name) : a.rcs - b.rcs
      return sortDir === "asc" ? cmp : -cmp
    })
    return filtered
  }, [allRows, query, sortKey, sortDir])

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(key)
      setSortDir(key === "rcs" ? "asc" : "asc")
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-col gap-3 pb-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-base">Facilities by resilience</CardTitle>
            <DemoDataBadge />
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
              placeholder="Filter by name, region, network"
              aria-label="Filter facilities by name, region or network"
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
                    Network
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
                  const TierIcon = TIER_ICON[row.tier] ?? ShieldCheck
                  return (
                    <tr key={row.id} className="border-b border-border/60 last:border-0 hover:bg-muted/40">
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() => setSelected(row)}
                          className={cn(
                            "rounded text-left font-medium text-foreground hover:underline",
                            FOCUS_RING,
                          )}
                          aria-label={`Open details for ${row.name}`}
                        >
                          {row.name}
                          <span className="block text-xs font-normal text-muted-foreground">
                            {row.district}
                          </span>
                        </button>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{row.region}</td>
                      <td className="px-3 py-2 text-muted-foreground">{row.network}</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <div
                            className="h-2 w-16 overflow-hidden rounded-full bg-muted"
                            role="progressbar"
                            aria-valuenow={row.rcs}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-label={`${row.name} RCS`}
                          >
                            <div
                              className={cn("h-full rounded-full", scoreBarColor(row.rcs))}
                              style={{ width: `${row.rcs}%` }}
                            />
                          </div>
                          <span className="tabular-nums font-medium text-foreground">{row.rcs}</span>
                          <Badge variant={TIER_BADGE[row.tier] ?? "default"} className="gap-1">
                            <TierIcon aria-hidden className="size-3" />
                            {row.tier}
                          </Badge>
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <ChildServicesCell row={row} />
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {row.topHazard.type}{" "}
                        <span className="tabular-nums text-foreground">({row.topHazard.score})</span>
                      </td>
                    </tr>
                  )
                })}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-3 py-8 text-center text-sm text-muted-foreground">
                      No facilities match “{query}”.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {selected && <NgoFacilityDetail facility={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
