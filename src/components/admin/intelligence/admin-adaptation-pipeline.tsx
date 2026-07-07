"use client"

import * as React from "react"
import { CheckCircle2, Circle, Clock, Wrench } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { useAdminAdaptationsRollup, type AdaptationItem } from "@/hooks/use-admin-adaptations-rollup"

type Column = "planned" | "in-progress" | "done"

const COLUMN_META: Record<
  Column,
  { label: string; icon: React.ReactNode; variant: "success" | "warning" | "secondary" }
> = {
  planned: { label: "Recommended", icon: <Circle aria-hidden className="size-4" />, variant: "secondary" },
  "in-progress": { label: "In progress", icon: <Clock aria-hidden className="size-4" />, variant: "warning" },
  done: { label: "Implemented", icon: <CheckCircle2 aria-hidden className="size-4" />, variant: "success" },
}
const COLUMNS: Column[] = ["planned", "in-progress", "done"]

/** Map free-form DB status strings onto the 3 pipeline columns. */
function normalizeStatus(status: string): Column {
  const s = status.toLowerCase()
  if (s.includes("implement") || s.includes("complete") || s.includes("done")) return "done"
  if (s.includes("progress")) return "in-progress"
  return "planned"
}

function PipelineCard({ item }: { item: AdaptationItem }) {
  return (
    <li className="rounded-md border bg-card p-3">
      <p className="text-sm font-medium text-foreground">{item.recommendation}</p>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        <p className="text-xs text-muted-foreground">
          {item.facilityName ?? "Unknown facility"}
          {item.region ? ` · ${item.region}` : ""}
        </p>
        {item.riskCategory && (
          <Badge variant="outline" className="text-[10px]">
            {item.riskCategory}
          </Badge>
        )}
        <Badge variant="outline" className="text-[10px] text-emerald-700">
          {normalizeStatus(item.status) === "done" ? "+" : "up to +"}
          {item.estimatedGainPoints} pts est.
        </Badge>
      </div>
    </li>
  )
}

function PipelineColumn({ status, items }: { status: Column; items: AdaptationItem[] }) {
  const meta = COLUMN_META[status]
  return (
    <div className="rounded-lg border bg-muted/30 p-3">
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
          {meta.icon}
          {meta.label}
        </span>
        <Badge variant={meta.variant}>{items.length}</Badge>
      </div>
      <ul className="space-y-2">
        {items.length === 0 ? (
          <li className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">No measures.</li>
        ) : (
          items.map((item) => <PipelineCard key={item.id} item={item} />)
        )}
      </ul>
    </div>
  )
}

export function AdminAdaptationPipeline() {
  const { data, isLoading, isError } = useAdminAdaptationsRollup()

  const grouped = React.useMemo(() => {
    const base: Record<Column, AdaptationItem[]> = { planned: [], "in-progress": [], done: [] }
    for (const item of data?.items ?? []) base[normalizeStatus(item.status)].push(item)
    return base
  }, [data])

  const total = (data?.items ?? []).length
  const done = grouped.done.length
  const pct = total > 0 ? Math.round((done / total) * 100) : 0

  if (isLoading) {
    return <div className="h-72 animate-pulse rounded-lg bg-muted" />
  }
  if (isError) {
    return <p className="text-sm text-destructive">Could not load adaptation measures. Please retry.</p>
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
        <CardTitle className="flex items-center gap-2">
          <Wrench aria-hidden className="size-5 text-primary" />
          Adaptation pipeline
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {total === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
            No adaptation measures recorded yet. Measures appear here as facilities log climate adaptations.
          </p>
        ) : (
          <>
            <div className="rounded-lg border p-4">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                {COLUMNS.map((status) => {
                  const meta = COLUMN_META[status]
                  return (
                    <Badge key={status} variant={meta.variant}>
                      {meta.icon}
                      {meta.label}: {grouped[status].length}
                    </Badge>
                  )
                })}
                <span className="text-xs text-muted-foreground">
                  · {data?.totalFacilitiesWithAdaptations ?? 0} facilities
                </span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Estimated resilience gain:{" "}
                <span className="font-semibold text-emerald-700">+{data?.totalRealizedGain ?? 0} pts realized</span>
                {" · "}
                <span className="font-semibold text-indigo-700">+{data?.totalPotentialGain ?? 0} pts available</span>{" "}
                (documented per-hazard estimate)
              </p>
              <div className="mt-4 space-y-1">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Measures implemented</span>
                  <span>
                    {done} / {total} ({pct}%)
                  </span>
                </div>
                <div
                  className="h-2 w-full overflow-hidden rounded-full bg-muted"
                  role="progressbar"
                  aria-valuenow={pct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="Measures implemented"
                >
                  <div className={cn("h-full rounded-full bg-success")} style={{ width: `${pct}%` }} />
                </div>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              {COLUMNS.map((status) => (
                <PipelineColumn key={status} status={status} items={grouped[status]} />
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
