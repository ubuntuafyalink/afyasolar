"use client"

import * as React from "react"
import dynamic from "next/dynamic"
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts"
import { Search, ChevronLeft, ChevronRight, Eye, Satellite } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Skeleton, TableSkeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { FOCUS_RING } from "@/lib/dashboard/facility-ui"
import { useAdminPortfolio } from "@/hooks/use-admin-portfolio"
import { useAdminPortfolioClimate } from "@/hooks/use-admin-portfolio-climate"
import { AdminPortfolioForecastCard } from "@/components/admin/intelligence/admin-portfolio-forecast-card"
import { projectCvi } from "@/lib/climate/nasa-power"
import type { PortfolioFacility } from "@/lib/dashboard/admin-portfolio-types"

// Lazy-load the heavy facility Climate Outlook only when a drill-down opens.
const ClimateOutlookSection = dynamic(
  () => import("@/components/dashboard/facility/climate-outlook-section").then((m) => m.ClimateOutlookSection),
  { ssr: false, loading: () => <div className="h-72 animate-pulse rounded-lg bg-muted" /> },
)

// Real OpenStreetMap-tile map; ssr:false because Leaflet needs the browser window.
const AdminFacilitiesLeafletMap = dynamic(
  () => import("@/components/admin/intelligence/admin-facilities-leaflet-map").then((m) => m.AdminFacilitiesLeafletMap),
  {
    ssr: false,
    loading: () => (
      <Card>
        <CardContent className="p-4">
          <Skeleton className="h-[440px] w-full rounded-lg" />
        </CardContent>
      </Card>
    ),
  },
)

type HazardKey = "heat" | "flood" | "storm" | "drought"
const HAZARDS: { key: HazardKey; label: string; color: string }[] = [
  { key: "heat", label: "Heat", color: "#ef4444" },
  { key: "flood", label: "Flood", color: "#3b82f6" },
  { key: "storm", label: "Storm", color: "#8b5cf6" },
  { key: "drought", label: "Drought", color: "#f59e0b" },
]

type HazardFilter = "all" | "Heat" | "Flood" | "Wind / storm" | "Drought"
const HAZARD_FILTER_OPTIONS: { value: HazardFilter; label: string }[] = [
  { value: "all", label: "All hazards" },
  { value: "Heat", label: "Heat" },
  { value: "Flood", label: "Flood" },
  { value: "Wind / storm", label: "Storm" },
  { value: "Drought", label: "Drought" },
]

const PAGE_SIZE = 10
const selectClass = "h-9 rounded-md border border-border bg-background px-2 text-sm text-foreground"

function exposureText(score: number): string {
  if (score >= 66) return "text-destructive"
  if (score >= 40) return "text-warning-foreground"
  return "text-success"
}
function exposureBand(score: number): "High" | "Moderate" | "Low" {
  if (score >= 66) return "High"
  if (score >= 40) return "Moderate"
  return "Low"
}

// --- portfolio hazard summary ------------------------------------------------

function HazardSummaryCard({ hazard, scores }: { hazard: (typeof HAZARDS)[number]; scores: number[] }) {
  const n = scores.length
  const avg = n ? Math.round(scores.reduce((s, v) => s + v, 0) / n) : null
  const high = scores.filter((s) => s >= 66).length
  const mod = scores.filter((s) => s >= 40 && s < 66).length
  const low = scores.filter((s) => s < 40).length
  const pct = (x: number) => (n ? (x / n) * 100 : 0)
  return (
    <Card>
      <CardContent className="space-y-2 p-4">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-sm font-medium text-foreground">
            <span className="size-2.5 rounded-full" style={{ background: hazard.color }} aria-hidden />
            {hazard.label}
          </span>
          <span className={cn("text-lg font-semibold tabular-nums", avg != null ? exposureText(avg) : "text-muted-foreground")}>
            {avg != null ? avg : "—"}
          </span>
        </div>
        <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted" role="presentation">
          {high > 0 && <div className="h-full bg-destructive" style={{ width: `${pct(high)}%` }} />}
          {mod > 0 && <div className="h-full bg-warning" style={{ width: `${pct(mod)}%` }} />}
          {low > 0 && <div className="h-full bg-success" style={{ width: `${pct(low)}%` }} />}
        </div>
        <p className="text-xs text-muted-foreground">
          {high} high · {mod} moderate · {low} low
        </p>
      </CardContent>
    </Card>
  )
}

