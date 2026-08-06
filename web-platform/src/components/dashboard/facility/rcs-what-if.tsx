"use client"

import { useMemo, useState } from "react"
import { SlidersHorizontal, RotateCcw, ArrowUp, ArrowDown } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { FOCUS_RING } from "@/lib/dashboard/facility-ui"
import {
  getCrphcBaseDimensions,
  CRPHC_NEW_DIMENSIONS,
  computeCrphcResult,
  getRcsExplainer,
  type CrphcDimension,
} from "@/lib/dashboard/facility-demo-data"
import { useFacilityPreferences } from "./facility-preferences-provider"

/**
 * "What if" RCS simulator: drag the five core dimensions and watch the
 * Resilience Capacity Score recompute live via the real CRiPHC formula
 * (computeCrphcResult). The two v2.0 dimensions stay at their baseline so the
 * starting RCS matches the rest of the dashboard.
 */
export function RcsWhatIf({ facilityId, hesScore }: { facilityId?: string; hesScore?: number }) {
  const { t } = useFacilityPreferences()
  const base = useMemo(
    () => getCrphcBaseDimensions(facilityId, hesScore != null ? { hesScore } : undefined),
    [facilityId, hesScore],
  )
  const baselineRcs = useMemo(
    () => getRcsExplainer(facilityId, hesScore != null ? { hesScore } : undefined).rcs,
    [facilityId, hesScore],
  )

  const [scores, setScores] = useState<Record<string, number>>(() =>
    Object.fromEntries(base.map((d) => [d.code, d.score])),
  )

  const simulated = useMemo(() => {
    const dims: CrphcDimension[] = [
      ...base.map((d) => ({ ...d, score: scores[d.code] ?? d.score })),
      ...CRPHC_NEW_DIMENSIONS.map((d) => ({ ...d, score: 60, isNew: true })),
    ]
    return computeCrphcResult(dims)
  }, [base, scores])

  const delta = simulated.rcs - baselineRcs
  const dirty = base.some((d) => (scores[d.code] ?? d.score) !== d.score)

  const reset = () => setScores(Object.fromEntries(base.map((d) => [d.code, d.score])))

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <SlidersHorizontal className="size-5 text-primary" aria-hidden />
          {t("rcs.whatif.title")}
        </CardTitle>
        <p className="text-xs text-muted-foreground">{t("rcs.whatif.hint")}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Result */}
        <div className="flex flex-wrap items-center gap-4 rounded-lg border border-border p-3">
          <div>
            <p className="text-xs text-muted-foreground">{t("rcs.whatif.baseline")}</p>
            <p className="text-2xl font-bold tabular-nums text-foreground">{baselineRcs}</p>
          </div>
          <ArrowDown className="size-4 rotate-[-90deg] text-muted-foreground" aria-hidden />
          <div>
            <p className="text-xs text-muted-foreground">{t("rcs.whatif.simulated")}</p>
            <p className="text-2xl font-bold tabular-nums text-foreground">{simulated.rcs}</p>
          </div>
          {dirty && (
            <span
              className={cn(
                "ml-auto inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-sm font-semibold",
                delta > 0
                  ? "bg-success/10 text-success"
                  : delta < 0
                    ? "bg-destructive/10 text-destructive"
                    : "bg-muted text-muted-foreground",
              )}
            >
              {delta > 0 ? (
                <ArrowUp className="size-3.5" aria-hidden />
              ) : delta < 0 ? (
                <ArrowDown className="size-3.5" aria-hidden />
              ) : null}
              {delta > 0 ? "+" : ""}
              {delta} {t("rcs.whatif.points")}
            </span>
          )}
        </div>

        {/* Sliders */}
        <div className="space-y-3">
          {base.map((d) => {
            const value = scores[d.code] ?? d.score
            return (
              <div key={d.code}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <label htmlFor={`whatif-${d.code}`} className="text-foreground">
                    {t(`rcs.dim.${d.code}`)}
                  </label>
                  <span className="font-semibold tabular-nums text-foreground">{value}/100</span>
                </div>
                <input
                  id={`whatif-${d.code}`}
                  type="range"
                  min={0}
                  max={100}
                  value={value}
                  onChange={(e) =>
                    setScores((s) => ({ ...s, [d.code]: Number(e.target.value) }))
                  }
                  className={cn("h-2 w-full cursor-pointer accent-primary", FOCUS_RING)}
                  aria-valuetext={`${value} / 100`}
                />
              </div>
            )
          })}
        </div>

        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={reset}
            disabled={!dirty}
            className={cn("gap-1.5", FOCUS_RING)}
          >
            <RotateCcw className="size-4" aria-hidden />
            {t("rcs.whatif.reset")}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
