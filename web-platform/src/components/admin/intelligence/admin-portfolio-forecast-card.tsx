"use client"

import { useState } from "react"
import { motion, AnimatePresence, useReducedMotion } from "framer-motion"
import { Sparkles } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AiLoadingIndicator } from "@/components/ui/ai-loading"
import { cn } from "@/lib/utils"
import { FOCUS_RING } from "@/lib/dashboard/facility-ui"
import { useAdminPortfolioForecast } from "@/hooks/use-admin-portfolio-forecast"
import {
  HAZARD_SERIES,
  HazardTrajectoryChart,
} from "@/components/dashboard/facility/ai-forecast-charts"
import { ExplainPopover } from "@/components/dashboard/facility/explain-popover"

const MONTH_OPTIONS = [3, 6, 12] as const
const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1]

/**
 * Animated overlay shown while the AI re-forecasts a new window. Transform/opacity
 * only; falls back to a static label under prefers-reduced-motion.
 */
function PredictingOverlay({ months }: { months: number }) {
  const reduced = useReducedMotion()
  return (
    <motion.div
      key="predicting"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2, ease: EASE_OUT }}
      className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-lg bg-card/70 backdrop-blur-[2px]"
      role="status"
      aria-live="polite"
    >
      <motion.div
        animate={reduced ? undefined : { scale: [1, 1.18, 1], rotate: [0, 10, -10, 0] }}
        transition={reduced ? undefined : { duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        className="flex size-11 items-center justify-center rounded-full bg-primary/10"
      >
        <Sparkles className="size-5 text-primary" aria-hidden />
      </motion.div>

      <p className="text-sm font-medium text-foreground">
        Forecasting next {months} months
        {reduced ? "…" : null}
        {!reduced ? (
          <span className="inline-flex">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                animate={{ opacity: [0.2, 1, 0.2] }}
                transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2, ease: "easeInOut" }}
                aria-hidden
              >
                .
              </motion.span>
            ))}
          </span>
        ) : null}
      </p>

      {/* Indeterminate shimmer bar (translateX only). */}
      <div className="h-1.5 w-40 overflow-hidden rounded-full bg-muted">
        {!reduced ? (
          <motion.div
            className="h-full w-1/2 rounded-full bg-primary"
            animate={{ x: ["-120%", "260%"] }}
            transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
          />
        ) : (
          <div className="h-full w-1/3 rounded-full bg-primary" />
        )}
      </div>
    </motion.div>
  )
}

/**
 * Portfolio AI Forecast: the forward-looking climate hazard outlook averaged
 * across all facilities (Chronos zero-shot via the AI service). Complements the
 * historical NASA portfolio panels on the admin Climate Outlook.
 *
 * Interactive: a months-ahead selector re-runs the forecast over that window (the
 * AI service re-derives the hazard indices), with an in-place "predicting"
 * animation while the new window loads.
 */
export function AdminPortfolioForecastCard() {
  const [months, setMonths] = useState<number>(12)
  const { data, isLoading, isFetching, isError } = useAdminPortfolioForecast(months)
  const agg = data?.aggregate
  const predicting = isFetching && !isLoading // re-forecasting while old data is on screen

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="size-4 text-primary" aria-hidden />
            Portfolio AI Forecast
          </CardTitle>
          <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
            {agg ? `Chronos zero-shot · ${agg.facilitiesForecast} facilities` : "Chronos zero-shot"}
          </span>
          {!isError ? (
            <div className="ml-auto flex items-center gap-1" role="group" aria-label="Forecast window (months ahead)">
              {MONTH_OPTIONS.map((m) => (
                <button
                  key={m}
                  type="button"
                  aria-pressed={months === m}
                  disabled={predicting}
                  onClick={() => setMonths(m)}
                  className={cn(
                    "rounded-md border px-2 py-0.5 text-[11px] font-medium transition-colors",
                    FOCUS_RING,
                    months === m
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-muted-foreground hover:bg-muted",
                    predicting && "cursor-not-allowed opacity-60",
                  )}
                >
                  {m}m
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="relative space-y-4">
        <AnimatePresence>{predicting ? <PredictingOverlay months={months} /> : null}</AnimatePresence>

        {isLoading ? (
          <div className="space-y-3">
            <AiLoadingIndicator label="Forecasting climate hazards across all facilities…" />
            <div className="space-y-2" aria-hidden>
              <div className="h-48 animate-pulse rounded bg-muted" />
              {HAZARD_SERIES.map((h) => (
                <div key={h.key} className="h-5 animate-pulse rounded bg-muted" />
              ))}
            </div>
          </div>
        ) : isError || !agg ? (
          <p className="text-sm text-muted-foreground" role="status">
            Portfolio forecast unavailable. Ensure the AI service is running.
          </p>
        ) : agg.facilitiesForecast === 0 ? (
          <p className="text-sm text-muted-foreground" role="status">
            No facilities could be forecast yet.
          </p>
        ) : (
          <>
            <p className="text-xs text-muted-foreground">Outlook over the next {months} months</p>
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1 text-sm text-muted-foreground">
                Portfolio composite hazard
                <ExplainPopover
                  metric="composite_hazard"
                  value={agg.composite}
                  unit="/100"
                  label="Portfolio composite hazard"
                  context={{
                    heat: agg.byHazard.heat, flood: agg.byHazard.flood,
                    storm: agg.byHazard.storm, drought: agg.byHazard.drought,
                    months, facilities: agg.facilitiesForecast, scope: "portfolio",
                  }}
                />
              </span>
              <span className="text-2xl font-black tracking-tight text-foreground">
                {agg.composite}
                <span className="text-sm font-medium text-muted-foreground">/100</span>
              </span>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              {HAZARD_SERIES.map((h) => {
                const v = agg.byHazard[h.key] ?? 0
                return (
                  <div key={h.key} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1 text-foreground">
                        {h.label}
                        <ExplainPopover
                          metric="climate_hazard"
                          value={v}
                          unit="/100"
                          label={`${h.label} (portfolio)`}
                          context={{ hazard: h.label, months, facilities: agg.facilitiesForecast, scope: "portfolio" }}
                        />
                      </span>
                      <span className="font-medium text-foreground">{v}/100</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full" style={{ width: `${v}%`, backgroundColor: h.color }} />
                    </div>
                  </div>
                )
              })}
            </div>
            {agg.trajectory.length > 0 ? <HazardTrajectoryChart points={agg.trajectory} /> : null}
          </>
        )}
      </CardContent>
    </Card>
  )
}
