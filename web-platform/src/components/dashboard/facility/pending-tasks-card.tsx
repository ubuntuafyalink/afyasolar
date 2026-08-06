"use client"

import {
  CalendarClock,
  ChevronRight,
  ClipboardCheck,
  Gauge,
  ListChecks,
  Wrench,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/components/ui/empty-state"
import { cn } from "@/lib/utils"
import { FOCUS_RING } from "@/lib/dashboard/facility-ui"
import { getPendingTasks, type FacilityTaskKind } from "@/lib/dashboard/facility-demo-data"
import type { NavSection } from "@/lib/dashboard/facility-nav"

const TASK_ICON: Record<FacilityTaskKind, LucideIcon> = {
  "technician-visit": Wrench,
  "meter-reading": Gauge,
  "assessment-due": ClipboardCheck,
  "alert-response": CalendarClock,
}

/**
 * Spec 8.2 "card three": today's pending tasks. Most days this is empty; when
 * something needs action (technician visit, meter reading, assessment due, alert
 * response) it appears here with a single tap to start the relevant workflow.
 */
export function PendingTasksCard({
  facilityId,
  className,
  onOpenTask,
}: {
  facilityId?: string
  className?: string
  /** Navigate to the workflow for a task's target section, if it has one. */
  onOpenTask?: (target: NavSection) => void
}) {
  const tasks = getPendingTasks(facilityId)

  return (
    <Card className={cn("flex flex-col", className)}>
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
        <CardTitle className="text-base">Tasks</CardTitle>
        {tasks.length > 0 ? <Badge variant="secondary">{tasks.length}</Badge> : null}
      </CardHeader>
      <CardContent className="flex-1">
        {tasks.length === 0 ? (
          <EmptyState
            icon={<ListChecks />}
            title="Nothing to do today"
            description="You're all caught up. New tasks will appear here when they need your attention."
            className="h-full border-0 bg-transparent py-8"
          />
        ) : (
          <ul className="space-y-2">
            {tasks.map((task) => {
              const Icon = TASK_ICON[task.kind]
              const actionable = Boolean(task.target && onOpenTask)
              return (
                <li key={task.id}>
                  <button
                    type="button"
                    disabled={!actionable}
                    onClick={() => task.target && onOpenTask?.(task.target as NavSection)}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-lg border border-border p-3 text-left transition-colors",
                      FOCUS_RING,
                      actionable ? "hover:bg-muted" : "cursor-default",
                    )}
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="size-5" aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground">{task.title}</p>
                      <p className="truncate text-xs text-muted-foreground">{task.detail}</p>
                      <p className="mt-1 text-xs font-medium text-primary">{task.dueLabel}</p>
                    </div>
                    {actionable ? (
                      <ChevronRight className="mt-1 size-4 shrink-0 text-muted-foreground" aria-hidden />
                    ) : null}
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