// --- portfolio CVI (2030/2050) ----------------------------------------------

function PortfolioCvi({ base }: { base: { composite: number; byHazard: { flood: number; drought: number; heat: number; storm: number } } }) {
  const [year, setYear] = React.useState<2030 | 2050>(2030)
  const cvi = projectCvi(base, year)
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base">Climate Vulnerability Index</CardTitle>
        <div className="flex gap-1">
          {([2030, 2050] as const).map((y) => (
            <button
              key={y}
              type="button"
              onClick={() => setYear(y)}
              aria-pressed={year === y}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                FOCUS_RING,
                year === y ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-muted-foreground hover:bg-muted",
              )}
            >
              {y}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-end gap-2">
          <span className={cn("text-4xl font-bold tabular-nums", exposureText(cvi.composite))}>{cvi.composite}</span>
          <span className="pb-1 text-sm text-muted-foreground">/ 100 composite</span>
        </div>
        <ul className="space-y-2">
          {HAZARDS.map((h) => {
            const v = cvi.byHazard[h.key]
            return (
              <li key={h.key} className="flex items-center gap-3">
                <span className="w-16 text-sm text-foreground">{h.label}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full" style={{ width: `${v}%`, background: h.color }} />
                </div>
                <span className="w-8 text-right text-xs font-semibold tabular-nums text-foreground">{v}</span>
              </li>
            )
          })}
        </ul>
        <p className="text-xs text-muted-foreground">
          {year === 2050 ? "Projected (transparent +12/hazard scenario, not a climate-model forecast)." : "Current baseline from NASA POWER."}
        </p>
      </CardContent>
    </Card>
  )
}

// --- skeleton ---------------------------------------------------------------

function PageSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="space-y-2 p-4">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-2 w-full rounded-full" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="p-4">
            <Skeleton className="h-64 w-full rounded-lg" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <Skeleton className="h-64 w-full rounded-lg" />
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardContent className="p-4">
          <TableSkeleton rows={8} columns={6} />
        </CardContent>
      </Card>
    </div>
  )
}

// --- main --------------------------------------------------------------------

