"use client"

import type { ReactNode } from "react"
import { useMemo, useState } from "react"
import { useSession } from "next-auth/react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { StatCard } from "@/components/ui/stat-card"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { FOCUS_RING } from "@/lib/dashboard/facility-ui"
import { Bell, Info, Loader2, OctagonAlert, Radar, TriangleAlert } from "lucide-react"
import { useAdminSolarAlerts, type SolarAlert } from "@/hooks/use-admin-solar-alerts"

type Severity = "critical" | "high" | "medium" | "low"
type Status = "active" | "acknowledged" | "resolved" | "dismissed"
type SeverityFilter = "all" | Severity
type StatusFilter = "all" | Status

const SEVERITY_FILTERS: SeverityFilter[] = ["all", "critical", "high", "medium", "low"]
const STATUS_FILTERS: StatusFilter[] = ["all", "active", "acknowledged", "resolved"]

const SEVERITY_LABEL: Record<Severity, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
}
const STATUS_LABEL: Record<Status, string> = {
  active: "Active",
  acknowledged: "Acknowledged",
  resolved: "Resolved",
  dismissed: "Dismissed",
}

function severityIcon(severity: string): ReactNode {
  if (severity === "critical") return <OctagonAlert aria-hidden className="size-4 text-destructive" />
  if (severity === "high" || severity === "medium")
    return <TriangleAlert aria-hidden className="size-4 text-warning-foreground" />
  return <Info aria-hidden className="size-4 text-muted-foreground" />
}

function SeverityBadge({ severity }: { severity: string }) {
  const variant =
    severity === "critical"
      ? "destructive"
      : severity === "high" || severity === "medium"
        ? "warning"
        : "secondary"
  return (
    <Badge variant={variant}>
      {severityIcon(severity)}
      {SEVERITY_LABEL[severity as Severity] ?? severity}
    </Badge>
  )
}

function StatusBadge({ status }: { status: string }) {
  const variant =
    status === "active" ? "destructive" : status === "acknowledged" ? "warning" : "success"
  return <Badge variant={variant}>{STATUS_LABEL[status as Status] ?? status}</Badge>
}

function FilterChip({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
        FOCUS_RING,
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-background text-muted-foreground hover:bg-muted",
      )}
    >
      {label}
    </button>
  )
}

export function AdminAlertsConsole() {
  const { data: session } = useSession()
  const { query, acknowledge, resolve, generate } = useAdminSolarAlerts()
  const alerts = useMemo(() => query.data ?? [], [query.data])
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>("all")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")

  const actor = session?.user?.name || session?.user?.email || "admin"

  const activeCount = alerts.filter((i) => i.status === "active").length
  const ackCount = alerts.filter((i) => i.status === "acknowledged").length

  const visible = alerts.filter((inc) => {
    const sevOk = severityFilter === "all" || inc.severity === severityFilter
    const statusOk = statusFilter === "all" || inc.status === statusFilter
    return sevOk && statusOk
  })

  const pending = (id: string) =>
    (acknowledge.isPending && acknowledge.variables?.id === id) ||
    (resolve.isPending && resolve.variables?.id === id)

  const runScan = () => {
    generate.mutate(
      { dryRun: false },
      {
        onSuccess: (res) => {
          if (res.created > 0) {
            toast.success(`${res.created} climate alert${res.created === 1 ? "" : "s"} created`, {
              description: `Scanned ${res.scanned} facilities. ${res.skipped.duplicate} already active, ${res.skipped.noDevice} skipped (no device).`,
            })
          } else {
            toast.success("No new climate alerts", {
              description: `Scanned ${res.scanned} facilities. ${res.skipped.duplicate} already active, ${res.skipped.noDevice} skipped (no device).`,
            })
          }
        },
        onError: () => toast.error("Climate alert scan failed"),
      },
    )
  }

  if (query.isLoading) {
    return <div className="h-64 animate-pulse rounded-lg bg-muted" />
  }
  if (query.isError) {
    return <p className="text-sm text-destructive">Could not load alerts. Please retry.</p>
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2">
            <Bell aria-hidden className="size-5 text-primary" />
            Alerts &amp; Incidents Console
          </CardTitle>
          <Button variant="outline" size="sm" onClick={runScan} disabled={generate.isPending}>
            {generate.isPending ? (
              <Loader2 aria-hidden className="size-4 animate-spin" />
            ) : (
              <Radar aria-hidden className="size-4" />
            )}
            Run climate scan
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard title="Active alerts" value={activeCount} icon={<OctagonAlert />} accent="destructive" meta="Awaiting action" />
          <StatCard title="Acknowledged" value={ackCount} icon={<TriangleAlert />} accent="warning" meta="In progress" />
          <StatCard title="Total alerts" value={alerts.length} icon={<Bell />} accent="muted" meta="Across the portfolio" />
        </div>

        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Severity:</span>
            {SEVERITY_FILTERS.map((s) => (
              <FilterChip
                key={s}
                active={severityFilter === s}
                label={s === "all" ? "All" : SEVERITY_LABEL[s]}
                onClick={() => setSeverityFilter(s)}
              />
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Status:</span>
            {STATUS_FILTERS.map((s) => (
              <FilterChip
                key={s}
                active={statusFilter === s}
                label={s === "all" ? "All" : STATUS_LABEL[s]}
                onClick={() => setStatusFilter(s)}
              />
            ))}
          </div>
        </div>

        <ul className="space-y-2">
          {visible.length === 0 ? (
            <li className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
              {alerts.length === 0 ? "No alerts recorded yet." : "No alerts match the current filters."}
            </li>
          ) : (
            visible.map((inc: SolarAlert) => (
              <li key={inc.id} className="rounded-lg border border-border p-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-foreground">{inc.facilityName}</span>
                      <Badge variant="outline">{inc.type}</Badge>
                      {inc.timestamp && (
                        <span className="text-xs text-muted-foreground">
                          {new Date(inc.timestamp).toLocaleString()}
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-foreground">{inc.title}</p>
                    <p className="text-sm text-muted-foreground">{inc.message}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <SeverityBadge severity={inc.severity} />
                    <StatusBadge status={inc.status} />
                    <div className="flex gap-2">
                      {inc.status === "active" && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={pending(inc.id)}
                          onClick={() => acknowledge.mutate({ id: inc.id, acknowledgedBy: actor })}
                        >
                          Acknowledge
                        </Button>
                      )}
                      {(inc.status === "active" || inc.status === "acknowledged") && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={pending(inc.id)}
                          onClick={() => resolve.mutate({ id: inc.id, resolvedBy: actor })}
                        >
                          Resolve
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            ))
          )}
        </ul>
      </CardContent>
    </Card>
  )
}
