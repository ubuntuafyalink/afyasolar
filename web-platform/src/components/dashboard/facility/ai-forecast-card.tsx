"use client"

import { useState } from "react"
import { Sparkles, ChevronDown, ChevronRight } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AiLoadingIndicator } from "@/components/ui/ai-loading"
import { cn } from "@/lib/utils"
import { FOCUS_RING } from "@/lib/dashboard/facility-ui"
import { useAiForecast } from "@/hooks/use-ai-forecast"
import type { AiForecastPoint } from "@/lib/climate/ai-forecast-service"
import {
  HAZARD_SERIES,
  HazardTrajectoryChart,
  VariableForecastChart,
  YieldChart,
} from "./ai-forecast-charts"
import { ExplainPopover, type ExplainDriver } from "./explain-popover"

const MONTH_OPTIONS = [3, 6, 12] as const

// The forecast variable that drives each hazard index, for the explainer.
const HAZARD_DRIVER: Record<string, { variable: string; label: string; unit: string; agg: "mean" | "peak" }> = {
  heat: { variable: "T2M_MAX", label: "Max temperature", unit: "°C", agg: "mean" },
  flood: { variable: "PRECTOTCORR", label: "Rainfall peak", unit: "mm", agg: "peak" },
  storm: { variable: "WS10M", label: "Wind speed peak", unit: "m/s", agg: "peak" },
  drought: { variable: "PRECTOTCORR", label: "Rainfall", unit: "mm", agg: "mean" },
}

function summarizeDriver(points: AiForecastPoint[] | undefined, agg: "mean" | "peak", months: number): number | null {
  const vals = (points ?? []).slice(0, months).map((p) => p.mean).filter((x): x is number => x != null)
  if (vals.length === 0) return null
  const v = agg === "peak" ? Math.max(...vals) : vals.reduce((s, x) => s + x, 0) / vals.length
  return Math.round(v * 10) / 10
}

const VARIABLES = [
  { key: "T2M_MAX", title: "Max temperature", unit: "°C", color: "var(--color-chart-4)" },
  { key: "PRECTOTCORR", title: "Rainfall", unit: "mm", color: "var(--color-chart-3)" },
  { key: "WS10M", title: "Wind speed", unit: "m/s", color: "var(--color-chart-5)" },
  { key: "ALLSKY_SFC_SW_DWN", title: "Solar irradiance", unit: "kWh/m²/day", color: "var(--color-chart-1)" },
] as const

/**
 * AI Climate Forecast card: forward-looking hazard outlook from the AI service
 * (Chronos zero-shot on NASA POWER), served via /api/ai/forecast. Interactive:
 * a months-ahead selector, a hazard-trajectory chart, per-variable forecasts with
 * confidence bands, and a solar-yield chart. Re-forecasts when coords change.
 */
