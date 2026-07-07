"use client"

import * as React from "react"
import {
  Bell,
  BellOff,
  ShieldAlert,
  Thermometer,
  Zap,
  LifeBuoy,
  CreditCard,
  ServerCog,
  AlertTriangle,
  CheckCircle2,
  Search,
  X,
  ChevronRight,
} from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { StatCard } from "@/components/ui/stat-card"
import { EmptyState } from "@/components/ui/empty-state"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { FOCUS_RING } from "@/lib/dashboard/facility-ui"
import { useAdminPortfolio } from "@/hooks/use-admin-portfolio"
import { useAdminPaygFinancing } from "@/hooks/use-admin-payg-financing"
import { useAdminSupportTickets, useAdminSystemLogs } from "@/hooks/use-admin-notification-sources"
import {
  SEVERITY_META,
  CATEGORY_META,
  sortNotifications,
  timeAgo,
  notificationTarget,
  type AdminNotification,
  type NotifSeverity,
  type NotifCategory,
} from "@/lib/notifications/notification-model"
import {
  climateResilienceNotifications,
  energyNotifications,
  supportNotifications,
  financingNotifications,
  systemNotifications,
} from "@/lib/notifications/build-notifications"

const selectClass = "h-9 rounded-md border border-border bg-background px-2 text-sm text-foreground"

const CATEGORY_ICON: Record<NotifCategory, React.ReactNode> = {
  climate: <Thermometer className="size-4" />,
  resilience: <ShieldAlert className="size-4" />,
  energy: <Zap className="size-4" />,
  support: <LifeBuoy className="size-4" />,
  financing: <CreditCard className="size-4" />,
  system: <ServerCog className="size-4" />,
}

// Soft tonal Badge variant per severity (colour + label, never colour alone).
const SEVERITY_BADGE: Record<NotifSeverity, "destructiveSoft" | "warningSoft" | "solarSoft" | "muted"> = {
  critical: "destructiveSoft",
  high: "warningSoft",
  medium: "solarSoft",
  info: "muted",
}

const SEVERITIES: (NotifSeverity | "all")[] = ["all", "critical", "high", "medium", "info"]
const CATEGORIES: (NotifCategory | "all")[] = ["all", "climate", "resilience", "energy", "support", "financing", "system"]

function PageSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="space-y-2 p-5">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-7 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardContent className="space-y-3 p-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

