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
  ChevronLeft,
  ChevronRight,
  Eye,
  ExternalLink,
  type LucideIcon,
} from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Skeleton, TableSkeleton } from "@/components/ui/skeleton"
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
type TierFilter = "all" | ResilienceTier
type AssessmentFilter = "all" | "assessed" | "not"
type HazardFilter = "all" | "Heat" | "Flood" | "Wind / storm" | "Drought"

const PAGE_SIZE = 10
const TIERS: ResilienceTier[] = ["Resilient", "Developing", "At risk", "Critical"]
const HAZARD_OPTIONS: { value: HazardFilter; label: string }[] = [
  { value: "all", label: "All hazards" },
  { value: "Heat", label: "Heat" },
  { value: "Flood", label: "Flood" },
  { value: "Wind / storm", label: "Storm" },
  { value: "Drought", label: "Drought" },
]
const selectClass = "h-9 rounded-md border border-border bg-background px-2 text-sm text-foreground"

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

/** CRiPHC capacity dimensions (0..100, higher = better) for the detail modal. */
const DIMENSIONS: { key: "hes" | "csf" | "ecpq" | "edc" | "rrc"; label: string }[] = [
  { key: "hes", label: "Hazard Exposure (HES)" },
  { key: "csf", label: "Critical Service Fragility (CSF)" },
  { key: "ecpq", label: "Energy Continuity & Power Quality (ECPQ)" },
  { key: "edc", label: "Efficiency & Demand Control (EDC)" },
  { key: "rrc", label: "Readiness & Response Capacity (RRC)" },
]

function SortHeader({
  label,
  active,
  dir,
  onClick,
}: {
  label: string
  active: boolean
  dir: SortDir
  onClick: () => void
}) {
  const Icon = !active ? ArrowUpDown : dir === "asc" ? ArrowUp : ArrowDown
  return (
    <th scope="col" className="px-3 py-2 text-left font-medium">
      <button
        type="button"
        onClick={onClick}
        aria-label={`Sort by ${label}${active ? ` (${dir === "asc" ? "ascending" : "descending"})` : ""}`}
        className={cn("inline-flex items-center gap-1 rounded text-muted-foreground hover:text-foreground", FOCUS_RING)}
      >
        {label}
        <Icon aria-hidden className="size-3.5" />
      </button>
    </th>
  )
}

