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
import { useAdminPortfolio } from "@/hooks/use-admin-portfolio"
import { childServiceStatus } from "@/lib/dashboard/admin-portfolio-real"
import { assessPortfolioFacilityRisk } from "@/lib/intelligence/risk-features"
import type { RiskTier } from "@/lib/intelligence/risk-model"
import type { PortfolioFacility, ResilienceTier } from "@/lib/dashboard/admin-portfolio-types"

const RISK_TIER_BADGE: Record<RiskTier, "successSoft" | "primarySoft" | "warningSoft" | "destructiveSoft"> = {
  Low: "successSoft",
  Elevated: "primarySoft",
  High: "warningSoft",
  Severe: "destructiveSoft",
}

/** Modelled disruption-risk cell (tier + top driver). Calibrated prior, not a forecast. */
function RiskCell({ row }: { row: PortfolioFacility }) {
  const risk = assessPortfolioFacilityRisk(row)
  if (!risk.sufficientData) {
    return <span className="text-xs text-muted-foreground">Insufficient data</span>
  }
  const topDriver = risk.drivers.find((d) => d.direction === "increases")
  return (
    <div className="space-y-0.5">
      <Badge variant={RISK_TIER_BADGE[risk.tier]} title="Modelled disruption-risk prior — not a validated forecast">
        {risk.tier} · {Math.round(risk.probability * 100)}%
      </Badge>
      {topDriver ? <span className="block text-xs text-muted-foreground">{topDriver.label.en}</span> : null}
    </div>
  )
}

type SortKey = "name" | "rcs"
type SortDir = "asc" | "desc"

const TIER_BADGE: Record<string, "successSoft" | "primarySoft" | "warningSoft" | "destructiveSoft"> = {
  Resilient: "successSoft",
  Developing: "primarySoft",
  "At risk": "warningSoft",
  Critical: "destructiveSoft",
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
      <Badge variant="successSoft" className="gap-1">
        <ShieldCheck aria-hidden className="size-3" />
        All OK
      </Badge>
    )
  }
  return (
    <div className="flex flex-wrap gap-1">
      {failing > 0 && (
        <Badge variant="destructiveSoft" className="gap-1">
          <OctagonAlert aria-hidden className="size-3" />
          {row.childFailing} failing
        </Badge>
      )}
      {atRisk > 0 && (
        <Badge variant="warningSoft" className="gap-1">
          <TriangleAlert aria-hidden className="size-3" />
          {row.childAtRisk} at risk
        </Badge>
      )}
    </div>
  )
}

function RcsBar({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className="h-2 w-16 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className={cn("h-full rounded-full", scoreBarColor(value))} style={{ width: `${value}%` }} />
      </div>
      <span className="w-9 shrink-0 text-right tabular-nums font-medium text-foreground">{value}</span>
    </div>
  )
}

/** Detail body shown in the per-facility modal: CRiPHC dimensions + hazards. */
function FacilityRcsDetail({ facility }: { facility: PortfolioFacility }) {
  return (
    <div className="space-y-5">
      <section>
        <h3 className="mb-2 text-sm font-semibold text-foreground">Resilience dimensions (CRiPHC)</h3>
        {facility.dimensions == null ? (
          <p className="text-sm text-muted-foreground">Not assessed yet.</p>
        ) : (
          <ul className="space-y-2">
            {DIMENSIONS.map((d) => {
              const v = facility.dimensions?.[d.key]
              return (
                <li key={d.key} className="flex items-center justify-between gap-3 rounded-lg border border-border p-2.5">
                  <span className="text-sm text-foreground">{d.label}</span>
                  {v == null ? (
                    <span className="text-xs text-muted-foreground">N/A</span>
                  ) : (
                    <RcsBar value={v} />
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section>
        <h3 className="mb-2 text-sm font-semibold text-foreground">Climate hazards (NASA POWER)</h3>
        {!facility.climate || facility.climate.hazardScores.length === 0 ? (
          <p className="text-sm text-muted-foreground">Climate data pending for this facility.</p>
        ) : (
          <ul className="space-y-2">
            {facility.climate.hazardScores.map((h) => (
              <li key={h.type} className="flex items-center justify-between gap-3 rounded-lg border border-border p-2.5">
                <span className="text-sm text-foreground">
                  {h.type}
                  <span className="ml-2 text-xs text-muted-foreground">({h.trend})</span>
                </span>
                <RcsBar value={h.score} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <Button asChild variant="outline" size="sm" className="gap-1">
        <Link href={`/dashboard/admin/facility/${facility.id}`}>
          <ExternalLink aria-hidden className="size-3.5" />
          Open full facility dashboard
        </Link>
      </Button>
    </div>
  )
}

/** Full-page skeleton matching the Resilience Score layout. */
function PageSkeleton() {
  return (
    <Card>
      <CardHeader className="space-y-3 pb-3">
        <div className="flex items-center justify-between gap-2">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-20" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="h-9 w-44" />
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-9 w-28" />
        </div>
      </CardHeader>
      <CardContent className="px-3 pb-4 md:px-6">
        <TableSkeleton rows={8} columns={7} />
      </CardContent>
    </Card>
  )
}

/** Sortable, filterable, paginated RCS table; each row opens a detail modal. */
export function AdminFacilitiesRcsTable({
  focusFacilityId,
  onFocusHandled,
}: {
  focusFacilityId?: string | null
  onFocusHandled?: () => void
} = {}) {
  const { facilities, isLoading, isError, climateLoading } = useAdminPortfolio()
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
            <table className="w-full min-w-[980px] border-collapse text-sm">
              <thead className="border-b border-border bg-muted/40 text-xs">
                <tr>
                  <SortHeader label="Facility" active={sortKey === "name"} dir={sortDir} onClick={() => toggleSort("name")} />
                  <th scope="col" className="px-3 py-2 text-left font-medium text-muted-foreground">Region</th>
                  <th scope="col" className="px-3 py-2 text-left font-medium text-muted-foreground">Category</th>
                  <SortHeader label="RCS" active={sortKey === "rcs"} dir={sortDir} onClick={() => toggleSort("rcs")} />
                  <th scope="col" className="px-3 py-2 text-left font-medium text-muted-foreground">Child services</th>
                  <th scope="col" className="px-3 py-2 text-left font-medium text-muted-foreground">Top hazard</th>
                  <th scope="col" className="px-3 py-2 text-left font-medium text-muted-foreground">Disruption risk</th>
                  <th scope="col" className="px-3 py-2 text-right font-medium text-muted-foreground">Details</th>
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
                        {climateLoading && !row.climate ? (
                          <Skeleton className="h-4 w-24" />
                        ) : row.climate ? (
                          <>
                            {row.climate.topHazard.type}{" "}
                            <span className="tabular-nums text-foreground">({row.climate.topHazard.score})</span>
                          </>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {climateLoading && !row.climate ? <Skeleton className="h-6 w-24 rounded-full" /> : <RiskCell row={row} />}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={() => setSelected(row)}>
                          <Eye aria-hidden className="size-3.5" />
                          View
                        </Button>
                      </td>
                    </tr>
                  )
                })}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-3 py-8 text-center text-sm text-muted-foreground">
                      {facilities.length === 0 ? "No facilities yet." : "No facilities match the current filters."}
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
