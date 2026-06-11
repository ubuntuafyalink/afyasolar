"use client"

import * as React from "react"
import Link from "next/link"
import { useQueryClient } from "@tanstack/react-query"
import { m } from "framer-motion"
import { toast } from "sonner"
import {
  Building2,
  CheckCircle2,
  AlertTriangle,
  MapPin,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Monitor,
  Eye,
  FileText,
  Search,
  RefreshCw,
  X,
  Plug,
} from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { StatCard } from "@/components/ui/stat-card"
import { AnimatedNumber } from "@/components/ui/animated-number"
import { LazyMotionProvider } from "@/components/motion/lazy-motion-provider"
import { fadeInUp, scaleIn, staggerContainer } from "@/components/motion/variants"
import { cn, formatCurrency } from "@/lib/utils"
import { FOCUS_RING } from "@/lib/dashboard/facility-ui"
import { useComprehensiveFacilities, type ComprehensiveFacility } from "@/hooks/use-facilities"
import { InviteFacilityDialog } from "@/components/dashboard/invite-facility-dialog"
import { DeleteFacilityDialog } from "@/components/dashboard/delete-facility-dialog"
import { FacilityDetailsDialog } from "@/components/dashboard/facility-details-dialog"

const PAGE_SIZE = 10
const LOW_CREDIT = 10000
type StatusFilter = "all" | "active" | "inactive" | "suspended"