export function AdminNotificationsCenter({
  onOpen,
}: {
  /** Deep-link a notification to the facility's detail page for review. */
  onOpen?: (target: { section: string; facilityId?: string }) => void
} = {}) {
  const { facilities, isLoading, isError, climateLoading } = useAdminPortfolio()
  const financingQ = useAdminPaygFinancing()
  const supportQ = useAdminSupportTickets()
  const logsQ = useAdminSystemLogs()

  const [severity, setSeverity] = React.useState<NotifSeverity | "all">("all")
  const [category, setCategory] = React.useState<NotifCategory | "all">("all")
  const [query, setQuery] = React.useState("")
  const [dismissed, setDismissed] = React.useState<Set<string>>(new Set())

  const all = React.useMemo<AdminNotification[]>(() => {
    const list: AdminNotification[] = [
      ...climateResilienceNotifications(facilities),
      ...energyNotifications(facilities),
    ]
    if (supportQ.data) list.push(...supportNotifications(supportQ.data))
    if (financingQ.data?.contracts) list.push(...financingNotifications(financingQ.data.contracts))
    if (logsQ.data) list.push(...systemNotifications(logsQ.data))
    return sortNotifications(list)
  }, [facilities, supportQ.data, financingQ.data, logsQ.data])

  const active = React.useMemo(() => all.filter((n) => !dismissed.has(n.id)), [all, dismissed])

  const counts = React.useMemo(() => {
    let critical = 0
    let high = 0
    for (const n of active) {
      if (n.severity === "critical") critical += 1
      else if (n.severity === "high") high += 1
    }
    return { total: active.length, critical, high, attention: critical + high }
  }, [active])

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    return active.filter((n) => {
      if (severity !== "all" && n.severity !== severity) return false
      if (category !== "all" && n.category !== category) return false
      if (q && !`${n.title} ${n.message} ${n.facility ?? ""} ${n.region ?? ""}`.toLowerCase().includes(q)) return false
      return true
    })
  }, [active, severity, category, query])

  const failedSources = React.useMemo(() => {
    const f: string[] = []
    if (supportQ.isError) f.push("support tickets")
    if (financingQ.isError) f.push("financing")
    if (logsQ.isError) f.push("system logs")
    return f
  }, [supportQ.isError, financingQ.isError, logsQ.isError])

  const hasActiveFilters = severity !== "all" || category !== "all" || query !== ""

  if (isLoading) return <PageSkeleton />
  if (isError) return <p className="text-sm text-destructive">Could not load portfolio data. Please retry.</p>

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Active notifications" value={counts.total} icon={<Bell />} accent="primary" meta="Across all sources" />
        <StatCard title="Critical" value={counts.critical} icon={<AlertTriangle />} accent="destructive" meta="Immediate attention" />
        <StatCard title="High" value={counts.high} icon={<ShieldAlert />} accent="warning" meta="Act soon" />
        <StatCard title="Needs attention" value={counts.attention} icon={<Bell />} accent={counts.attention > 0 ? "warning" : "success"} meta="Critical + high" />
      </div>

      <Card>
        <CardHeader className="space-y-3 pb-3">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base">Notifications</CardTitle>
            <span className="text-xs text-muted-foreground">
              {filtered.length} shown{climateLoading ? " · climate loading…" : ""}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search aria-hidden className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search notifications"
                aria-label="Search notifications"
                className={cn("h-9 w-48 rounded-md border border-border bg-background pl-8 pr-3 text-sm text-foreground placeholder:text-muted-foreground", FOCUS_RING)}
              />
            </div>
            <select value={severity} onChange={(e) => setSeverity(e.target.value as NotifSeverity | "all")} aria-label="Filter by severity" className={cn(selectClass, FOCUS_RING)}>
              {SEVERITIES.map((s) => (
                <option key={s} value={s}>{s === "all" ? "All severities" : SEVERITY_META[s].label}</option>
              ))}
            </select>
            <select value={category} onChange={(e) => setCategory(e.target.value as NotifCategory | "all")} aria-label="Filter by category" className={cn(selectClass, FOCUS_RING)}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c === "all" ? "All categories" : CATEGORY_META[c].label}</option>
              ))}
            </select>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={() => { setSeverity("all"); setCategory("all"); setQuery("") }} className="h-9">
                Clear filters
              </Button>
            )}
          </div>
          {failedSources.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Some sources are unavailable ({failedSources.join(", ")}) — showing the rest.
            </p>
          )}
        </CardHeader>

        <CardContent className="space-y-2">
          {filtered.length === 0 ? (
            active.length === 0 ? (
              <EmptyState
                icon={<CheckCircle2 />}
                title="All clear — no active notifications"
                description="New climate, resilience, energy and operational alerts appear here."
                className="border-0 bg-transparent py-12"
              />
            ) : (
              <EmptyState
                icon={<BellOff />}
                title="No notifications match the current filters"
                className="border-0 bg-transparent py-12"
              />
            )
          ) : (
            <ul className="divide-y divide-border">
              {filtered.map((n) => {
                const sev = SEVERITY_META[n.severity]
                const target = notificationTarget(n)
                const clickable = Boolean(target && onOpen)
                const open = () => {
                  if (!target) return
                  onOpen?.({ section: target.section, facilityId: target.focusFacility ? n.facilityId ?? undefined : undefined })
                }
                return (
                  <li key={n.id} className={cn("flex items-start gap-2 py-3", clickable && "group")}>
                    <div
                      {...(clickable
                        ? {
                            role: "button" as const,
                            tabIndex: 0,
                            onClick: open,
                            onKeyDown: (e: React.KeyboardEvent) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault()
                                open()
                              }
                            },
                            "aria-label": `Open ${n.facility ?? n.title} for review`,
                          }
                        : {})}
                      className={cn(
                        "flex min-w-0 flex-1 items-start gap-3 rounded-md",
                        clickable && cn("-m-1 cursor-pointer p-1 transition-colors hover:bg-muted/50", FOCUS_RING),
                      )}
                    >
                      <span className={cn("mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground")}>
                        {CATEGORY_ICON[n.category]}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-foreground">{n.title}</span>
                          <Badge variant={SEVERITY_BADGE[n.severity]} className="rounded-full text-[11px]">{sev.label}</Badge>
                          <Badge variant="outline" className="rounded-full text-[11px] text-muted-foreground">{CATEGORY_META[n.category].label}</Badge>
                        </div>
                        <p className="mt-0.5 text-sm text-muted-foreground">{n.message}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                          {n.facility && <span className="font-medium text-foreground">{n.facility}</span>}
                          {n.region && <span>· {n.region}</span>}
                          {n.hint && <span>· {n.hint}</span>}
                          {n.timestamp && <span>· {timeAgo(n.timestamp)}</span>}
                        </div>
                      </div>
                      {clickable && (
                        <ChevronRight aria-hidden className="mt-1 size-4 shrink-0 self-center text-muted-foreground opacity-60 transition-opacity group-hover:opacity-100" />
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setDismissed((prev) => new Set(prev).add(n.id))}
                      aria-label="Dismiss notification"
                      className={cn("mt-0.5 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground", FOCUS_RING)}
                    >
                      <X aria-hidden className="size-4" />
                    </button>
                  </li>
                )
              })}
            </ul>
          )}

          {dismissed.size > 0 && (
            <div className="flex justify-end pt-1">
              <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setDismissed(new Set())}>
                Restore {dismissed.size} dismissed
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
