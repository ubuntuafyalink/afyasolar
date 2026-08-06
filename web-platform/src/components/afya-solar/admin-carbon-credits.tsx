"use client"

import * as React from "react"
import { useQueryClient } from "@tanstack/react-query"
import { m } from "framer-motion"
import { toast } from "sonner"
import {
  Leaf,
  DollarSign,
  Cloud,
  Clock,
  RefreshCw,
  Search,
  X,
  CheckCircle2,
  BadgeCheck,
  XCircle,
  ShieldCheck,
} from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { StatCard } from "@/components/ui/stat-card"
import { AnimatedNumber } from "@/components/ui/animated-number"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { LazyMotionProvider } from "@/components/motion/lazy-motion-provider"
import { fadeInUp, scaleIn, staggerContainer } from "@/components/motion/variants"
import { cn } from "@/lib/utils"
import { FOCUS_RING } from "@/lib/dashboard/facility-ui"
import { useAdminCarbonCredits } from "@/hooks/use-admin-carbon-credits"
import { useAdminCarbonVerification, type CarbonCredit } from "@/hooks/use-admin-carbon-verification"
import { FacilityCarbonCredits } from "@/components/dashboard/facility-carbon-credits"

type StatusFilter = "all" | "pending" | "verified" | "certified" | "rejected"
type Action = "verify" | "certify" | "reject"

const STATUS_ORDER: Record<string, number> = { pending: 0, verified: 1, certified: 2, rejected: 3 }
const STATUS_BADGE: Record<string, string> = {
  pending: "border-warning/40 bg-warning/15 text-warning-foreground",
  verified: "border-primary/40 bg-primary/10 text-primary",
  certified: "border-success/40 bg-success/15 text-success-foreground",
  rejected: "border-destructive/40 bg-destructive/10 text-destructive",
}

const usd = (n: number) => `$${Math.round(n || 0).toLocaleString()}`
const num = (n: number, d = 0) => Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d })

function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("") || "?"
  )
}

function fmtDate(d?: string): string {
  if (!d) return "—"
  const t = Date.parse(d)
  return Number.isNaN(t) ? "—" : new Date(t).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
}

