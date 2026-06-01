"use client"

import { useState } from "react"
import { AlertTriangle, ShieldCheck } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
  CRPHC_NEW_DIMENSIONS,
  computeCrphcResult,
  getCrphcBaseDimensions,
  type CrphcDimension,
} from "@/lib/dashboard/facility-demo-data"

const TIER_STYLE: Record<string, string> = {
  Resilient: "bg-success/10 text-success",
  Developing: "bg-primary/10 text-primary",
  "At risk": "bg-warning/15 text-warning-foreground",
  Critical: "bg-destructive/10 text-destructive",
}

function barColor(score: number): string {
  if (score >= 70) return "bg-success"
  if (score >= 45) return "bg-warning"
  return "bg-destructive"
}

/**
 * Spec 10.2 / 10.4: the CRiPHC v2.0 results — the composite Resilience Capacity
 * Score across SEVEN dimensions (the existing five plus the new Workforce and
 * WASH dimensions), the resilience tier, and the top risks. The two new
 * dimensions are scored here on a 5-point scale (additive — the existing
 * assessment is left untouched); the other five use saved demo scores.
 */
export function CrphcResults({ facilityId }: { facilityId?: string }) {
  const base = getCrphcBaseDimensions(facilityId)
  const [newScores, setNewScores] = useState<Record<string, number>>({ W: 3, WW: 3 })

  const dimensions: CrphcDimension[] = [
    ...base,
    ...CRPHC_NEW_DIMENSIONS.map((d) => ({ ...d, score: newScores[d.code] * 20, isNew: true })),
  ]
  const { rcs, tier } = computeCrphcResult(dimensions)
  const topRisks = [...dimensions].sort((a, b) => a.score - b.score).slice(0, 3)

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldCheck className="size-5 text-primary" aria-hidden /> Resilience Capacity Score (7 dimensions)
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          CRiPHC v2.0 adds Workforce and Water/Sanitation/Hygiene &amp; Waste to the original five
          dimensions.
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* RCS headline */}
        <div className="flex flex-wrap items-center gap-4 rounded-lg border border-border p-4">
          <div>
            <p className="text-xs text-muted-foreground">RCS (0–100)</p>
            <p className="text-4xl font-black tracking-tight text-foreground">{rcs}</p>
          </div>
          <Badge className={cn("text-sm", TIER_STYLE[tier])} variant="secondary">
            {tier}
          </Badge>
          <div className="h-2 min-w-40 flex-1 overflow-hidden rounded-full bg-muted">
            <div className={cn("h-full rounded-full", barColor(rcs))} style={{ width: `${rcs}%` }} />
          </div>
        </div>

        {/* Dimension bars */}
        <div className="space-y-3">
          {dimensions.map((d) => (
            <div key={d.code} className="space-y-1">
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="font-medium text-foreground">
                  {d.label}
                  {d.isNew ? (
                    <Badge variant="outline" className="ml-2 text-[10px]">
                      new
                    </Badge>
                  ) : null}
                </span>
                <span className="text-xs text-muted-foreground">
                  weight {Math.round(d.weight * 100)}% · {d.score}/100
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div className={cn("h-full rounded-full", barColor(d.score))} style={{ width: `${d.score}%` }} />
              </div>
              {d.isNew ? (
                <div className="flex gap-1 pt-1" role="group" aria-label={`${d.label} score`}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      aria-pressed={newScores[d.code] === n}
                      onClick={() => setNewScores((s) => ({ ...s, [d.code]: n }))}
                      className={cn(
                        "flex size-8 items-center justify-center rounded-md border text-sm font-medium transition-colors",
                        newScores[d.code] === n
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border text-muted-foreground hover:bg-muted",
                      )}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </div>

        {/* Top risks */}
        <div>
          <p className="mb-2 text-sm font-semibold text-foreground">Top risks</p>
          <ul className="space-y-1.5">
            {topRisks.map((d) => (
              <li
                key={d.code}
                className="flex items-center gap-2 rounded-lg border border-border p-2.5 text-sm"
              >
                <AlertTriangle className="size-4 shrink-0 text-warning-foreground" aria-hidden />
                <span className="flex-1 text-foreground">{d.label}</span>
                <span className="text-xs text-muted-foreground">{d.score}/100</span>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
