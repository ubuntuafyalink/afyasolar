"use client"

import * as React from "react"
import dynamic from "next/dynamic"
import {
  Gauge,
  Sun,
  DollarSign,
  ClipboardCheck,
  Search,
  ChevronLeft,
  ChevronRight,
  Eye,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { StatCard } from "@/components/ui/stat-card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Skeleton, TableSkeleton } from "@/components/ui/skeleton"
import { cn, formatCurrency } from "@/lib/utils"
import { FOCUS_RING } from "@/lib/dashboard/facility-ui"
import { useAdminPortfolio } from "@/hooks/use-admin-portfolio"
import { useFacilityAssessmentReports } from "@/hooks/use-facility-assessment-reports"
import { SwitchableChart, type ChartDatum } from "@/components/admin/intelligence/switchable-chart"
import { buildIntelligenceRecommendations } from "@/lib/intelligence/recommendations"
import type { PortfolioFacility } from "@/lib/dashboard/admin-portfolio-types"
import type { SizingSummary, MeuSummary } from "@/components/solar/afya-solar-sizing-tool"

// Lazy-load the heavy read-only report components only when a drill-down opens.
const IntelligenceChartGrid = dynamic(
  () => import("@/components/intelligence/energy-charts").then((m) => m.IntelligenceChartGrid),
  { ssr: false, loading: () => <div className="h-72 animate-pulse rounded-lg bg-muted" /> },
)
const FacilityMeterEfficiencyDashboard = dynamic(
  () =>
    import("@/components/efficiency/facility-meter-efficiency-dashboard").then(
      (m) => m.FacilityMeterEfficiencyDashboard,
    ),
  { ssr: false, loading: () => <div className="h-72 animate-pulse rounded-lg bg-muted" /> },
)

type AssessmentFilter = "all" | "assessed" | "not"
const PAGE_SIZE = 10
const selectClass = "h-9 rounded-md border border-border bg-background px-2 text-sm text-foreground"
const UNGROUPED = "Unspecified"

const RED = "#ef4444"
const AMBER = "#f59e0b"
const BLUE = "#3b82f6"
const EMERALD = "#10b981"
const SLATE = "#94a3b8"

const num = (v: number | null | undefined, suffix: string): string =>
  v != null ? `${Number.isInteger(v) ? v : v.toFixed(1)}${suffix}` : "—"

/** Efficiency band label + color for a 0..100 BMI percent. */
function effBand(pct: number): { label: string; color: string } {
  if (pct >= 80) return { label: "Strong", color: EMERALD }
  if (pct >= 60) return { label: "Good", color: BLUE }
  if (pct >= 40) return { label: "Fair", color: AMBER }
  return { label: "Weak", color: RED }
}

// --- per-facility drill-down (embeds the real read-only energy report) --------

function EfficiencyDrillDown({ facility }: { facility: PortfolioFacility }) {
  const { data, isLoading } = useFacilityAssessmentReports(facility.id)

  const recommendations = React.useMemo(() => {
    if (!data) return undefined
    const bmi =
      data.assessmentScore != null
        ? { score: data.assessmentScore, bmiPercent: Math.round((data.assessmentScore / 40) * 100) }
        : null
    return buildIntelligenceRecommendations(
      data.sizingSummary as SizingSummary | null,
      data.meuSummary as MeuSummary | null,
      bmi,
      data.sectionScores,
    )
  }, [data])

  const hasReport = Boolean(data?.sizingSummary || data?.meuSummary)
  const effPct = facility.energyBmiPercent

  return (
    <>
      <DialogHeader>
        <div className="flex flex-wrap items-center gap-2">
          <DialogTitle>{facility.name}</DialogTitle>
          {effPct != null && (
            <Badge variant="outline" style={{ borderColor: effBand(effPct).color, color: effBand(effPct).color }}>
              {effPct}% efficiency · {effBand(effPct).label}
            </Badge>
          )}
        </div>
        <DialogDescription>
          {[facility.city, facility.region].filter(Boolean).join(", ") || "Location not set"} &middot; energy
          efficiency report
        </DialogDescription>
      </DialogHeader>

      {isLoading ? (
        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="h-64 animate-pulse rounded-lg bg-muted" />
            <div className="h-64 animate-pulse rounded-lg bg-muted" />
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {hasReport ? (
            <IntelligenceChartGrid
              meu={data?.meuSummary ?? null}
              sizing={data?.sizingSummary ?? null}
              facilityExtras={data?.facilityExtras ?? undefined}
              resilienceScore={data?.resilienceScore ?? null}
              recommendations={recommendations}
              bmiTrend={data?.bmiTrend ?? undefined}
              variant="full"
            />
          ) : (
            <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              No saved energy assessment for this facility yet.
            </p>
          )}

          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground">Meter efficiency monitoring</h3>
            <p className="text-xs text-muted-foreground">
              Produced vs expected generation, performance ratio and alerts from the facility meter.
            </p>
            <FacilityMeterEfficiencyDashboard facilityId={facility.id} preferMock={false} />
          </div>
        </div>
      )}
    </>
  )
}

// --- analytics graphs --------------------------------------------------------

const MONTH_FMT = new Intl.DateTimeFormat("en", { month: "short", year: "numeric" })

function AnalyticsGraphs({ facilities }: { facilities: PortfolioFacility[] }) {
  // Efficiency-band distribution → ChartDatum[].
  const distribution = React.useMemo<ChartDatum[]>(() => {
    const bands = [
      { label: "0–40", color: RED, value: 0 },
      { label: "40–60", color: AMBER, value: 0 },
      { label: "60–80", color: BLUE, value: 0 },
      { label: "80–100", color: EMERALD, value: 0 },
    ]
    for (const f of facilities) {
      const p = f.energyBmiPercent
      if (p == null) continue
      if (p >= 80) bands[3].value += 1
      else if (p >= 60) bands[2].value += 1
      else if (p >= 40) bands[1].value += 1
      else bands[0].value += 1
    }
    return bands
  }, [facilities])

  const byRegionEff = React.useMemo<ChartDatum[]>(() => {
    const map = new Map<string, number[]>()
    for (const f of facilities) {
      if (f.energyBmiPercent == null) continue
      const k = f.region || UNGROUPED
      const list = map.get(k) ?? []
      list.push(f.energyBmiPercent)
      map.set(k, list)
    }
    return [...map.entries()]
      .map(([region, vals]) => {
        const avg = Math.round(vals.reduce((s, v) => s + v, 0) / vals.length)
        return { label: region, value: avg, color: effBand(avg).color }
      })
      .sort((a, b) => a.value - b.value)
  }, [facilities])

  const byRegionSavings = React.useMemo<ChartDatum[]>(() => {
    const map = new Map<string, number>()
    for (const f of facilities) {
      const s = f.energy?.annualSavings
      if (s == null) continue
      const k = f.region || UNGROUPED
      map.set(k, (map.get(k) ?? 0) + s)
    }
    return [...map.entries()]
      .map(([region, savings]) => ({ label: region, value: Math.round(savings), color: EMERALD }))
      .sort((a, b) => b.value - a.value)
  }, [facilities])

  const coverage = React.useMemo<ChartDatum[]>(() => {
    let assessed = 0
    for (const f of facilities) if (f.hasEnergySnapshot) assessed += 1
    return [
      { label: "Energy assessed", value: assessed, color: EMERALD },
      { label: "Not assessed", value: facilities.length - assessed, color: SLATE },
    ]
  }, [facilities])

  // Cumulative facilities assessed over time, bucketed by assessment month.
  const overTime = React.useMemo<ChartDatum[]>(() => {
    const counts = new Map<number, number>() // first-of-month timestamp → new assessments
    for (const f of facilities) {
      const raw = f.energyAssessmentDate
      if (!raw) continue
      const d = new Date(raw)
      if (Number.isNaN(d.getTime())) continue
      const key = new Date(d.getFullYear(), d.getMonth(), 1).getTime()
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
    const sorted = [...counts.entries()].sort((a, b) => a[0] - b[0])
    const out: ChartDatum[] = []
    for (const [ts, n] of sorted) {
      const running = (out[out.length - 1]?.value ?? 0) + n
      out.push({ label: MONTH_FMT.format(new Date(ts)), value: running, color: EMERALD })
    }
    return out
  }, [facilities])

  const assessedCount = coverage[0]?.value ?? 0
  const avgEff = React.useMemo(() => {
    const vals = facilities.map((f) => f.energyBmiPercent).filter((v): v is number => v != null)
    return vals.length ? Math.round(vals.reduce((s, v) => s + v, 0) / vals.length) : null
  }, [facilities])
  const totalSavings = byRegionSavings.reduce((s, d) => s + d.value, 0)

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Efficiency distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <SwitchableChart
            data={distribution}
            kinds={["bar", "pie", "line", "number"]}
            defaultKind="line"
            valueLabel="Facilities"
            caption="Facilities by efficiency score (BMI %)"
            summary={{ value: String(assessedCount), label: "assessed" }}
            emptyHint="No energy-assessment data yet."
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Average efficiency by region</CardTitle>
        </CardHeader>
        <CardContent>
          <SwitchableChart
            data={byRegionEff}
            kinds={["bar", "pie", "line", "number"]}
            defaultKind="number"
            layout="vertical"
            valueLabel="Avg efficiency"
            valueSuffix="%"
            caption="Mean BMI % across assessed facilities"
            summary={{ value: avgEff != null ? `${avgEff}%` : "—", label: "portfolio average" }}
            emptyHint="No energy-assessment data yet."
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Modelled annual savings by region</CardTitle>
        </CardHeader>
        <CardContent>
          <SwitchableChart
            data={byRegionSavings}
            kinds={["bar", "pie", "line", "number"]}
            layout="vertical"
            valueLabel="Annual savings"
            format={formatCurrency}
            caption="Sum of modelled annual savings (TZS)"
            summary={{ value: formatCurrency(totalSavings), label: "total / year" }}
            emptyHint="No energy-assessment data yet."
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Assessment coverage</CardTitle>
        </CardHeader>
        <CardContent>
          <SwitchableChart
            data={coverage}
            kinds={["pie", "bar", "number"]}
            valueLabel="Facilities"
            caption="Energy-assessed vs not yet assessed"
            summary={{ value: `${assessedCount}/${facilities.length}`, label: "assessed" }}
            emptyHint="No facilities yet."
          />
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Assessment activity over time</CardTitle>
        </CardHeader>
        <CardContent>
          <SwitchableChart
            data={overTime}
            kinds={["line", "area", "bar", "number"]}
            valueLabel="Cumulative assessed"
            caption="Cumulative facilities energy-assessed, by month"
            summary={{ value: String(assessedCount), label: `assessed · ${overTime.length} months` }}
            emptyHint="No dated assessments yet."
          />
        </CardContent>
      </Card>
    </div>
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
      <div className="grid gap-3 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-5">
              <Skeleton className="h-56 w-full" />
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

export function AdminEnergyEfficiency({
  focusFacilityId,
  onFocusHandled,
}: {
  focusFacilityId?: string | null
  onFocusHandled?: () => void
} = {}) {
  const { facilities, isLoading, isError } = useAdminPortfolio()

  const [query, setQuery] = React.useState("")
  const [region, setRegion] = React.useState("all")
  const [category, setCategory] = React.useState("all")
  const [assessment, setAssessment] = React.useState<AssessmentFilter>("all")
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

  // Portfolio totals.
  const totals = React.useMemo(() => {
    const effVals = facilities.map((f) => f.energyBmiPercent).filter((v): v is number => v != null)
    const sized = facilities.filter((f) => f.energy)
    const sum = (pick: (f: PortfolioFacility) => number | null | undefined) =>
      sized.reduce((s, f) => s + (pick(f) ?? 0), 0)
    return {
      assessed: facilities.filter((f) => f.hasEnergySnapshot).length,
      avgEff: effVals.length ? Math.round(effVals.reduce((s, v) => s + v, 0) / effVals.length) : null,
      solarKw: sum((f) => f.energy?.solarArraySize),
      savings: sum((f) => f.energy?.annualSavings),
    }
  }, [facilities])

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = facilities.filter((f) => {
      if (region !== "all" && f.region !== region) return false
      if (category !== "all" && f.category !== category) return false
      if (assessment === "assessed" && !f.hasEnergySnapshot) return false
      if (assessment === "not" && f.hasEnergySnapshot) return false
      if (q && !f.name.toLowerCase().includes(q) && !(f.region ?? "").toLowerCase().includes(q)) return false
      return true
    })
    return list.sort(
      (a, b) => (b.energyBmiPercent ?? -1) - (a.energyBmiPercent ?? -1) || a.name.localeCompare(b.name),
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
      {/* Portfolio efficiency summary */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Energy assessed"
          value={`${totals.assessed}/${facilities.length}`}
          icon={<ClipboardCheck />}
          accent="primary"
          meta="Facilities with an energy assessment"
        />
        <StatCard
          title="Avg efficiency"
          value={totals.avgEff != null ? `${totals.avgEff}%` : "—"}
          icon={<Gauge />}
          accent={totals.avgEff != null && totals.avgEff < 60 ? "warning" : "success"}
          meta="Mean BMI across assessed facilities"
        />
        <StatCard
          title="Total solar capacity"
          value={`${totals.solarKw.toFixed(1)} kW`}
          icon={<Sun />}
          accent="solar"
          meta="Sum of assessed array sizes"
        />
        <StatCard
          title="Modelled annual savings"
          value={formatCurrency(totals.savings)}
          icon={<DollarSign />}
          accent="success"
          meta="Sum across assessed facilities"
        />
      </div>

      {/* Portfolio analytics graphs */}
      <AnalyticsGraphs facilities={facilities} />

      {/* Per-facility efficiency table */}
      <Card>
        <CardHeader className="space-y-3 pb-3">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base">Facilities by efficiency</CardTitle>
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
                  <th scope="col" className="px-3 py-2 text-right font-medium text-muted-foreground">Efficiency</th>
                  <th scope="col" className="px-3 py-2 text-right font-medium text-muted-foreground">Solar</th>
                  <th scope="col" className="px-3 py-2 text-right font-medium text-muted-foreground">Daily load</th>
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
                    {f.hasEnergySnapshot ? (
                      <>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {f.energyBmiPercent != null ? (
                            <span className="inline-flex items-center gap-1.5 font-medium">
                              <span className="size-2 rounded-full" style={{ backgroundColor: effBand(f.energyBmiPercent).color }} />
                              {f.energyBmiPercent}%
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-foreground">{num(f.energy?.solarArraySize, " kW")}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-foreground">{num(f.energy?.dailyLoad, " kWh")}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-foreground">
                          {f.energy?.annualSavings != null ? formatCurrency(f.energy.annualSavings) : "—"}
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

      {/* Per-facility full energy report */}
      <Dialog open={selected !== null} onOpenChange={(open) => { if (!open) setSelected(null) }}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          {selected && <EfficiencyDrillDown facility={selected} />}
        </DialogContent>
      </Dialog>
    </div>
  )
}
