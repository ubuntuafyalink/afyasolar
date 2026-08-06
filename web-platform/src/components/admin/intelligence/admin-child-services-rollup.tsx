"use client"

import * as React from "react"
import {
  OctagonAlert,
  TriangleAlert,
  ShieldCheck,
  CircleDashed,
  Snowflake,
  Baby,
  HeartPulse,
  Microscope,
  Droplets,
  Search,
  ChevronLeft,
  ChevronRight,
  Eye,
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
import {
  childServiceRollup,
  childServiceHeadroom,
  childServiceStatus,
  childServiceSource,
} from "@/lib/dashboard/admin-portfolio-real"
import type {
  PortfolioFacility,
  ServiceRollup,
  ChildServiceStatus,
  ResilienceTier,
} from "@/lib/dashboard/admin-portfolio-types"
import type { ChildServiceKey } from "@/lib/dashboard/facility-demo-data"

// --- static service metadata (English; admin is not i18n yet) ---------------

type ServiceMeta = {
  key: ChildServiceKey
  label: string
  icon: LucideIcon
  dependsOn: string
  dimension: string
}

const SERVICES: ServiceMeta[] = [
  { key: "cold-chain", label: "Vaccine cold-chain", icon: Snowflake, dependsOn: "Continuous power to the vaccine fridge", dimension: "ECPQ" },
  { key: "maternity", label: "Maternity", icon: Baby, dependsOn: "Power for delivery, lighting and warmers", dimension: "CSF" },
  { key: "neonatal", label: "Neonatal care", icon: HeartPulse, dependsOn: "Power for warmers, oxygen and monitoring", dimension: "CSF" },
  { key: "diagnostics", label: "Diagnostics (lab)", icon: Microscope, dependsOn: "Power for lab equipment and analysers", dimension: "EDC" },
  { key: "water-pumping", label: "Water pumping", icon: Droplets, dependsOn: "Power and supply for water pumping and storage", dimension: "HES" },
]
const SERVICE_LABELS = Object.fromEntries(SERVICES.map((s) => [s.key, s.label])) as Record<ChildServiceKey, string>

const SOURCE_LABEL: Record<"nasa" | "csf" | "edc", string> = {
  nasa: "Climate exposure (NASA POWER)",
  csf: "From CSF assessment",
  edc: "From EDC assessment",
}

const STATUS_META: Record<
  ChildServiceStatus,
  { label: string; variant: "destructive" | "warning" | "success" | "secondary"; icon: LucideIcon }
> = {
  failing: { label: "Failing", variant: "destructive", icon: OctagonAlert },
  "at-risk": { label: "At risk", variant: "warning", icon: TriangleAlert },
  ok: { label: "OK", variant: "success", icon: ShieldCheck },
  "not-assessed": { label: "Not assessed", variant: "secondary", icon: CircleDashed },
}

function StatusBadge({ status, compact }: { status: ChildServiceStatus; compact?: boolean }) {
  const m = STATUS_META[status]
  const Icon = m.icon
  return (
    <Badge variant={m.variant} className="gap-1">
      <Icon aria-hidden className="size-3" />
      {compact && status === "not-assessed" ? "—" : m.label}
    </Badge>
  )
}

function HeadroomBar({ headroom }: { headroom: number }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className="h-2 w-16 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={headroom}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className={cn("h-full rounded-full", scoreBarColor(headroom))} style={{ width: `${headroom}%` }} />
      </div>
      <span className="w-9 shrink-0 text-right text-xs font-semibold tabular-nums text-foreground">{headroom}</span>
    </div>
  )
}

// --- portfolio summary (per-service rollup) ---------------------------------

const CLIMATE_DERIVED: Record<ChildServiceKey, boolean> = {
  "cold-chain": true,
  maternity: false,
  neonatal: false,
  diagnostics: false,
  "water-pumping": true,
}

function ServiceRollupRow({ row, loading }: { row: ServiceRollup; loading?: boolean }) {
  const total = row.failing + row.atRisk + row.ok + row.notAssessed
  const pct = (n: number) => (total ? (n / total) * 100 : 0)
  const label = SERVICE_LABELS[row.key]
  return (
    <li className="space-y-1.5">
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="font-medium text-foreground">{label}</span>
        {loading ? (
          <Skeleton className="h-4 w-28" />
        ) : (
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
        )}
      </div>
      {loading ? (
        <Skeleton className="h-3 w-full rounded-full" />
      ) : (
        <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted" role="presentation">
          {row.failing > 0 && <div className="h-full bg-destructive" style={{ width: `${pct(row.failing)}%` }} />}
          {row.atRisk > 0 && <div className="h-full bg-warning" style={{ width: `${pct(row.atRisk)}%` }} />}
          {row.ok > 0 && <div className="h-full bg-success" style={{ width: `${pct(row.ok)}%` }} />}
        </div>
      )}
    </li>
  )
}

