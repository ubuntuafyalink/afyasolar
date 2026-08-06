"use client"

import { useMemo } from "react"
import { Trash2, ClipboardList } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { FOCUS_RING } from "@/lib/dashboard/facility-ui"
import { EmptyState } from "@/components/ui/empty-state"
import { ECM_CATALOGUE } from "@/lib/dashboard/ecm-catalogue"
import { useAdaptationPlan, type PlanStatus } from "@/hooks/use-adaptation-plan"
import { useFacilityPreferences } from "./facility-preferences-provider"

const STATUS_ORDER: PlanStatus[] = ["planned", "in-progress", "done"]
const STATUS_BADGE: Record<PlanStatus, "secondary" | "warning" | "success"> = {
  planned: "secondary",
  "in-progress": "warning",
  done: "success",
}

/**
 * "My Plan" the facility's tracked adaptation measures with status controls
 * and a progress summary. Backed by useAdaptationPlan (localStorage).
 */
export function AdaptationTracker() {
  const { t } = useFacilityPreferences()
  const { items, setStatus, remove } = useAdaptationPlan()

  const tracked = useMemo(
    () =>
      Object.entries(items)
        .map(([code, status]) => {
          const ecm = ECM_CATALOGUE.find((e) => e.code === code)
          return ecm ? { ecm, status } : null
        })
        .filter((x): x is { ecm: (typeof ECM_CATALOGUE)[number]; status: PlanStatus } => Boolean(x)),
    [items],
  )

  const doneCount = tracked.filter((x) => x.status === "done").length
  const pointsPlanned = tracked.reduce((s, x) => s + x.ecm.resilienceGainPoints, 0)
  const pct = tracked.length ? Math.round((doneCount / tracked.length) * 100) : 0

  if (tracked.length === 0) {
    return <EmptyState icon={<ClipboardList />} title={t("plan.empty")} description={t("plan.emptyHint")} />
  }

  return (
    <div className="space-y-4">
      {/* Progress summary */}
      <div className="rounded-lg border border-border p-3">
        <div className="mb-1 flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{t("plan.progress")}</span>
          <span className="font-semibold tabular-nums text-foreground">
            {doneCount}/{tracked.length} · {t("plan.pointsPlanned", { n: pointsPlanned })}
          </span>
        </div>
        <div
          className="h-2 w-full overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={t("plan.progress")}
        >
          <div className="h-full rounded-full bg-success" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <ul className="space-y-2">
        {tracked.map(({ ecm, status }) => (
          <li
            key={ecm.code}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-medium text-foreground">{ecm.title}</span>
                <Badge variant={STATUS_BADGE[status]} className="shrink-0 text-[10px]">
                  {t(`plan.status.${status}`)}
                </Badge>
              </div>
              <span className="text-[11px] text-muted-foreground">
                {ecm.dimension} · +{ecm.resilienceGainPoints} {t("plan.points")}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              {/* Status cycle buttons */}
              <div className="flex overflow-hidden rounded-md border border-border" role="group" aria-label={ecm.title}>
                {STATUS_ORDER.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatus(ecm.code, s)}
                    aria-pressed={status === s}
                    className={cn(
                      "px-2 py-1 text-[11px] font-medium transition-colors",
                      FOCUS_RING,
                      status === s
                        ? "bg-primary text-primary-foreground"
                        : "bg-card text-muted-foreground hover:bg-muted",
                    )}
                  >
                    {t(`plan.status.${s}`)}
                  </button>
                ))}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className={cn("size-8", FOCUS_RING)}
                onClick={() => remove(ecm.code)}
                aria-label={t("plan.remove")}
              >
                <Trash2 className="size-4" aria-hidden />
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
