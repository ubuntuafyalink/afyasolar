"use client"

import * as React from "react"
import { toast } from "sonner"
import { FileText, FileSpreadsheet, FileType2, Table2, Loader2, Search, Eye } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton, TableSkeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { FOCUS_RING } from "@/lib/dashboard/facility-ui"
import { getErrorMessage } from "@/lib/get-error-message"
import { useAdminPortfolio } from "@/hooks/use-admin-portfolio"
import { useAdminPortfolioClimate } from "@/hooks/use-admin-portfolio-climate"
import type { PortfolioFacility } from "@/lib/dashboard/admin-portfolio-types"
import {
  REPORT_TYPES,
  slugify,
  type ReportDocument,
  type ReportScope,
  type ReportTypeId,
} from "@/lib/reports/report-model"
import { buildReport, buildFullReport } from "@/lib/reports/report-builders"
import { reportToPdf } from "@/lib/reports/render-pdf"
import { reportToXlsx } from "@/lib/reports/render-xlsx"
import { reportToCsv } from "@/lib/reports/render-csv"
import { reportToDoc } from "@/lib/reports/render-doc"

type ScopeKind = "portfolio" | "region" | "facility"
type Format = "pdf" | "excel" | "csv" | "word"

const UNGROUPED = "Unspecified"
const selectClass = "h-9 rounded-md border border-border bg-background px-2 text-sm text-foreground"

const FORMATS: { id: Format; label: string; icon: React.ReactNode }[] = [
  { id: "pdf", label: "PDF", icon: <FileText className="size-4" /> },
  { id: "excel", label: "Excel", icon: <FileSpreadsheet className="size-4" /> },
  { id: "csv", label: "CSV", icon: <Table2 className="size-4" /> },
  { id: "word", label: "Word", icon: <FileType2 className="size-4" /> },
]

async function runDownload(format: Format, doc: ReportDocument, baseName: string): Promise<void> {
  if (format === "pdf") return reportToPdf(doc, `${baseName}.pdf`)
  if (format === "excel") return reportToXlsx(doc, `${baseName}.xlsx`)
  if (format === "csv") return reportToCsv(doc, `${baseName}.csv`)
  return reportToDoc(doc, `${baseName}.doc`)
}

// --- live preview ------------------------------------------------------------

function PreviewBar({ value, max = 100 }: { value: number; max?: number }) {
  const pct = Math.max(0, Math.min(100, max > 0 ? (value / max) * 100 : 0))
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
      <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
    </div>
  )
}

