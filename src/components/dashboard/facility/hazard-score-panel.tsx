"use client"

import { ArrowDownRight, ArrowRight, ArrowUpRight, Satellite } from "lucide-react"
import type { LucideIcon } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DemoDataBadge } from "@/components/ui/demo-data-badge"
import { cn } from "@/lib/utils"
import { getHazardScores, type HazardScore } from "@/lib/dashboard/facility-demo-data"

const TREND_META: Record<HazardScore["trend"], { icon: LucideIcon; className: string; label: string }> = {
  rising: { icon: ArrowUpRight, className: "text-destructive", label: "rising" },
  stable: { icon: ArrowRight, className: "text-muted-foreground", label: "stable" },
  falling: { icon: ArrowDownRight, className: "text-success", label: "falling" },
}

function scoreColor(score: number): string {
  if (score >= 66) return "bg-destructive"
  if (score >= 40) return "bg-warning"
  return "bg-success"
}

/**
 * Quantitative hazard exposure scores. On the live path these are calibrated to
 * the facility's own ~30-year NASA POWER climate record (standardized-anomaly
 * percentile blended with an absolute-severity anchor); see
 * docs/CLIMATE_RESILIENCE_METHODOLOGY.md. The demo path renders seeded sample
 * values behind a demo badge.
 */
export function HazardScorePanel({
  facilityId,
  scores,
  live = false,
}: {
  facilityId?: string
  /** When provided (real NASA POWER data), render these instead of demo data. */
  scores?: HazardScore[]
  live?: boolean
}) {
  const hazards = scores ?? getHazardScores(facilityId)

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Satellite className="size-5 text-primary" aria-hidden /> Quantitative hazard exposure
          </CardTitle>
          {live ? (
            <span className="inline-flex items-center gap-1 rounded-md border border-success/30 bg-success/10 px-2 py-0.5 text-[11px] font-medium text-success">
              <Satellite className="size-3" aria-hidden /> NASA POWER · real data
            </span>
          ) : (
            <DemoDataBadge />
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {live
            ? "Calibrated to this location's ~30-year NASA POWER climate record (0 = low, 100 = high)."
            : "Illustrative sample values (0 = low, 100 = high)."}
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {hazards.map((h) => {
          const trend = TREND_META[h.trend]
          const TrendIcon = trend.icon
          return (
            <div key={h.type} className="space-y-1">
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="font-medium text-foreground">{h.type}</span>
                <span className={cn("flex items-center gap-1 text-xs", trend.className)}>
                  <TrendIcon className="size-3.5" aria-hidden />
                  {trend.label} · {h.score}/100
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div className={cn("h-full rounded-full", scoreColor(h.score))} style={{ width: `${h.score}%` }} />
              </div>
              <p className="text-[11px] text-muted-foreground">
                {h.note}
                {live && h.returnPeriodYears != null ? (
                  <>
                    {" · "}
                    <span title="Empirical Weibull return period from the local record; wide uncertainty on a short baseline.">
                      latest ≈ 1-in-{h.returnPeriodYears}-yr level
                      {h.baselineYears ? ` (from ${h.baselineYears}-yr record)` : ""}
                    </span>
                  </>
                ) : null}
              </p>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