export function AdminFacilities() {
  const queryClient = useQueryClient()
  const { data: facilities, isLoading } = useComprehensiveFacilities()

  const [search, setSearch] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("all")
  const [page, setPage] = React.useState(1)
  const [expanded, setExpanded] = React.useState<Set<string>>(new Set())
  const [facilityToDelete, setFacilityToDelete] = React.useState<{ id: string; name: string } | null>(null)
  const [deleteOpen, setDeleteOpen] = React.useState(false)
  const [quickView, setQuickView] = React.useState<ComprehensiveFacility | null>(null)
  const [quickViewOpen, setQuickViewOpen] = React.useState(false)

  const list = React.useMemo(() => facilities ?? [], [facilities])

  const metrics = React.useMemo(() => {
    return {
      total: list.length,
      active: list.filter((f) => f.status === "active").length,
      lowCredit: list.filter((f) => Number(f.creditBalance || 0) < LOW_CREDIT).length,
      devices: list.reduce((s, f) => s + (f.deviceCount || 0), 0),
    }
  }, [list])

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase()
    return list.filter((f) => {
      if (statusFilter !== "all" && f.status !== statusFilter) return false
      if (q && ![f.name, f.city, f.region, f.phone, f.email].some((v) => String(v || "").toLowerCase().includes(q))) return false
      return true
    })
  }, [list, search, statusFilter])

  const total = filtered.length
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const startIndex = (safePage - 1) * PAGE_SIZE
  const pageRows = filtered.slice(startIndex, startIndex + PAGE_SIZE)

  const resetPage = () => setPage(1)
  const toggleExpansion = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const openQuickView = (f: ComprehensiveFacility) => {
    setQuickView(f)
    setQuickViewOpen(true)
  }

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["comprehensive-facilities"] })
    void queryClient.invalidateQueries({ queryKey: ["facilities"] })
  }

  const hasFilters = search !== "" || statusFilter !== "all"

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><CardContent className="space-y-2 p-5"><Skeleton className="h-4 w-20" /><Skeleton className="h-7 w-16" /></CardContent></Card>
          ))}
        </div>
        <Card><CardContent className="space-y-2 p-4">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</CardContent></Card>
      </div>
    )
  }

  return (
    <LazyMotionProvider>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-2xl font-bold text-foreground">
              <Building2 className="size-6 text-primary" aria-hidden />
              Facilities
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">Manage all healthcare facilities in the portfolio.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={refresh}>
              <RefreshCw className="mr-1 h-4 w-4" /> Refresh
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/admin/service-visibility">
                <Eye className="mr-1 h-4 w-4" /> Service visibility
              </Link>
            </Button>
            <InviteFacilityDialog onSuccess={refresh} />
          </div>
        </div>

        {/* Summary */}
        <m.div variants={staggerContainer} initial="hidden" animate="show" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <m.div variants={scaleIn}><StatCard title="Total facilities" meta="All registered" icon={<Building2 />} accent="primary" value={<AnimatedNumber value={metrics.total} />} /></m.div>
          <m.div variants={scaleIn}><StatCard title="Active" meta="Operational" icon={<CheckCircle2 />} accent="success" value={<AnimatedNumber value={metrics.active} />} /></m.div>
          <m.div variants={scaleIn}><StatCard title="Low credit" meta="Below 10,000 TZS" icon={<AlertTriangle />} accent={metrics.lowCredit > 0 ? "warning" : "muted"} value={<AnimatedNumber value={metrics.lowCredit} />} /></m.div>
          <m.div variants={scaleIn}><StatCard title="Total devices" meta="Across facilities" icon={<Plug />} accent="solar" value={<AnimatedNumber value={metrics.devices} />} /></m.div>
        </m.div>

        {/* List */}
        <m.div variants={fadeInUp} initial="hidden" animate="show">
          <Card>
            <CardHeader className="space-y-3 pb-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-base">Facility directory</CardTitle>
                  <CardDescription>Search, filter and drill into any facility.</CardDescription>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">{total} {total === 1 ? "facility" : "facilities"}</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input className="w-56 pl-9" placeholder="Search name, city, region, phone…" value={search} onChange={(e) => { setSearch(e.target.value); resetPage() }} aria-label="Search facilities" />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => { setStatusFilter(e.target.value as StatusFilter); resetPage() }}
                  aria-label="Filter by status"
                  className={cn("h-9 rounded-md border border-border bg-background px-2 text-sm text-foreground", FOCUS_RING)}
                >
                  <option value="all">All status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="suspended">Suspended</option>
                </select>
                {hasFilters && (
                  <Button variant="ghost" size="sm" className="h-9" onClick={() => { setSearch(""); setStatusFilter("all"); resetPage() }}>
                    <X className="mr-1 h-3.5 w-3.5" /> Clear
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {pageRows.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                  <Building2 className="size-8 text-muted-foreground" aria-hidden />
                  <p className="text-sm text-muted-foreground">{list.length === 0 ? "No facilities yet." : "No facilities match your filters."}</p>
                </div>
              ) : (
                <m.div key={`${safePage}-${search}-${statusFilter}`} variants={staggerContainer} initial="hidden" animate="show" className="space-y-2">
                  {pageRows.map((facility) => {
                    const low = Number(facility.creditBalance || 0) < LOW_CREDIT
                    const isOpen = expanded.has(facility.id)
                    return (
                      <m.div key={facility.id} variants={scaleIn} className="rounded-lg border border-border bg-card transition-shadow hover:shadow-md">
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-muted/40 p-4">
                          <div className="flex min-w-0 flex-1 items-center gap-3">
                            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
                              <Building2 aria-hidden className="size-5" />
                            </span>
                            <div className="min-w-0 flex-1">
                              <h3 className="truncate text-base font-semibold text-foreground">{facility.name}</h3>
                              <div className="mt-1 flex flex-wrap items-center gap-2">
                                <Badge variant={facility.status === "active" ? "success" : "secondary"} className="gap-1">
                                  {facility.status === "active" && <CheckCircle2 aria-hidden className="size-3" />}
                                  {facility.status === "active" ? "Active" : facility.status}
                                </Badge>
                                {low && (
                                  <Badge variant="warning" className="gap-1">
                                    <AlertTriangle aria-hidden className="size-3" /> Low credit
                                  </Badge>
                                )}
                                <span className="flex items-center gap-1 text-sm text-muted-foreground">
                                  <MapPin aria-hidden className="size-4" />
                                  {[facility.city, facility.region].filter(Boolean).join(", ") || "—"}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" className="h-9 px-3 text-xs" onClick={() => toggleExpansion(facility.id)}>
                              {isOpen ? <><ChevronUp className="mr-1.5 size-4" /> Hide details</> : <><ChevronDown className="mr-1.5 size-4" /> Show details</>}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-9 px-3 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                              onClick={() => { setFacilityToDelete({ id: facility.id, name: facility.name }); setDeleteOpen(true) }}
                            >
                              <Trash2 className="mr-1.5 size-4" /> Delete
                            </Button>
                          </div>
                        </div>

                        {isOpen && (
                          <div className="p-4">
                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
                              <div className="rounded-md border border-border bg-card p-3">
                                <div className="text-[11px] text-muted-foreground">Credit balance</div>
                                <div className={cn("text-sm font-semibold", low ? "text-destructive" : "text-foreground")}>{formatCurrency(Number(facility.creditBalance || 0))}</div>
                              </div>
                              <div className="rounded-md border border-border bg-card p-3">
                                <div className="text-[11px] text-muted-foreground">Devices</div>
                                <div className="text-sm font-semibold text-foreground">{facility.activeDevices || 0}/{facility.deviceCount || 0} active</div>
                              </div>
                              <div className="rounded-md border border-border bg-card p-3">
                                <div className="text-[11px] text-muted-foreground">Users</div>
                                <div className="text-sm font-semibold text-foreground">{facility.userCount || 0}</div>
                              </div>
                              <div className="rounded-md border border-border bg-card p-3">
                                <div className="text-[11px] text-muted-foreground">Payments</div>
                                <div className="text-sm font-semibold text-foreground">{facility.totalPayments || 0}</div>
                              </div>
                            </div>
                            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                              <Button asChild size="sm" className="text-xs">
                                <Link href={`/dashboard/admin/facility/${facility.id}`}><Monitor className="mr-2 size-4" /> Open facility dashboard</Link>
                              </Button>
                              <Button size="sm" variant="outline" className="text-xs" onClick={() => openQuickView(facility)}>
                                <Eye className="mr-2 size-4" /> View details
                              </Button>
                              <Button asChild size="sm" variant="outline" className="text-xs">
                                <Link href={`/dashboard/admin/facilities/${facility.id}`}><FileText className="mr-2 size-4" /> Open full details page</Link>
                              </Button>
                            </div>
                          </div>
                        )}
                      </m.div>
                    )
                  })}
                </m.div>
              )}

              {totalPages > 1 && (
                <div className="flex flex-wrap items-center justify-between gap-3 pt-4">
                  <p className="text-xs text-muted-foreground">Showing {startIndex + 1}-{Math.min(startIndex + PAGE_SIZE, total)} of {total}</p>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={safePage === 1}>
                      <ChevronLeft className="mr-1 size-3.5" /> Prev
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
                      Next <ChevronRight className="ml-1 size-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </m.div>
      </div>

      {/* Dialogs */}
      {facilityToDelete && (
        <DeleteFacilityDialog
          facilityId={facilityToDelete.id}
          facilityName={facilityToDelete.name}
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          onSuccess={() => {
            setDeleteOpen(false)
            setFacilityToDelete(null)
            refresh()
            toast.success("Facility deleted successfully")
          }}
        />
      )}

      <FacilityDetailsDialog
        facility={quickView}
        open={quickViewOpen}
        onOpenChange={(open) => { setQuickViewOpen(open); if (!open) setQuickView(null) }}
      />
    </LazyMotionProvider>
  )
}
