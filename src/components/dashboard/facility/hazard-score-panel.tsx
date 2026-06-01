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
 * Spec 10.3: quantitative hazard exposure scores derived from the long-term
 * climate record, triangulated against the Champion's qualitative assessment.
 *
 * [data] fed by the local demo module. TODO: wire NASA POWER + ERA5 + IPCC AR6
 * projections per spec Parts 5 & 10.3.
 */
export function HazardScorePanel({ facilityId }: { facilityId?: string }) {
  const hazards = getHazardScores(facilityId)

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Satellite className="size-5 text-primary" aria-hidden /> Quantitative hazard exposure
          </CardTitle>
          <DemoDataBadge label="Demo data · NASA POWER/ERA5" />
        </div>
        <p className="text-xs text-muted-foreground">
          Literature-backed scores from the long-term climate record (0 = low, 100 = high).
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
              <p className="text-[11px] text-muted-foreground">{h.note}</p>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
