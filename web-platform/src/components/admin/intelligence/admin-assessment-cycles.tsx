"use client"

import * as React from "react"
import { CheckCircle2, Circle, Clock, ClipboardList } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { StatCard } from "@/components/ui/stat-card"
import { useAdminPortfolio } from "@/hooks/use-admin-portfolio"
import { useAdminAssessmentCycles, type AssessmentCycle } from "@/hooks/use-admin-assessment-cycles"
import { FOCUS_RING } from "@/lib/dashboard/facility-ui"
import { cn } from "@/lib/utils"

type CycleStatus = "complete" | "in-progress" | "not-started"
type StatusFilter = "all" | CycleStatus

const STATUS_META: Record<
  CycleStatus,
  { label: string; icon: React.ReactNode; variant: "success" | "warning" | "secondary" }
> = {
  complete: { label: "Complete", icon: <CheckCircle2 aria-hidden className="size-3" />, variant: "success" },
  "in-progress": { label: "In progress", icon: <Clock aria-hidden className="size-3" />, variant: "warning" },
  "not-started": { label: "Not started", icon: <Circle aria-hidden className="size-3" />, variant: "secondary" },
}

const FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "complete", label: "Complete" },
  { value: "in-progress", label: "In progress" },
  { value: "not-started", label: "Not started" },
]

/** Map a real cycle status (draft|completed|archived) to a lifecycle bucket. */
function bucketOf(status: string): CycleStatus {
  const s = status.toLowerCase()
  if (s === "completed" || s === "archived") return "complete"
  return "in-progress" // draft and anything else is work in progress
}

type Row = {
  facilityId: string
  facilityName: string
  region: string | null
  status: CycleStatus
  lastUpdatedIso: string | null
}

function StatusBadge({ status }: { status: CycleStatus }) {
  const meta = STATUS_META[status]
  return (
    <Badge variant={meta.variant}>
      {meta.icon}
      {meta.label}
    </Badge>
  )
}

function FilterButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-md border px-3 py-1 text-sm font-medium transition-colors",
        FOCUS_RING,
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground",
      )}
    >
      {label}
    </button>
  )
}

export function AdminAssessmentCycles() {
  const { facilities, isLoading: facLoading, isError: facError } = useAdminPortfolio()
  const cyclesQ = useAdminAssessmentCycles()
  const [filter, setFilter] = React.useState<StatusFilter>("all")

  // Latest cycle per facility (cycles arrive newest-first by startedAt).
  const latestByFacility = React.useMemo(() => {
    const map = new Map<string, AssessmentCycle>()
    for (const c of cyclesQ.data ?? []) {
      if (!map.has(c.facilityId)) map.set(c.facilityId, c)
    }
    return map
  }, [cyclesQ.data])

  // One row per real facility: its latest cycle, or "not started".
  const rows = React.useMemo<Row[]>(() => {
    return facilities.map((f) => {
      const c = latestByFacility.get(f.id)
      if (!c) {
        return { facilityId: f.id, facilityName: f.name, region: f.region, status: "not-started", lastUpdatedIso: null }
      }
      return {
        facilityId: f.id,
        facilityName: f.name,
        region: f.region,
        status: bucketOf(c.status),
        lastUpdatedIso: c.updatedAt ?? c.startedAt ?? c.completedAt,
      }
    })
  }, [facilities, latestByFacility])

  const counts = React.useMemo(() => {
    const base: Record<CycleStatus, number> = { complete: 0, "in-progress": 0, "not-started": 0 }
    for (const r of rows) base[r.status] += 1
    return base
  }, [rows])

  const visible = React.useMemo(
    () => (filter === "all" ? rows : rows.filter((r) => r.status === filter)),
    [rows, filter],
  )

  if (facLoading || cyclesQ.isLoading) {
    return <div className="h-72 animate-pulse rounded-lg bg-muted" />
  }
  if (facError || cyclesQ.isError) {
    return <p className="text-sm text-destructive">Could not load assessment cycles. Please retry.</p>
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
        <CardTitle className="flex items-center gap-2">
          <ClipboardList aria-hidden className="size-5 text-primary" />
          Assessment cycles
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard title="Complete" value={counts.complete} icon={<CheckCircle2 aria-hidden />} accent="success" />
          <StatCard title="In progress" value={counts["in-progress"]} icon={<Clock aria-hidden />} accent="warning" />
          <StatCard title="Not started" value={counts["not-started"]} icon={<Circle aria-hidden />} accent="muted" />
        </div>

        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by status">
          {FILTERS.map((f) => (
            <FilterButton key={f.value} active={filter === f.value} label={f.label} onClick={() => setFilter(f.value)} />
          ))}
        </div>

        <ul className="divide-y rounded-lg border">
          {visible.length === 0 ? (
            <li className="p-4 text-sm text-muted-foreground">No facilities match this filter.</li>
          ) : (
            visible.map((c) => (
              <li key={c.facilityId} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">{c.facilityName}</p>
                  <p className="text-xs text-muted-foreground">{c.region ?? "—"}</p>
                </div>
                <div className="flex items-center gap-3 text-right">
                  <StatusBadge status={c.status} />
                  <span className="text-xs text-muted-foreground">
                    {c.lastUpdatedIso ? `Updated ${new Date(c.lastUpdatedIso).toLocaleDateString()}` : "—"}
                  </span>
                </div>
              </li>
            ))
          )}
        </ul>
      </CardContent>
    </Card>
  )
}
