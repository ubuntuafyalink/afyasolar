"use client"

import type { ReactNode } from "react"
import { useMemo, useState } from "react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { StatCard } from "@/components/ui/stat-card"
import { DemoDataBadge } from "@/components/ui/demo-data-badge"
import { cn } from "@/lib/utils"
import { FOCUS_RING } from "@/lib/dashboard/facility-ui"
import { Bell, Info, OctagonAlert, TriangleAlert } from "lucide-react"
import {
  getPortfolioAlerts,
  type IncidentStatus,
  type PortfolioIncident,
} from "@/lib/dashboard/admin-portfolio-data"

type Severity = PortfolioIncident["severity"]
type SeverityFilter = "all" | Severity
type StatusFilter = "all" | IncidentStatus

const SEVERITY_FILTERS: SeverityFilter[] = ["all", "danger", "warning", "info"]
const STATUS_FILTERS: StatusFilter[] = ["all", "open", "ack", "resolved"]

const SEVERITY_LABEL: Record<Severity, string> = {
  danger: "Critical",
  warning: "Warning",
  info: "Info",
}
const STATUS_LABEL: Record<IncidentStatus, string> = {
  open: "Open",
  ack: "Acknowledged",
  resolved: "Resolved",
}
const NEXT_STATUS: Record<IncidentStatus, IncidentStatus> = {
  open: "ack",
  ack: "resolved",
  resolved: "open",
}

function severityIcon(severity: Severity): ReactNode {
  if (severity === "danger") return <OctagonAlert aria-hidden className="size-4 text-destructive" />
  if (severity === "warning") return <TriangleAlert aria-hidden className="size-4 text-warning-foreground" />
  return <Info aria-hidden className="size-4 text-muted-foreground" />
}

function SeverityBadge({ severity }: { severity: Severity }) {
  const variant = severity === "danger" ? "destructive" : severity === "warning" ? "warning" : "secondary"
  return (
    <Badge variant={variant}>
      {severityIcon(severity)}
      {SEVERITY_LABEL[severity]}
    </Badge>
  )
}

function StatusBadge({ status }: { status: IncidentStatus }) {
  const variant = status === "open" ? "destructive" : status === "ack" ? "warning" : "success"
  return <Badge variant={variant}>{STATUS_LABEL[status]}</Badge>
}

function FilterChip({
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
  const incidents = useMemo(() => getPortfolioAlerts(), [])
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>("all")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  // In-memory status overrides keyed by incident id (no backend).
  const [overrides, setOverrides] = useState<Record<string, IncidentStatus>>({})

  const statusOf = (inc: PortfolioIncident): IncidentStatus => overrides[inc.id] ?? inc.status

  const openCount = incidents.filter((i) => statusOf(i) === "open").length
  const ackCount = incidents.filter((i) => statusOf(i) === "ack").length

  const visible = incidents.filter((inc) => {
    const sevOk = severityFilter === "all" || inc.severity === severityFilter
    const statusOk = statusFilter === "all" || statusOf(inc) === statusFilter
    return sevOk && statusOk
  })

  const cycleStatus = (inc: PortfolioIncident) => {
    setOverrides((prev) => ({ ...prev, [inc.id]: NEXT_STATUS[statusOf(inc)] }))
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2">
            <Bell aria-hidden className="size-5 text-primary" />
            Alerts &amp; Incidents Console
          </CardTitle>
          <DemoDataBadge />
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard
            title="Open incidents"
            value={openCount}
            icon={<OctagonAlert />}
            accent="destructive"
            meta="Awaiting action"
          />
          <StatCard
            title="Acknowledged"
            value={ackCount}
            icon={<TriangleAlert />}
            accent="warning"
            meta="In progress"
          />
          <StatCard
            title="Total incidents"
            value={incidents.length}
            icon={<Bell />}
            accent="muted"
            meta="Across the portfolio"
          />
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
              No incidents match the current filters.
            </li>
          ) : (
            visible.map((inc) => {
              const status = statusOf(inc)
              return (
                <li
                  key={inc.id}
                  className="rounded-lg border border-border p-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-foreground">{inc.facility.name}</span>
                        <span className="text-xs text-muted-foreground">{inc.facility.region}</span>
                        <Badge variant="outline">{inc.kind}</Badge>
                      </div>
                      <p className="text-sm font-medium text-foreground">{inc.title}</p>
                      <p className="text-sm text-muted-foreground">{inc.detail}</p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <SeverityBadge severity={inc.severity} />
                      <StatusBadge status={status} />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => cycleStatus(inc)}
                      >
                        Mark {STATUS_LABEL[NEXT_STATUS[status]]}
                      </Button>
                    </div>
                  </div>
                </li>
              )
            })
          )}
        </ul>
      </CardContent>
    </Card>
  )
}
