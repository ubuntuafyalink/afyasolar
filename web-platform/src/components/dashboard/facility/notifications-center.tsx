"use client"

import { useMemo, useState } from "react"
import {
  Bell,
  TriangleAlert,
  OctagonAlert,
  Info,
  Snowflake,
  ClipboardList,
  CheckCheck,
  type LucideIcon,
} from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { FOCUS_RING } from "@/lib/dashboard/facility-ui"
import { DemoDataBadge } from "@/components/ui/demo-data-badge"
import { EmptyState } from "@/components/ui/empty-state"
import {
  getFacilityAlerts,
  getColdChainPrediction,
  getPendingTasks,
  type AlertSeverity,
} from "@/lib/dashboard/facility-demo-data"
import { useNotificationsRead } from "@/hooks/use-notifications-read"
import { OfflineReadyBadge } from "./offline-ready-badge"
import { useFacilityPreferences } from "./facility-preferences-provider"

type Group = "alert" | "coldchain" | "task"

type NotifItem = {
  id: string
  severity: AlertSeverity
  group: Group
  title: string
  detail: string
}

const SEVERITY: Record<AlertSeverity, { icon: LucideIcon; badge: "destructive" | "warning" | "secondary" }> = {
  danger: { icon: OctagonAlert, badge: "destructive" },
  warning: { icon: TriangleAlert, badge: "warning" },
  info: { icon: Info, badge: "secondary" },
}

const GROUP_ICON: Record<Group, LucideIcon> = {
  alert: Bell,
  coldchain: Snowflake,
  task: ClipboardList,
}

type Filter = "all" | AlertSeverity

/**
 * Unified notifications inbox: climate/outage alerts + the cold-chain prediction
 * + pending tasks, with severity filtering and read/unread state (localStorage).
 * Frontend + seed only.
 */
export function NotificationsCenter({ facilityId }: { facilityId?: string }) {
  const { t } = useFacilityPreferences()
  const { isRead, markRead, markAllRead } = useNotificationsRead()
  const [filter, setFilter] = useState<Filter>("all")

  const items = useMemo<NotifItem[]>(() => {
    const out: NotifItem[] = []
    for (const a of getFacilityAlerts(facilityId)) {
      if (!a.active) continue
      out.push({
        id: `alert-${a.kind}`,
        severity: a.severity,
        group: "alert",
        title: a.title,
        detail: `${a.detail} · ${a.leadTime}`,
      })
    }
    const cc = getColdChainPrediction(facilityId)
    if (cc.atRisk) {
      out.push({
        id: "coldchain-prediction",
        severity: "danger",
        group: "coldchain",
        title: t("notifications.coldChainTitle"),
        detail: `${cc.signal} · ${cc.etaDaysMin}${cc.etaDaysMax}d · ${cc.confidencePct}%`,
      })
    }
    for (const task of getPendingTasks(facilityId)) {
      out.push({
        id: `task-${task.id}`,
        severity: "info",
        group: "task",
        title: task.title,
        detail: `${task.detail} · ${task.dueLabel}`,
      })
    }
    const rank: Record<AlertSeverity, number> = { danger: 0, warning: 1, info: 2 }
    return out.sort((a, b) => rank[a.severity] - rank[b.severity])
  }, [facilityId, t])

  const visible = filter === "all" ? items : items.filter((i) => i.severity === filter)
  const unread = items.filter((i) => !isRead(i.id)).length

  const FILTERS: Filter[] = ["all", "danger", "warning", "info"]

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="size-5 text-primary" aria-hidden />
            {t("notifications.title")}
            {unread > 0 && (
              <Badge variant="secondary" className="text-[10px]">
                {t("notifications.unread", { n: unread })}
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <OfflineReadyBadge />
            <DemoDataBadge />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Filters + mark all read */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1.5" role="group" aria-label={t("notifications.filter")}>
            {FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                aria-pressed={filter === f}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                  FOCUS_RING,
                  filter === f
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-muted-foreground hover:bg-muted",
                )}
              >
                {t(`notifications.sev.${f}`)}
              </button>
            ))}
          </div>
          {unread > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 gap-1 text-xs"
              onClick={() => markAllRead(items.map((i) => i.id))}
            >
              <CheckCheck className="size-3.5" aria-hidden />
              {t("notifications.markAllRead")}
            </Button>
          )}
        </div>

        {/* List */}
        {visible.length === 0 ? (
          <EmptyState icon={<Bell />} title={t("notifications.empty")} />
        ) : (
          <ul className="space-y-2">
            {visible.map((item) => {
              const sev = SEVERITY[item.severity]
              const SevIcon = sev.icon
              const GroupIcon = GROUP_ICON[item.group]
              const read = isRead(item.id)
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => markRead(item.id)}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors",
                      FOCUS_RING,
                      read ? "border-border bg-card opacity-70" : "border-primary/20 bg-primary/5",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg",
                        item.severity === "danger"
                          ? "bg-destructive/10 text-destructive"
                          : item.severity === "warning"
                            ? "bg-warning/15 text-warning-foreground"
                            : "bg-muted text-muted-foreground",
                      )}
                    >
                      <SevIcon className="size-4" aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium text-foreground">{item.title}</span>
                        <Badge variant={sev.badge} className="gap-1 text-[10px]">
                          <GroupIcon className="size-3" aria-hidden />
                          {t(`notifications.group.${item.group}`)}
                        </Badge>
                        {!read && (
                          <span className="size-2 rounded-full bg-primary" aria-label={t("notifications.unreadDot")} />
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">{item.detail}</p>
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
