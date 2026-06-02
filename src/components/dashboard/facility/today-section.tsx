"use client"

import { LazyMotionProvider } from "@/components/motion/lazy-motion-provider"
import { cn } from "@/lib/utils"
import { getFridgeStatus } from "@/lib/dashboard/facility-demo-data"
import type { NavSection } from "@/lib/dashboard/facility-nav"
import { FridgeStatusCard } from "./fridge-status-card"
import { PowerTodayCard } from "./power-today-card"
import { PendingTasksCard } from "./pending-tasks-card"

/** Time-of-day greeting (English) for the Today header. */
function greeting(): string {
  const h = new Date().getHours()
  if (h < 12) return "Good morning"
  if (h < 17) return "Good afternoon"
  return "Good evening"
}

/**
 * Spec 8.2 "Today surface": the facility home page. Three glanceable cards
 * answer are the vaccines safe right now, how much power today, is there
 * anything I need to do. When the fridge is in danger the layout reorganizes so
 * the fridge card takes the full hero position.
 *
 * Desktop-first: three columns on large screens, stacked on small screens.
 */
export function TodaySection({
  facilityId,
  facilityName,
  batteryLevel,
  onNavigate,
}: {
  facilityId?: string
  facilityName?: string | null
  batteryLevel?: number
  onNavigate?: (section: NavSection) => void
}) {
  const danger = getFridgeStatus(facilityId).status === "danger"

  return (
    <LazyMotionProvider>
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-foreground">
            {greeting()}
            {facilityName ? `, ${facilityName}` : ""}
          </h2>
          <p className="text-sm text-muted-foreground">
            Here&apos;s today at a glance fridge, power and anything that needs you.
          </p>
        </div>

        {danger ? (
          <div className="space-y-4">
            <FridgeStatusCard facilityId={facilityId} />
            <div className="grid gap-4 sm:grid-cols-2">
              <PowerTodayCard facilityId={facilityId} batteryLevel={batteryLevel} />
              <PendingTasksCard facilityId={facilityId} onOpenTask={onNavigate} />
            </div>
          </div>
        ) : (
          <div className={cn("grid gap-4 lg:grid-cols-3")}>
            <FridgeStatusCard facilityId={facilityId} />
            <PowerTodayCard facilityId={facilityId} batteryLevel={batteryLevel} />
            <PendingTasksCard facilityId={facilityId} onOpenTask={onNavigate} />
          </div>
        )}
      </div>
    </LazyMotionProvider>
  )
}