/** Full-page skeleton matching the Maternal & Newborn layout. */
function PageSkeleton() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-80 max-w-full" />
        </CardHeader>
        <CardContent>
          <Skeleton className="mb-4 h-3 w-full max-w-2xl" />
          <ul className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <li key={i} className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-4 w-28" />
                </div>
                <Skeleton className="h-3 w-full rounded-full" />
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-3 pb-3 sm:flex-row sm:items-center sm:justify-between">
          <Skeleton className="h-5 w-28" />
          <div className="flex flex-wrap items-center gap-2">
            <Skeleton className="h-9 w-48" />
            <Skeleton className="h-9 w-32" />
            <Skeleton className="h-7 w-14 rounded-full" />
            <Skeleton className="h-7 w-24 rounded-full" />
            <Skeleton className="h-7 w-24 rounded-full" />
          </div>
        </CardHeader>
        <CardContent className="px-3 pb-4 md:px-6">
          <TableSkeleton rows={6} columns={6} />
        </CardContent>
      </Card>
    </div>
  )
}

// --- per-facility drill-down -------------------------------------------------

function FacilityDetail({ facility, climateLoading }: { facility: PortfolioFacility; climateLoading?: boolean }) {
  return (
    <div className="grid gap-3 bg-muted/40 p-3 sm:grid-cols-2 lg:grid-cols-3">
      {SERVICES.map((svc) => {
        const isClimateLoading = Boolean(climateLoading) && childServiceSource(svc.key) === "nasa"
        const headroom = childServiceHeadroom(facility, svc.key)
        const status = childServiceStatus(facility, svc.key)
        const Icon = svc.icon
        return (
          <div key={svc.key} className="rounded-lg border border-border bg-card p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Icon aria-hidden className="size-4 text-primary" />
                {svc.label}
              </span>
              {isClimateLoading ? <Skeleton className="h-6 w-16 rounded-full" /> : <StatusBadge status={status} />}
            </div>
            <div className="mt-2">
              {isClimateLoading ? (
                <Skeleton className="h-2 w-28 rounded-full" />
              ) : headroom == null ? (
                <p className="text-xs text-muted-foreground">No data for this facility.</p>
              ) : (
                <HeadroomBar headroom={headroom} />
              )}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{svc.dependsOn}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="font-mono text-[10px]">
                {svc.dimension}
              </Badge>
              <span className="text-[10px] text-muted-foreground">{SOURCE_LABEL[childServiceSource(svc.key)]}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// --- per-facility table ------------------------------------------------------

type ServiceFilter = "all" | ChildServiceKey
type StatusFilter = "any" | ChildServiceStatus
type AssessmentFilter = "all" | "assessed" | "not"
type TierFilter = "all" | ResilienceTier

const PAGE_SIZE = 10
const TIERS: ResilienceTier[] = ["Resilient", "Developing", "At risk", "Critical"]
const STATUS_FILTER_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "any", label: "Any status" },
  { value: "failing", label: "Failing" },
  { value: "at-risk", label: "At risk" },
  { value: "ok", label: "OK" },
  { value: "not-assessed", label: "Not assessed" },
]
const selectClass = "h-9 rounded-md border border-border bg-background px-2 text-sm text-foreground"

/** Risk rank: failing weighted higher, for "most at-risk first" sorting. */
function riskRank(f: PortfolioFacility): number {
  let r = 0
  for (const svc of SERVICES) {
    const s = childServiceStatus(f, svc.key)
    if (s === "failing") r += 2
    else if (s === "at-risk") r += 1
  }
  return r
}

export function AdminChildServicesRollup() {
  const { facilities, isLoading, isError, climateLoading } = useAdminPortfolio()
  const rollup = React.useMemo(() => childServiceRollup(facilities), [facilities])

  const [query, setQuery] = React.useState("")
  const [region, setRegion] = React.useState("all")
  const [category, setCategory] = React.useState("all")
  const [tier, setTier] = React.useState<TierFilter>("all")
  const [assessment, setAssessment] = React.useState<AssessmentFilter>("all")
  const [serviceSel, setServiceSel] = React.useState<ServiceFilter>("all")
  const [statusSel, setStatusSel] = React.useState<StatusFilter>("any")
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

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = facilities.filter((f) => {
      if (region !== "all" && f.region !== region) return false
      if (category !== "all" && f.category !== category) return false
      if (tier !== "all" && f.tier !== tier) return false
      if (assessment === "assessed" && !f.assessed) return false
      if (assessment === "not" && f.assessed) return false
      if (q && !f.name.toLowerCase().includes(q) && !(f.region ?? "").toLowerCase().includes(q)) return false
      if (statusSel !== "any") {
        if (serviceSel === "all") {
          if (!SERVICES.some((svc) => childServiceStatus(f, svc.key) === statusSel)) return false
        } else if (childServiceStatus(f, serviceSel) !== statusSel) {
          return false
        }
      }
      return true
    })
    return list.slice().sort((a, b) => riskRank(b) - riskRank(a) || a.name.localeCompare(b.name))
  }, [facilities, query, region, category, tier, assessment, serviceSel, statusSel])

  // Reset to page 1 whenever a filter changes.
  React.useEffect(() => {
    setPage(1)
  }, [query, region, category, tier, assessment, serviceSel, statusSel])

  const total = filtered.length
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const startIndex = (safePage - 1) * PAGE_SIZE
  const pageRows = filtered.slice(startIndex, startIndex + PAGE_SIZE)

  const hasActiveFilters =
    query !== "" ||
    region !== "all" ||
    category !== "all" ||
    tier !== "all" ||
    assessment !== "all" ||
    serviceSel !== "all" ||
    statusSel !== "any"
  const clearFilters = () => {
    setQuery("")
    setRegion("all")
    setCategory("all")
    setTier("all")
    setAssessment("all")
    setServiceSel("all")
    setStatusSel("any")
  }

  if (isLoading) {
    return <PageSkeleton />
  }
  if (isError) {
    return <p className="text-sm text-destructive">Could not load portfolio data. Please retry.</p>
  }

  return (
    <div className="space-y-4">
      {/* Portfolio summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Maternal &amp; newborn services across the portfolio</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-xs text-muted-foreground">
            Cold-chain and water pumping use real climate exposure (NASA POWER). Maternity and neonatal use the
            facility&apos;s CSF assessment score; diagnostics uses EDC. Facilities without the relevant data show as not
            assessed.
          </p>
          {climateLoading && (
            <p className="mb-2 text-xs text-muted-foreground">Loading climate exposure from NASA POWER...</p>
          )}
          <ul className="space-y-4">
            {rollup.map((row) => (
              <ServiceRollupRow key={row.key} row={row} loading={climateLoading && CLIMATE_DERIVED[row.key]} />
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Per-facility table */}
      <Card>
        <CardHeader className="space-y-3 pb-3">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base">By facility</CardTitle>
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
                placeholder="Search name or region"
                aria-label="Search facilities"
                className={cn(
                  "h-9 w-44 rounded-md border border-border bg-background pl-8 pr-3 text-sm text-foreground placeholder:text-muted-foreground",
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
            <select value={tier} onChange={(e) => setTier(e.target.value as TierFilter)} aria-label="Filter by resilience tier" className={cn(selectClass, FOCUS_RING)}>
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
            <select value={serviceSel} onChange={(e) => setServiceSel(e.target.value as ServiceFilter)} aria-label="Filter by service" className={cn(selectClass, FOCUS_RING)}>
              <option value="all">All services</option>
              {SERVICES.map((svc) => (
                <option key={svc.key} value={svc.key}>{svc.label}</option>
              ))}
            </select>
            <select value={statusSel} onChange={(e) => setStatusSel(e.target.value as StatusFilter)} aria-label="Filter by service status" className={cn(selectClass, FOCUS_RING)}>
              {STATUS_FILTER_OPTIONS.map((o) => (
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
            <table className="w-full min-w-[940px] border-collapse text-sm">
              <thead className="border-b border-border bg-muted/40 text-xs">
                <tr>
                  <th scope="col" className="px-3 py-2 text-left font-medium text-muted-foreground">Facility</th>
                  {SERVICES.map((svc) => (
                    <th key={svc.key} scope="col" className="px-3 py-2 text-left font-medium text-muted-foreground">
                      {svc.label}
                    </th>
                  ))}
                  <th scope="col" className="px-3 py-2 text-right font-medium text-muted-foreground">Details</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((f) => (
                  <tr key={f.id} className="border-b border-border/60 last:border-0 hover:bg-muted/40">
                    <td className="px-3 py-2">
                      <span className="font-medium text-foreground">{f.name}</span>
                      <span className="block text-xs font-normal text-muted-foreground">{f.region ?? "—"}</span>
                    </td>
                    {SERVICES.map((svc) => {
                      // NASA-derived services (cold-chain, water) load slower than
                      // assessments; show a shimmer instead of a misleading "Not assessed".
                      if (climateLoading && childServiceSource(svc.key) === "nasa") {
                        return (
                          <td key={svc.key} className="px-3 py-2">
                            <Skeleton className="h-6 w-20 rounded-full" />
                          </td>
                        )
                      }
                      const status = childServiceStatus(f, svc.key)
                      const headroom = childServiceHeadroom(f, svc.key)
                      return (
                        <td key={svc.key} className="px-3 py-2">
                          <div className="flex flex-col gap-1">
                            <StatusBadge status={status} compact />
                            {headroom != null && (
                              <span className="text-xs tabular-nums text-muted-foreground">{headroom}% headroom</span>
                            )}
                          </div>
                        </td>
                      )
                    })}
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
                    <td colSpan={SERVICES.length + 2} className="px-3 py-8 text-center text-sm text-muted-foreground">
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

      {/* Single-facility detail preview */}
      <Dialog open={selected !== null} onOpenChange={(open) => { if (!open) setSelected(null) }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>{selected.name}</DialogTitle>
                <DialogDescription>
                  {[selected.city, selected.region].filter(Boolean).join(", ") || "Location not set"}
                  {selected.tier ? ` · ${selected.tier}` : ""}
                  {selected.climateRcs != null ? ` (RCS ${selected.climateRcs})` : ""}
                </DialogDescription>
              </DialogHeader>
              <FacilityDetail facility={selected} climateLoading={climateLoading} />
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