export function AiForecastCard({
  lat,
  lon,
  systemKw = 5,
}: {
  lat: number
  lon: number
  systemKw?: number
}) {
  const [months, setMonths] = useState<number>(12)
  const [showVars, setShowVars] = useState(false)
  const { data, isLoading, isError, error } = useAiForecast({
    lat,
    lon,
    horizon: "monthly",
    systemKw,
  })

  const modelNotReady = (error as Error | undefined)?.message?.toLowerCase().includes("model")
  const trajectory = (data?.hazards_monthly ?? []).slice(0, months)

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="size-4 text-primary" aria-hidden />
            AI Climate Forecast
          </CardTitle>
          <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
            Chronos zero-shot
          </span>
          {data ? (
            <div className="ml-auto flex items-center gap-1" role="group" aria-label="Months ahead">
              {MONTH_OPTIONS.map((m) => (
                <button
                  key={m}
                  type="button"
                  aria-pressed={months === m}
                  onClick={() => setMonths(m)}
                  className={cn(
                    "rounded-md border px-2 py-0.5 text-[11px] font-medium transition-colors",
                    FOCUS_RING,
                    months === m
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-muted-foreground hover:bg-muted",
                  )}
                >
                  {m}m
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="space-y-3">
            <AiLoadingIndicator label="Forecasting climate & solar yield…" />
            <div className="space-y-2" aria-hidden>
              <div className="h-48 animate-pulse rounded bg-muted" />
              {HAZARD_SERIES.map((h) => (
                <div key={h.key} className="h-5 animate-pulse rounded bg-muted" />
              ))}
            </div>
          </div>
        ) : isError ? (
          <p className="text-sm text-muted-foreground" role="status">
            {modelNotReady
              ? "Forecast model is warming up — try again in a moment."
              : "Forecast unavailable. Make sure the AI service is running (uvicorn app.main:app)."}
          </p>
        ) : data ? (
          <>
            <p className="text-xs text-muted-foreground">
              Next {months} months ·{" "}
              {data.distance_km != null
                ? `nearest station ${data.distance_km} km away`
                : `station ${data.location_id}`}
            </p>

            {/* Composite headline + hazard summary bars */}
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1 text-sm text-muted-foreground">
                Composite hazard
                <ExplainPopover
                  metric="composite_hazard"
                  value={data.hazards.composite}
                  unit="/100"
                  label="Composite hazard"
                  context={{
                    heat: data.hazards.heat, flood: data.hazards.flood,
                    storm: data.hazards.storm, drought: data.hazards.drought, months,
                  }}
                />
              </span>
              <span className="text-2xl font-black tracking-tight text-foreground">
                {data.hazards.composite}
                <span className="text-sm font-medium text-muted-foreground">/100</span>
              </span>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              {HAZARD_SERIES.map((h) => {
                const v = data.hazards[h.key] ?? 0
                const d = HAZARD_DRIVER[h.key]
                const driverVal = d ? summarizeDriver(data.forecast_raw[d.variable], d.agg, months) : null
                const drivers: ExplainDriver[] = d && driverVal != null
                  ? [{ label: d.label, value: `${driverVal} ${d.unit}` }] : []
                return (
                  <div key={h.key} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1 text-foreground">
                        {h.label}
                        <ExplainPopover
                          metric="climate_hazard"
                          value={v}
                          unit="/100"
                          label={h.label}
                          drivers={drivers}
                          context={{ hazard: h.label, driverVariable: d?.label ?? h.label, months }}
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

            {/* Hazard trajectory over the horizon */}
            {trajectory.length > 0 ? <HazardTrajectoryChart points={trajectory} /> : null}

            {/* Solar yield */}
            {data.yield ? (
              <div className="space-y-1">
                <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                  Solar yield
                  <ExplainPopover
                    metric="solar_yield"
                    value={data.yield.mean_daily_kwh}
                    unit=" kWh/day"
                    label="Solar yield"
                    context={{ mean_daily_kwh: data.yield.mean_daily_kwh, system_kw: data.yield.system_kw, months }}
                  />
                </div>
                <YieldChart
                  yieldData={{
                    ...data.yield,
                    generation_kwh_per_step: data.yield.generation_kwh_per_step.slice(0, months),
                  }}
                />
              </div>
            ) : null}

            {/* Collapsible per-variable forecasts with confidence bands */}
            <div>
              <button
                type="button"
                onClick={() => setShowVars((s) => !s)}
                aria-expanded={showVars}
                className={cn(
                  "inline-flex items-center gap-1 text-xs font-medium text-primary",
                  FOCUS_RING,
                )}
              >
                {showVars ? <ChevronDown className="size-3.5" aria-hidden /> : <ChevronRight className="size-3.5" aria-hidden />}
                {showVars ? "Hide variable forecasts" : "Show variable forecasts"}
              </button>
              {showVars ? (
                <div className="mt-2 grid gap-4 sm:grid-cols-2">
                  {VARIABLES.map((v) => {
                    const pts = (data.forecast_raw[v.key] ?? []).slice(0, months)
                    if (pts.length === 0) return null
                    return (
                      <VariableForecastChart
                        key={v.key}
                        title={v.title}
                        unit={v.unit}
                        color={v.color}
                        points={pts}
                      />
                    )
                  })}
                </div>
              ) : null}
            </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  )
}