function ReportPreview({ doc }: { doc: ReportDocument }) {
  return (
    <div className="space-y-5 rounded-lg border border-border bg-card p-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">AfyaSolar Intelligence</p>
        <h3 className="text-lg font-bold text-foreground">{doc.title}</h3>
        <p className="text-sm text-muted-foreground">{doc.subtitle}</p>
        <dl className="mt-2 grid gap-x-4 gap-y-1 text-xs sm:grid-cols-2">
          {doc.meta.map((m) => (
            <div key={m.label} className="flex gap-1">
              <dt className="text-muted-foreground">{m.label}:</dt>
              <dd className="font-medium text-foreground">{m.value}</dd>
            </div>
          ))}
        </dl>
      </div>

      {doc.sections.map((section, i) => (
        <div key={i} className="space-y-2">
          <h4 className="border-b border-border pb-1 text-sm font-semibold text-foreground">{section.heading}</h4>

          {section.kind === "stats" && (
            <dl className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {section.items.map((it) => (
                <div key={it.label} className="rounded-md border border-border p-2">
                  <dt className="text-xs text-muted-foreground">{it.label}</dt>
                  <dd className="text-sm font-semibold text-foreground">{it.value}</dd>
                </div>
              ))}
            </dl>
          )}

          {section.kind === "bars" && (
            <div className="space-y-2">
              {section.items.map((it) => (
                <div key={it.label} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-foreground">{it.label}</span>
                    <span className="text-muted-foreground">
                      {Math.round(it.value)}
                      {it.suffix ?? ""}
                    </span>
                  </div>
                  <PreviewBar value={it.value} max={it.max} />
                </div>
              ))}
            </div>
          )}

          {section.kind === "table" && (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-xs">
                <thead className="border-b border-border bg-muted/40">
                  <tr>
                    {section.columns.map((c) => (
                      <th key={c} className="px-2 py-1.5 text-left font-medium text-muted-foreground">
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {section.rows.slice(0, 12).map((row, ri) => (
                    <tr key={ri} className="border-b border-border/60 last:border-0">
                      {row.map((cell, ci) => (
                        <td key={ci} className="px-2 py-1.5 tabular-nums text-foreground">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {section.rows.length > 12 && (
                <p className="px-2 pt-1 text-xs text-muted-foreground">
                  + {section.rows.length - 12} more rows in the downloaded file
                </p>
              )}
            </div>
          )}

          {section.note && <p className="text-xs italic text-muted-foreground">{section.note}</p>}
        </div>
      ))}

      <p className="border-t border-border pt-2 text-[11px] text-muted-foreground">{doc.disclaimer}</p>
    </div>
  )
}

// --- skeleton ----------------------------------------------------------------

function PageSkeleton() {
  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-3 p-5">
          <Skeleton className="h-5 w-40" />
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-36" />
            ))}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <TableSkeleton rows={8} columns={5} />
        </CardContent>
      </Card>
    </div>
  )
}

// --- main --------------------------------------------------------------------

export function AdminReportCenter() {
  const { facilities, isLoading, isError, climateLoading } = useAdminPortfolio()
  const climateQ = useAdminPortfolioClimate()
  const aggregate = climateQ.data?.aggregate ?? null

  const [reportType, setReportType] = React.useState<ReportTypeId>("full")
  const [scopeKind, setScopeKind] = React.useState<ScopeKind>("portfolio")
  const [region, setRegion] = React.useState("")
  const [facilityId, setFacilityId] = React.useState("")
  const [busy, setBusy] = React.useState<Format | null>(null)

  // Quick-list filters.
  const [query, setQuery] = React.useState("")
  const [listRegion, setListRegion] = React.useState("all")
  const [quickBusy, setQuickBusy] = React.useState<string | null>(null)

  const regions = React.useMemo(() => {
    const set = new Set<string>()
    for (const f of facilities) set.add(f.region || UNGROUPED)
    return [...set].sort()
  }, [facilities])

  const sortedFacilities = React.useMemo(
    () => [...facilities].sort((a, b) => a.name.localeCompare(b.name)),
    [facilities],
  )

  // Keep region/facility selections valid.
  React.useEffect(() => {
    if (scopeKind === "region" && !region && regions.length) setRegion(regions[0])
    if (scopeKind === "facility" && !facilityId && sortedFacilities.length) setFacilityId(sortedFacilities[0].id)
  }, [scopeKind, region, facilityId, regions, sortedFacilities])

  const scope: ReportScope = React.useMemo(() => {
    if (scopeKind === "region" && region) return { kind: "region", region }
    if (scopeKind === "facility" && facilityId) return { kind: "facility", facilityId }
    return { kind: "portfolio" }
  }, [scopeKind, region, facilityId])

  const doc = React.useMemo(
    () => buildReport(reportType, { facilities, aggregate, scope }),
    [reportType, facilities, aggregate, scope],
  )

  const scopeName =
    scope.kind === "portfolio"
      ? "portfolio"
      : scope.kind === "region"
        ? scope.region
        : (facilities.find((f) => f.id === scope.facilityId)?.name ?? "facility")
  const baseName = `afyasolar-${reportType}-${slugify(scopeName)}`

  const climateGated = (reportType === "climate" || reportType === "full") && climateLoading

  async function handleDownload(format: Format) {
    if (busy) return
    setBusy(format)
    try {
      await runDownload(format, doc, baseName)
      toast.success("Downloaded")
    } catch (error) {
      toast.error(getErrorMessage(error, "Download failed"))
    } finally {
      setBusy(null)
    }
  }

  async function handleQuickPdf(f: PortfolioFacility) {
    if (quickBusy) return
    setQuickBusy(f.id)
    try {
      const fullDoc = buildFullReport({ facilities, aggregate, scope: { kind: "facility", facilityId: f.id } })
      await reportToPdf(fullDoc, `afyasolar-full-${slugify(f.name)}.pdf`)
      toast.success("Downloaded")
    } catch (error) {
      toast.error(getErrorMessage(error, "Download failed"))
    } finally {
      setQuickBusy(null)
    }
  }

  const quickList = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    return sortedFacilities.filter((f) => {
      if (listRegion !== "all" && (f.region || UNGROUPED) !== listRegion) return false
      if (q && !f.name.toLowerCase().includes(q) && !(f.region ?? "").toLowerCase().includes(q)) return false
      return true
    })
  }, [sortedFacilities, query, listRegion])

  if (isLoading) return <PageSkeleton />
  if (isError) return <p className="text-sm text-destructive">Could not load portfolio data. Please retry.</p>

  return (
    <div className="space-y-4">
      {/* Report builder */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Report center</CardTitle>
          <p className="text-sm text-muted-foreground">
            Generate formatted climate, resilience and energy reports from real NASA &amp; assessment data — for the
            whole portfolio, a region, or a single facility.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Report type */}
          <div className="space-y-1.5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Report type</p>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {REPORT_TYPES.map((rt) => (
                <button
                  key={rt.id}
                  type="button"
                  aria-pressed={reportType === rt.id}
                  onClick={() => setReportType(rt.id)}
                  className={cn(
                    "rounded-lg border p-3 text-left text-sm font-medium transition-colors",
                    FOCUS_RING,
                    reportType === rt.id
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border text-muted-foreground hover:bg-muted",
                  )}
                >
                  {rt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Scope */}
          <div className="space-y-1.5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Scope</p>
            <div className="flex flex-wrap items-center gap-2">
              {(["portfolio", "region", "facility"] as ScopeKind[]).map((sk) => (
                <button
                  key={sk}
                  type="button"
                  aria-pressed={scopeKind === sk}
                  onClick={() => setScopeKind(sk)}
                  className={cn(
                    "rounded-md border px-3 py-1.5 text-sm font-medium capitalize transition-colors",
                    FOCUS_RING,
                    scopeKind === sk
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-muted-foreground hover:bg-muted",
                  )}
                >
                  {sk === "portfolio" ? "Whole portfolio" : sk === "region" ? "By region" : "Single facility"}
                </button>
              ))}

              {scopeKind === "region" && (
                <select value={region} onChange={(e) => setRegion(e.target.value)} aria-label="Region" className={cn(selectClass, FOCUS_RING)}>
                  {regions.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              )}
              {scopeKind === "facility" && (
                <select value={facilityId} onChange={(e) => setFacilityId(e.target.value)} aria-label="Facility" className={cn(selectClass, FOCUS_RING, "min-w-52")}>
                  {sortedFacilities.map((f) => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Format / download */}
          <div className="space-y-1.5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Download as</p>
            <div className="flex flex-wrap items-center gap-2">
              {FORMATS.map((fmt) => (
                <Button
                  key={fmt.id}
                  variant="outline"
                  onClick={() => handleDownload(fmt.id)}
                  disabled={busy !== null}
                  className="gap-2"
                >
                  {busy === fmt.id ? <Loader2 aria-hidden className="size-4 animate-spin" /> : fmt.icon}
                  {fmt.label}
                </Button>
              ))}
            </div>
            {climateGated && (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Loader2 aria-hidden className="size-3.5 animate-spin" />
                NASA climate data is still loading — climate sections will fill in shortly.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Live preview */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Eye aria-hidden className="size-4" />
          Report preview
        </div>
        <ReportPreview doc={doc} />
      </div>

      {/* Per-facility quick reports */}
      <Card>
        <CardHeader className="space-y-3 pb-3">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base">Quick facility reports</CardTitle>
            <span className="text-xs text-muted-foreground">
              {quickList.length} {quickList.length === 1 ? "facility" : "facilities"}
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
            <select value={listRegion} onChange={(e) => setListRegion(e.target.value)} aria-label="Filter by region" className={cn(selectClass, FOCUS_RING)}>
              <option value="all">All regions</option>
              {regions.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
        </CardHeader>
        <CardContent className="px-0 pb-4">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] border-collapse text-sm">
              <thead className="border-b border-border bg-muted/40 text-xs">
                <tr>
                  <th scope="col" className="px-3 py-2 text-left font-medium text-muted-foreground">Facility</th>
                  <th scope="col" className="px-3 py-2 text-left font-medium text-muted-foreground">Region</th>
                  <th scope="col" className="px-3 py-2 text-right font-medium text-muted-foreground">RCS</th>
                  <th scope="col" className="px-3 py-2 text-right font-medium text-muted-foreground">Efficiency</th>
                  <th scope="col" className="px-3 py-2 text-right font-medium text-muted-foreground">Full report</th>
                </tr>
              </thead>
              <tbody>
                {quickList.slice(0, 50).map((f) => (
                  <tr key={f.id} className="border-b border-border/60 last:border-0 hover:bg-muted/40">
                    <td className="px-3 py-2 font-medium text-foreground">{f.name}</td>
                    <td className="px-3 py-2 text-muted-foreground">{f.region ?? "—"}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-foreground">
                      {f.climateRcs != null ? Math.round(f.climateRcs) : "—"}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-foreground">
                      {f.energyBmiPercent != null ? `${Math.round(f.energyBmiPercent)}%` : "—"}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={() => handleQuickPdf(f)} disabled={quickBusy !== null}>
                        {quickBusy === f.id ? <Loader2 aria-hidden className="size-3.5 animate-spin" /> : <FileText aria-hidden className="size-3.5" />}
                        PDF
                      </Button>
                    </td>
                  </tr>
                ))}
                {quickList.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-3 py-8 text-center text-sm text-muted-foreground">
                      No facilities match the current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {quickList.length > 50 && (
            <p className="px-3 pt-3 text-xs text-muted-foreground">
              Showing first 50. Refine the search to find a specific facility, or use the scope selector above.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