/**
 * Real child-service indicator. Only cold-chain (heat) and water-pumping
 * (drought/flood) are climate-derivable today; the cell summarises those.
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
          {failing} failing
        </Badge>
      )}
      {atRisk > 0 && (
        <Badge variant="warningSoft" className="gap-1">
          <TriangleAlert aria-hidden className="size-3" />
          {atRisk} at risk
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
  const [region, setRegion] = React.useState("all")
  const [category, setCategory] = React.useState("all")
  const [tier, setTier] = React.useState<TierFilter>("all")
  const [assessment, setAssessment] = React.useState<AssessmentFilter>("all")
  const [hazard, setHazard] = React.useState<HazardFilter>("all")
  const [sortKey, setSortKey] = React.useState<SortKey>("rcs")
  const [sortDir, setSortDir] = React.useState<SortDir>("asc")
  const [page, setPage] = React.useState(1)
  const [selected, setSelected] = React.useState<PortfolioFacility | null>(null)

  // Deep-link: a notification can request a facility's detail open directly.
  React.useEffect(() => {
    if (!focusFacilityId || facilities.length === 0) return
    const f = facilities.find((x) => x.id === focusFacilityId)
    if (f) setSelected(f)
    onFocusHandled?.()
  }, [focusFacilityId, facilities, onFocusHandled])

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
      if (tier !== "all" && f.tier !== tier) return false
      if (assessment === "assessed" && !f.assessed) return false
      if (assessment === "not" && f.assessed) return false
      if (hazard !== "all" && f.climate?.topHazard.type !== hazard) return false
      if (
        q &&
        !f.name.toLowerCase().includes(q) &&
        !(f.region ?? "").toLowerCase().includes(q) &&
        !(f.category ?? "").toLowerCase().includes(q)
      )
        return false
      return true
    })
    list.sort((a, b) => {
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
    return list
  }, [facilities, query, region, category, tier, assessment, hazard, sortKey, sortDir])

  React.useEffect(() => {
    setPage(1)
  }, [query, region, category, tier, assessment, hazard, sortKey, sortDir])

  const total = filtered.length
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const startIndex = (safePage - 1) * PAGE_SIZE
  const pageRows = filtered.slice(startIndex, startIndex + PAGE_SIZE)

  const hasActiveFilters =
    query !== "" || region !== "all" || category !== "all" || tier !== "all" || assessment !== "all" || hazard !== "all"
  const clearFilters = () => {
    setQuery("")
    setRegion("all")
    setCategory("all")
    setTier("all")
    setAssessment("all")
    setHazard("all")
  }

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(key)
      setSortDir("asc")
    }
  }

  if (isLoading) {
    return <PageSkeleton />
  }
  if (isError) {
    return <p className="text-sm text-destructive">Could not load facilities. Please retry.</p>
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="space-y-3 pb-3">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base">Facilities by resilience</CardTitle>
            <span className="text-xs text-muted-foreground">
              {total} {total === 1 ? "facility" : "facilities"}
            </span>
          </div>
          {/* Advanced filter bar */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search aria-hidden className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search name, region, category"
                aria-label="Search facilities"
                className={cn(
                  "h-9 w-48 rounded-md border border-border bg-background pl-8 pr-3 text-sm text-foreground placeholder:text-muted-foreground",
                  FOCUS_RING,
                )}
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
            <select value={tier} onChange={(e) => setTier(e.target.value as TierFilter)} aria-label="Filter by tier" className={cn(selectClass, FOCUS_RING)}>
              <option value="all">All tiers</option>
              {TIERS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <select value={assessment} onChange={(e) => setAssessment(e.target.value as AssessmentFilter)} aria-label="Filter by assessment status" className={cn(selectClass, FOCUS_RING)}>
              <option value="all">All facilities</option>
              <option value="assessed">Assessed</option>
              <option value="not">Not assessed</option>
            </select>
            <select value={hazard} onChange={(e) => setHazard(e.target.value as HazardFilter)} aria-label="Filter by top hazard" className={cn(selectClass, FOCUS_RING)}>
              {HAZARD_OPTIONS.map((o) => (
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
                {pageRows.map((row) => {
                  const TierIcon = row.tier ? TIER_ICON[row.tier] ?? ShieldCheck : ShieldCheck
                  return (
                    <tr key={row.id} className="border-b border-border/60 last:border-0 hover:bg-muted/40">
                      <td className="px-3 py-2">
                        <span className="font-medium text-foreground">{row.name}</span>
                        <span className="block text-xs font-normal text-muted-foreground">{row.city ?? "—"}</span>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{row.region ?? "—"}</td>
                      <td className="px-3 py-2 text-muted-foreground">{row.category ?? "—"}</td>
                      <td className="px-3 py-2">
                        {row.climateRcs == null ? (
                          <span className="text-xs text-muted-foreground">Not assessed yet</span>
                        ) : (
                          <div className="flex items-center gap-2">
                            <RcsBar value={row.climateRcs} />
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
                        {climateLoading && !row.climate ? <Skeleton className="h-6 w-20 rounded-full" /> : <ChildServicesCell row={row} />}
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
                {pageRows.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-3 py-8 text-center text-sm text-muted-foreground">
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
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={safePage === 1}
                >
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
                    <Button
                      key={pageNum}
                      variant={safePage === pageNum ? "default" : "outline"}
                      size="sm"
                      className="h-7 w-7 p-0 text-xs"
                      onClick={() => setPage(pageNum)}
                      aria-current={safePage === pageNum ? "page" : undefined}
                    >
                      {pageNum}
                    </Button>
                  )
                })}
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage === totalPages}
                >
                  Next
                  <ChevronRight aria-hidden className="ml-1 size-3.5" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Single-facility RCS detail preview */}
      <Dialog open={selected !== null} onOpenChange={(open) => { if (!open) setSelected(null) }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="flex flex-wrap items-center gap-2">
                  {selected.name}
                  {selected.climateRcs != null && selected.tier && (
                    <Badge variant={TIER_BADGE[selected.tier] ?? "default"}>
                      RCS {selected.climateRcs} · {selected.tier}
                    </Badge>
                  )}
                </DialogTitle>
                <DialogDescription>
                  {[selected.city, selected.region].filter(Boolean).join(", ") || "Location not set"}
                  {selected.category ? ` · ${selected.category}` : ""}
                </DialogDescription>
              </DialogHeader>
              <FacilityRcsDetail facility={selected} />
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
