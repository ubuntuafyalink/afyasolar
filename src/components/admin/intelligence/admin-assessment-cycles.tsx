"use client"

import * as React from "react"
import { CheckCircle2, Circle, Clock, ClipboardList } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DemoDataBadge } from "@/components/ui/demo-data-badge"
import { StatCard } from "@/components/ui/stat-card"
import { getAssessmentCycles } from "@/lib/dashboard/admin-portfolio-data"
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

function StatusBadge({ status }: { status: CycleStatus }) {
  const meta = STATUS_META[status]
  return (
    <Badge variant={meta.variant}>
      {meta.icon}
      {meta.label}
    </Badge>
  )
}

function FilterButton({
  active,
  label,
  onClick,
}: {
  active: boolean
  label: string
  onClick: () => void
}) {
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
  const cycles = React.useMemo(() => getAssessmentCycles(), [])
  const [filter, setFilter] = React.useState<StatusFilter>("all")

  const counts = React.useMemo(() => {
    const base: Record<CycleStatus, number> = { complete: 0, "in-progress": 0, "not-started": 0 }
    for (const c of cycles) base[c.status] += 1
    return base
  }, [cycles])

  const visible = React.useMemo(
    () => (filter === "all" ? cycles : cycles.filter((c) => c.status === filter)),
    [cycles, filter],
  )

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
        <CardTitle className="flex items-center gap-2">
          <ClipboardList aria-hidden className="size-5 text-primary" />
          Assessment cycles
        </CardTitle>
        <DemoDataBadge />
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard
            title="Complete"
            value={counts.complete}
            icon={<CheckCircle2 aria-hidden />}
            accent="success"
          />
          <StatCard
            title="In progress"
            value={counts["in-progress"]}
            icon={<Clock aria-hidden />}
            accent="warning"
          />
          <StatCard
            title="Not started"
            value={counts["not-started"]}
            icon={<Circle aria-hidden />}
            accent="muted"
          />
        </div>

        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by status">
          {FILTERS.map((f) => (
            <FilterButton
              key={f.value}
              active={filter === f.value}
              label={f.label}
              onClick={() => setFilter(f.value)}
            />
          ))}
        </div>

        <ul className="divide-y rounded-lg border">
          {visible.length === 0 ? (
            <li className="p-4 text-sm text-muted-foreground">No facilities match this filter.</li>
          ) : (
            visible.map((c) => (
              <li
                key={c.facility.id}
                className="flex flex-wrap items-center justify-between gap-3 p-4"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">{c.facility.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {c.facility.region} · {c.facility.district}
                  </p>
                </div>
                <div className="flex items-center gap-3 text-right">
                  <StatusBadge status={c.status} />
                  <span className="text-xs text-muted-foreground">
                    Updated {new Date(c.lastUpdatedIso).toLocaleDateString()}
                  </span>
                </div>
              </li>
            ))
          )}
        </ul>

        <Button variant="outline" size="sm" className={cn(FOCUS_RING, "w-full sm:w-auto")}>
          Export cycle report
        </Button>
      </CardContent>
    </Card>
  )
}
