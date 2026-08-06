"use client"

import * as React from "react"
import dynamic from "next/dynamic"
import { Sun, Zap, DollarSign, ClipboardCheck, Search, ChevronLeft, ChevronRight, Eye } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { StatCard } from "@/components/ui/stat-card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Skeleton, TableSkeleton } from "@/components/ui/skeleton"
import { cn, formatCurrency } from "@/lib/utils"
import { FOCUS_RING } from "@/lib/dashboard/facility-ui"
import { useAdminPortfolio } from "@/hooks/use-admin-portfolio"
import { useFacilityAssessmentReports } from "@/hooks/use-facility-assessment-reports"
import type { PortfolioFacility } from "@/lib/dashboard/admin-portfolio-types"

// Lazy-load the heavy facility Power section only when a drill-down opens.
const PowerSection = dynamic(
  () => import("@/components/dashboard/facility/power-section").then((m) => m.PowerSection),
  { ssr: false, loading: () => <div className="h-72 animate-pulse rounded-lg bg-muted" /> },
)

type AssessmentFilter = "all" | "assessed" | "not"
const PAGE_SIZE = 10
const selectClass = "h-9 rounded-md border border-border bg-background px-2 text-sm text-foreground"

const num = (v: number | null | undefined, suffix: string): string =>
  v != null ? `${Number.isInteger(v) ? v : v.toFixed(1)}${suffix}` : "—"

// --- per-facility drill-down (embeds the real facility Power section) --------

function PowerDrillDown({ facility }: { facility: PortfolioFacility }) {
  const { data, isLoading } = useFacilityAssessmentReports(facility.id)
  return (
    <>
      <DialogHeader>
        <DialogTitle>{facility.name}</DialogTitle>
        <DialogDescription>
          {[facility.city, facility.region].filter(Boolean).join(", ") || "Location not set"} &middot; power outlook
        </DialogDescription>
      </DialogHeader>
      {isLoading ? (
        <div className="h-72 animate-pulse rounded-lg bg-muted" />
      ) : (
        <PowerSection
          facilityId={facility.id}
          region={facility.region}
          meuSummary={data?.meuSummary ?? null}
          sizingSummary={data?.sizingSummary ?? null}
        />
      )}
    </>
  )
}

// --- skeleton ----------------------------------------------------------------

function PageSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="space-y-2 p-5">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-7 w-20" />
            </CardContent>
          </Card>
        ))}
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

export function AdminPower() {
  const { facilities, isLoading, isError } = useAdminPortfolio()

  const [query, setQuery] = React.useState("")
  const [region, setRegion] = React.useState("all")
  const [category, setCategory] = React.useState("all")
  const [assessment, setAssessment] = React.useState<AssessmentFilter>("all")
  const [page, setPage] = React.useState(1)
  const [selected, setSelected] = React.useState<PortfolioFacility | null>(null)

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

  // Portfolio totals (over energy-assessed facilities).
  const totals = React.useMemo(() => {
    const assessed = facilities.filter((f) => f.energy)
    const sum = (pick: (f: PortfolioFacility) => number | null | undefined) =>
      assessed.reduce((s, f) => s + (pick(f) ?? 0), 0)
    return {
      assessed: assessed.length,
      solarKw: sum((f) => f.energy?.solarArraySize),
      dailyLoad: sum((f) => f.energy?.dailyLoad),
      savings: sum((f) => f.energy?.annualSavings),
    }
  }, [facilities])

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = facilities.filter((f) => {
      if (region !== "all" && f.region !== region) return false
      if (category !== "all" && f.category !== category) return false
      if (assessment === "assessed" && !f.energy) return false
      if (assessment === "not" && f.energy) return false
      if (q && !f.name.toLowerCase().includes(q) && !(f.region ?? "").toLowerCase().includes(q)) return false
      return true
    })
    return list.sort(
      (a, b) => (b.energy?.solarArraySize ?? -1) - (a.energy?.solarArraySize ?? -1) || a.name.localeCompare(b.name),
    )
  }, [facilities, query, region, category, assessment])

  React.useEffect(() => {
    setPage(1)
  }, [query, region, category, assessment])

  const total = filtered.length
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const startIndex = (safePage - 1) * PAGE_SIZE
  const pageRows = filtered.slice(startIndex, startIndex + PAGE_SIZE)

  const hasActiveFilters = query !== "" || region !== "all" || category !== "all" || assessment !== "all"
  const clearFilters = () => {
    setQuery("")
    setRegion("all")
    setCategory("all")
    setAssessment("all")
  }

  if (isLoading) {
    return <PageSkeleton />
  }
  if (isError) {
    return <p className="text-sm text-destructive">Could not load portfolio data. Please retry.</p>
  }

  return (
    <div className="space-y-4">
      {/* Portfolio power summary */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Energy assessed"
          value={`${totals.assessed}/${facilities.length}`}
          icon={<ClipboardCheck />}
          accent="primary"
          meta="Facilities with a sizing assessment"
        />
        <StatCard
          title="Total solar capacity"
          value={`${totals.solarKw.toFixed(1)} kW`}
          icon={<Sun />}
          accent="solar"
          meta="Sum of assessed array sizes"
        />
        <StatCard
          title="Assessed daily load"
          value={`${totals.dailyLoad.toFixed(1)} kWh/d`}
          icon={<Zap />}
          accent="primary"
          meta="Sum of daily loads"
        />
        <StatCard
          title="Modelled annual savings"
          value={formatCurrency(totals.savings)}
          icon={<DollarSign />}
          accent="success"
          meta="Sum across assessed facilities"
        />
      </div>

      {/* Per-facility power table */}
      <Card>
        <CardHeader className="space-y-3 pb-3">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base">Facilities by power</CardTitle>
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
            <select value={assessment} onChange={(e) => setAssessment(e.target.value as AssessmentFilter)} aria-label="Filter by assessment" className={cn(selectClass, FOCUS_RING)}>
              <option value="all">All facilities</option>
              <option value="assessed">Energy assessed</option>
              <option value="not">Not assessed</option>
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
                  <th scope="col" className="px-3 py-2 text-right font-medium text-muted-foreground">Solar</th>
                  <th scope="col" className="px-3 py-2 text-right font-medium text-muted-foreground">Daily load</th>
                  <th scope="col" className="px-3 py-2 text-right font-medium text-muted-foreground">Power need</th>
                  <th scope="col" className="px-3 py-2 text-right font-medium text-muted-foreground">Annual savings</th>
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
                    {f.energy ? (
                      <>
                        <td className="px-3 py-2 text-right tabular-nums text-foreground">{num(f.energy.solarArraySize, " kW")}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-foreground">{num(f.energy.dailyLoad, " kWh")}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-foreground">{num(f.energy.requiredKw, " kW")}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-foreground">
                          {f.energy.annualSavings != null ? formatCurrency(f.energy.annualSavings) : "—"}
                        </td>
                      </>
                    ) : (
                      <td className="px-3 py-2 text-left text-xs text-muted-foreground" colSpan={4}>
                        Not assessed
                      </td>
                    )}
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
                    <td colSpan={7} className="px-3 py-8 text-center text-sm text-muted-foreground">
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

      {/* Per-facility full Power section */}
      <Dialog open={selected !== null} onOpenChange={(open) => { if (!open) setSelected(null) }}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          {selected && <PowerDrillDown facility={selected} />}
        </DialogContent>
      </Dialog>
    </div>
  )
}