export function AdminClimateOutlook({
  focusFacilityId,
  onFocusHandled,
}: {
  focusFacilityId?: string | null
  onFocusHandled?: () => void
} = {}) {
  const { facilities, isLoading, isError, climateLoading } = useAdminPortfolio()
  const climateQuery = useAdminPortfolioClimate()
  const aggregate = climateQuery.data?.aggregate

  const [query, setQuery] = React.useState("")
  const [region, setRegion] = React.useState("all")
  const [category, setCategory] = React.useState("all")
  const [hazard, setHazard] = React.useState<HazardFilter>("all")
  const [page, setPage] = React.useState(1)
  const [selected, setSelected] = React.useState<PortfolioFacility | null>(null)

  // Deep-link: a notification can request a facility's detail open directly.
  React.useEffect(() => {
    if (!focusFacilityId || facilities.length === 0) return
    const f = facilities.find((x) => x.id === focusFacilityId)
    if (f) setSelected(f)
    onFocusHandled?.()
  }, [focusFacilityId, facilities, onFocusHandled])

  const withClimate = React.useMemo(() => facilities.filter((f) => f.climate), [facilities])
  const regions = React.useMemo(() => {
    const set = new Set<string>()
    for (const f of facilities) if (f.region) set.add(f.region)
    return ["all", ...[...set].sort()]
  }, [facilities])
  const categories = React.useMemo(() => {
    const set = new Set<string>()
    for (const f of facilities) if (f.category) set.add(f.category)
    return ["all", ...[...set].sort()]
  }, [facilities])

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = facilities.filter((f) => {
      if (region !== "all" && f.region !== region) return false
      if (category !== "all" && f.category !== category) return false
      if (hazard !== "all" && f.climate?.topHazard.type !== hazard) return false
      if (q && !f.name.toLowerCase().includes(q) && !(f.region ?? "").toLowerCase().includes(q)) return false
      return true
    })
    // Most-exposed first (by composite), unassessed/no-climate last.
    return list.sort((a, b) => (b.climate?.composite ?? -1) - (a.climate?.composite ?? -1) || a.name.localeCompare(b.name))
  }, [facilities, query, region, category, hazard])

  React.useEffect(() => {
    setPage(1)
  }, [query, region, category, hazard])

  const total = filtered.length
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const startIndex = (safePage - 1) * PAGE_SIZE
  const pageRows = filtered.slice(startIndex, startIndex + PAGE_SIZE)

  const hasActiveFilters = query !== "" || region !== "all" || category !== "all" || hazard !== "all"
  const clearFilters = () => {
    setQuery("")
    setRegion("all")
    setCategory("all")
    setHazard("all")
  }

  if (isLoading) {
    return <PageSkeleton />
  }
  if (isError) {
    return <p className="text-sm text-destructive">Could not load portfolio data. Please retry.</p>
  }

  return (
    <div className="space-y-4">
      {/* Portfolio hazard summary */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {HAZARDS.map((h) => (
          <HazardSummaryCard key={h.key} hazard={h} scores={withClimate.map((f) => f.climate!.byHazard[h.key])} />
        ))}
      </div>

      {/* Portfolio trend + CVI */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Satellite aria-hidden className="size-4 text-primary" />
              Portfolio hazard trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            {climateLoading && !aggregate ? (
              <Skeleton className="h-64 w-full rounded-lg" />
            ) : !aggregate || aggregate.trend.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">No climate data yet.</p>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={aggregate.trend} margin={{ top: 8, right: 12, bottom: 0, left: -16 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{
                        fontSize: 12,
                        borderRadius: 8,
                        border: "1px solid var(--color-border)",
                        background: "var(--color-card)",
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    {HAZARDS.map((h) => (
                      <Line key={h.key} type="monotone" dataKey={h.key} name={h.label} stroke={h.color} strokeWidth={2} dot={false} />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
                <p className="mt-2 text-xs text-muted-foreground">
                  Facility-weighted average hazard exposure across {aggregate.facilitiesWithClimate} facilities (NASA POWER).
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {climateLoading && !aggregate ? (
          <Card>
            <CardContent className="p-4">
              <Skeleton className="h-64 w-full rounded-lg" />
            </CardContent>
          </Card>
        ) : aggregate ? (
          <PortfolioCvi base={{ composite: aggregate.composite, byHazard: aggregate.byHazard }} />
        ) : (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">No climate data yet.</CardContent>
          </Card>
        )}
      </div>

      {/* Forward-looking portfolio AI forecast (Chronos, served by the AI service) */}
      <AdminPortfolioForecastCard />

      {/* Facility map (real OpenStreetMap tiles) */}
      <AdminFacilitiesLeafletMap facilities={facilities} />

      {/* Per-facility hazard table */}
      <Card>
        <CardHeader className="space-y-3 pb-3">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base">Facilities by climate exposure</CardTitle>
            <span className="text-xs text-muted-foreground">
              {total} {total === 1 ? "facility" : "facilities"}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search aria-hidden className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search name or region"
                aria-label="Search facilities"
                className={cn("h-9 w-44 rounded-md border border-border bg-background pl-8 pr-3 text-sm text-foreground placeholder:text-muted-foreground", FOCUS_RING)}
              />
            </div>
            <select value={region} onChange={(e) => setRegion(e.target.value)} aria-label="Filter by region" className={cn(selectClass, FOCUS_RING)}>
              {regions.map((r) => (
                <option key={r} value={r}>{r === "all" ? "All regions" : r}</option>
              ))}
            </select>
            <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Filter by category" className={cn(selectClass, FOCUS_RING)}>
              {categories.map((c) => (
                <option key={c} value={c}>{c === "all" ? "All categories" : c}</option>
              ))}
            </select>
            <select value={hazard} onChange={(e) => setHazard(e.target.value as HazardFilter)} aria-label="Filter by top hazard" className={cn(selectClass, FOCUS_RING)}>
              {HAZARD_FILTER_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9">
                Clear filters
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="px-0 pb-4">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] border-collapse text-sm">
              <thead className="border-b border-border bg-muted/40 text-xs">
                <tr>
                  <th scope="col" className="px-3 py-2 text-left font-medium text-muted-foreground">Facility</th>
                  <th scope="col" className="px-3 py-2 text-left font-medium text-muted-foreground">Region</th>
                  {HAZARDS.map((h) => (
                    <th key={h.key} scope="col" className="px-3 py-2 text-left font-medium text-muted-foreground">{h.label}</th>
                  ))}
                  <th scope="col" className="px-3 py-2 text-left font-medium text-muted-foreground">Top hazard</th>
                  <th scope="col" className="px-3 py-2 text-right font-medium text-muted-foreground">Details</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((f) => (
                  <tr key={f.id} className="border-b border-border/60 last:border-0 hover:bg-muted/40">
                    <td className="px-3 py-2">
                      <span className="font-medium text-foreground">{f.name}</span>
                      <span className="block text-xs font-normal text-muted-foreground">{f.city ?? "—"}</span>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{f.region ?? "—"}</td>
                    {HAZARDS.map((h) => (
                      <td key={h.key} className="px-3 py-2">
                        {climateLoading && !f.climate ? (
                          <Skeleton className="h-4 w-8" />
                        ) : f.climate ? (
                          <span className={cn("font-semibold tabular-nums", exposureText(f.climate.byHazard[h.key]))}>
                            {f.climate.byHazard[h.key]}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                    ))}
                    <td className="px-3 py-2 text-muted-foreground">
                      {climateLoading && !f.climate ? (
                        <Skeleton className="h-4 w-24" />
                      ) : f.climate ? (
                        <span>
                          {f.climate.topHazard.type}{" "}
                          <Badge variant="outline" className="ml-1">{exposureBand(f.climate.topHazard.score)}</Badge>
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={() => setSelected(f)}>
                        <Eye aria-hidden className="size-3.5" />
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
                {pageRows.length === 0 && (
                  <tr>
                    <td colSpan={HAZARDS.length + 4} className="px-3 py-8 text-center text-sm text-muted-foreground">
                      {facilities.length === 0 ? "No facilities yet." : "No facilities match the current filters."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex flex-wrap items-center justify-between gap-3 px-3 pt-4">
              <p className="text-xs text-muted-foreground">
                Showing {startIndex + 1}-{Math.min(startIndex + PAGE_SIZE, total)} of {total}
              </p>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={safePage === 1}>
                  <ChevronLeft aria-hidden className="mr-1 size-3.5" />
                  Prev
                </Button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number
                  if (totalPages <= 5) pageNum = i + 1
                  else if (safePage <= 3) pageNum = i + 1
                  else if (safePage >= totalPages - 2) pageNum = totalPages - 4 + i
                  else pageNum = safePage - 2 + i
                  return (
                    <Button key={pageNum} variant={safePage === pageNum ? "default" : "outline"} size="sm" className="h-7 w-7 p-0 text-xs" onClick={() => setPage(pageNum)} aria-current={safePage === pageNum ? "page" : undefined}>
                      {pageNum}
                    </Button>
                  )
                })}
                <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}>
                  Next
                  <ChevronRight aria-hidden className="ml-1 size-3.5" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Per-facility full Climate Outlook */}
      <Dialog open={selected !== null} onOpenChange={(open) => { if (!open) setSelected(null) }}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>{selected.name}</DialogTitle>
                <DialogDescription>
                  {[selected.city, selected.region].filter(Boolean).join(", ") || "Location not set"} · full climate outlook
                </DialogDescription>
              </DialogHeader>
              <ClimateOutlookSection
                facilityId={selected.id}
                facilityName={selected.name}
                region={selected.region}
                coords={selected.lat != null && selected.lon != null ? { lat: selected.lat, lon: selected.lon } : undefined}
              />
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