export function AdminCarbonCredits() {
  const queryClient = useQueryClient()
  const totals = useAdminCarbonCredits()
  const data = totals.data

  const [search, setSearch] = React.useState("")
  const [selectedFacilityId, setSelectedFacilityId] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("all")
  const [pending, setPending] = React.useState<{ record: CarbonCredit; action: Action } | null>(null)
  const [note, setNote] = React.useState("")

  const verification = useAdminCarbonVerification({
    facilityId: selectedFacilityId || undefined,
    status: statusFilter === "all" ? undefined : statusFilter,
  })
  const { query, verify, certify, reject } = verification

  // Portfolio status counts (from the full portfolio rows).
  const statusCounts = React.useMemo(() => {
    const c = { pending: 0, verified: 0, certified: 0, rejected: 0 }
    for (const r of data?.rows ?? []) {
      const s = r.verificationStatus as keyof typeof c
      if (s in c) c[s] += 1
    }
    return c
  }, [data?.rows])

  // Facilities that have carbon credits (for the directory).
  const facilities = React.useMemo(() => {
    const map = new Map<string, { id: string; name: string; count: number }>()
    for (const r of data?.rows ?? []) {
      const cur = map.get(r.facilityId) ?? { id: r.facilityId, name: r.facilityName, count: 0 }
      cur.count += 1
      map.set(r.facilityId, cur)
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name))
  }, [data?.rows])

  const filteredFacilities = React.useMemo(() => {
    const q = search.trim().toLowerCase()
    return q ? facilities.filter((f) => f.name.toLowerCase().includes(q)) : facilities
  }, [facilities, search])

  const queue = React.useMemo(() => {
    return [...(query.data ?? [])].sort(
      (a, b) =>
        (STATUS_ORDER[a.verificationStatus] ?? 9) - (STATUS_ORDER[b.verificationStatus] ?? 9) ||
        Date.parse(b.createdAt) - Date.parse(a.createdAt),
    )
  }, [query.data])

  const refreshAll = () => {
    void queryClient.invalidateQueries({ queryKey: ["admin-carbon-credits-portfolio"] })
    void queryClient.invalidateQueries({ queryKey: ["admin-carbon-verification"] })
  }

  const activeMutation = pending?.action === "verify" ? verify : pending?.action === "certify" ? certify : reject
  const confirmAction = () => {
    if (!pending) return
    const mutation = pending.action === "verify" ? verify : pending.action === "certify" ? certify : reject
    mutation.mutate(
      { id: pending.record.id, note: note.trim() || undefined },
      {
        onSuccess: () => {
          toast.success(`Carbon credit ${pending.action === "certify" ? "certified" : pending.action === "verify" ? "verified" : "rejected"}.`)
          setPending(null)
          setNote("")
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : "Action failed"),
      },
    )
  }

  const openAction = (record: CarbonCredit, action: Action) => {
    setPending({ record, action })
    setNote("")
  }

  const metricSkeleton = <Skeleton className="h-7 w-24" />
  const selectedName = facilities.find((f) => f.id === selectedFacilityId)?.name

  return (
    <LazyMotionProvider>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-2xl font-bold text-foreground">
              <Leaf className="size-6 text-primary" aria-hidden />
              Carbon Credits
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Review and certify carbon credits generated across the portfolio, and inspect each facility&apos;s history.
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={refreshAll} disabled={totals.isFetching || query.isFetching}>
            <RefreshCw className={cn("mr-1 h-4 w-4", (totals.isFetching || query.isFetching) && "animate-spin")} />
            Refresh
          </Button>
        </div>

        {/* Portfolio summary */}
        <m.div variants={staggerContainer} initial="hidden" animate="show" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <m.div variants={scaleIn}>
            <StatCard
              title="Total credits"
              meta="Carbon credits earned"
              icon={<Leaf />}
              accent="success"
              value={totals.isLoading ? metricSkeleton : <AnimatedNumber value={data?.creditsEarnedTons ?? 0} decimals={2} suffix=" t" />}
            />
          </m.div>
          <m.div variants={scaleIn}>
            <StatCard
              title="Total value"
              meta="Estimated credit value"
              icon={<DollarSign />}
              accent="primary"
              value={totals.isLoading ? metricSkeleton : <AnimatedNumber value={data?.totalValueUsd ?? 0} prefix="$" />}
            />
          </m.div>
          <m.div variants={scaleIn}>
            <StatCard
              title="CO₂ avoided"
              meta="Across the portfolio"
              icon={<Cloud />}
              accent="solar"
              value={totals.isLoading ? metricSkeleton : <AnimatedNumber value={(data?.co2SavedKg ?? 0) / 1000} decimals={1} suffix=" t" />}
            />
          </m.div>
          <m.div variants={scaleIn}>
            <StatCard
              title="Pending review"
              meta="Awaiting verification"
              icon={<Clock />}
              accent={statusCounts.pending > 0 ? "warning" : "muted"}
              value={totals.isLoading ? metricSkeleton : <AnimatedNumber value={statusCounts.pending} />}
            />
          </m.div>
        </m.div>

        {/* Facility directory */}
        <m.div variants={fadeInUp} initial="hidden" animate="show">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Facility directory</CardTitle>
              <CardDescription>Facilities generating carbon credits. Pick one to scope the queue and view its history.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input className="pl-9" placeholder="Search facility…" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search facilities" />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>
                  <span className="font-medium text-foreground">{filteredFacilities.length}</span> of {facilities.length} facilities with credits
                </span>
                {selectedFacilityId ? (
                  <Button type="button" variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={() => setSelectedFacilityId("")}>
                    <X className="h-3.5 w-3.5" />
                    Clear selection
                  </Button>
                ) : null}
              </div>
              <div className="max-h-[260px] overflow-y-auto rounded-lg border border-border">
                {totals.isLoading ? (
                  <div className="space-y-2 p-3">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : filteredFacilities.length === 0 ? (
                  <p className="px-3 py-8 text-center text-sm text-muted-foreground">
                    {facilities.length === 0 ? "No facilities have carbon credits yet." : "No facilities match the search."}
                  </p>
                ) : (
                  <ul className="divide-y divide-border">
                    {filteredFacilities.map((f) => {
                      const active = selectedFacilityId === f.id
                      return (
                        <li key={f.id}>
                          <button
                            type="button"
                            onClick={() => setSelectedFacilityId(active ? "" : f.id)}
                            aria-pressed={active}
                            className={cn("flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors", FOCUS_RING, active ? "bg-primary/10" : "hover:bg-muted/60")}
                          >
                            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                              {initials(f.name)}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-foreground">{f.name}</p>
                              <p className="text-xs text-muted-foreground">{f.count} credit record{f.count !== 1 ? "s" : ""}</p>
                            </div>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            </CardContent>
          </Card>
        </m.div>

        {/* Verification queue */}
        <m.div variants={fadeInUp} initial="hidden" animate="show">
          <Card>
            <CardHeader className="space-y-3 pb-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="text-base">
                  Verification queue{selectedName ? <span className="font-normal text-muted-foreground"> · {selectedName}</span> : null}
                </CardTitle>
                <span className="text-xs text-muted-foreground">{queue.length} record{queue.length !== 1 ? "s" : ""}</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(["all", "pending", "verified", "certified", "rejected"] as StatusFilter[]).map((s) => (
                  <button
                    key={s}
                    type="button"
                    aria-pressed={statusFilter === s}
                    onClick={() => setStatusFilter(s)}
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-xs font-medium capitalize transition-colors",
                      FOCUS_RING,
                      statusFilter === s ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:bg-muted",
                    )}
                  >
                    {s}
                    {s !== "all" ? ` (${statusCounts[s as keyof typeof statusCounts]})` : ""}
                  </button>
                ))}
              </div>
            </CardHeader>
            <CardContent>
              {query.isLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-24 w-full" />
                  ))}
                </div>
              ) : query.isError ? (
                <p className="py-8 text-center text-sm text-destructive">Could not load carbon credits. Please retry.</p>
              ) : queue.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                  <ShieldCheck className="size-8 text-muted-foreground" aria-hidden />
                  <p className="text-sm text-muted-foreground">No carbon credits match the current filters.</p>
                </div>
              ) : (
                <ul className="space-y-3">
                  {queue.map((c) => (
                    <li key={c.id} className="rounded-lg border border-border p-3">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium text-foreground">{c.facilityName}</span>
                            <span className={cn("rounded-full border px-2 py-0.5 text-[11px] font-medium capitalize", STATUS_BADGE[c.verificationStatus] ?? "border-border text-muted-foreground")}>
                              {c.verificationStatus}
                            </span>
                          </div>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {c.deviceSerial || "—"} · {c.period} · {fmtDate(c.startDate)} – {fmtDate(c.endDate)}
                          </p>
                          {c.certificateId ? (
                            <p className="mt-1 flex items-center gap-1 text-xs text-success-foreground">
                              <BadgeCheck className="size-3.5" aria-hidden /> Certificate {c.certificateId}
                            </p>
                          ) : null}
                          {c.verificationStatus === "rejected" && c.notes ? (
                            <p className="mt-1 text-xs text-muted-foreground">Note: {c.notes}</p>
                          ) : null}
                        </div>
                        <div className="flex shrink-0 flex-wrap gap-1.5">
                          {c.verificationStatus === "pending" && (
                            <Button size="sm" className="h-8 gap-1 text-xs" onClick={() => openAction(c, "verify")}>
                              <CheckCircle2 className="size-3.5" /> Verify
                            </Button>
                          )}
                          {c.verificationStatus === "verified" && (
                            <Button size="sm" className="h-8 gap-1 text-xs" onClick={() => openAction(c, "certify")}>
                              <BadgeCheck className="size-3.5" /> Certify
                            </Button>
                          )}
                          {(c.verificationStatus === "pending" || c.verificationStatus === "verified") && (
                            <Button size="sm" variant="outline" className="h-8 gap-1 text-xs text-destructive hover:text-destructive" onClick={() => openAction(c, "reject")}>
                              <XCircle className="size-3.5" /> Reject
                            </Button>
                          )}
                        </div>
                      </div>
                      <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {[
                          { label: "Energy", value: `${num(c.energyGenerated)} kWh` },
                          { label: "CO₂ saved", value: `${num(c.co2Saved)} kg` },
                          { label: "Credits", value: `${num(c.creditsEarned, 3)} t` },
                          { label: "Value", value: usd(c.totalValue) },
                        ].map((m2) => (
                          <div key={m2.label} className="rounded-md border border-border/60 bg-muted/30 p-2">
                            <dt className="text-[11px] text-muted-foreground">{m2.label}</dt>
                            <dd className="text-sm font-semibold tabular-nums text-foreground">{m2.value}</dd>
                          </div>
                        ))}
                      </dl>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </m.div>

        {/* Selected-facility detail */}
        {selectedFacilityId ? (
          <m.div key={selectedFacilityId} variants={fadeInUp} initial="hidden" animate="show">
            <FacilityCarbonCredits facilityId={selectedFacilityId} />
          </m.div>
        ) : null}
      </div>

      {/* Action confirm dialog */}
      <Dialog open={pending !== null} onOpenChange={(open) => { if (!open) { setPending(null); setNote("") } }}>
        <DialogContent>
          {pending ? (
            <>
              <DialogHeader>
                <DialogTitle className="capitalize">{pending.action} carbon credit?</DialogTitle>
                <DialogDescription>
                  {pending.record.facilityName} · {num(pending.record.creditsEarned, 3)} t · {usd(pending.record.totalValue)}.
                  {pending.action === "certify"
                    ? " This issues a certificate id."
                    : pending.action === "reject"
                      ? " This marks the credit rejected."
                      : " This advances the credit to verified."}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-1.5">
                <label htmlFor="cc-note" className="text-sm font-medium">
                  Note {pending.action === "reject" ? "(recommended)" : "(optional)"}
                </label>
                <Textarea id="cc-note" value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="Add context for the audit trail…" />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => { setPending(null); setNote("") }} disabled={activeMutation.isPending}>
                  Cancel
                </Button>
                <Button
                  variant={pending.action === "reject" ? "destructive" : "default"}
                  onClick={confirmAction}
                  disabled={activeMutation.isPending}
                  className="capitalize"
                >
                  {activeMutation.isPending ? <RefreshCw className="mr-1 size-4 animate-spin" /> : null}
                  {pending.action}
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </LazyMotionProvider>
  )
}
