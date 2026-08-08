"use client"

import { useState } from "react"
import {
  ResponsiveContainer,
  ComposedChart,
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts"

import { cn } from "@/lib/utils"
import { FOCUS_RING } from "@/lib/dashboard/facility-ui"
import type {
  AiForecastPoint,
  AiYield,
  HazardTrajectoryPoint,
} from "@/lib/climate/ai-forecast-service"

const TOOLTIP_STYLE = {
  fontSize: 12,
  borderRadius: 8,
  border: "1px solid var(--color-border)",
  background: "var(--color-card)",
} as const

const CHART_MARGIN = { top: 8, right: 12, left: 4, bottom: 4 } as const

export const HAZARD_SERIES = [
  { key: "heat", label: "Heat", color: "var(--color-chart-4)" },
  { key: "flood", label: "Flood", color: "var(--color-chart-3)" },
  { key: "storm", label: "Storm", color: "var(--color-chart-5)" },
  { key: "drought", label: "Drought", color: "var(--color-chart-2)" },
] as const

type ChartType = "line" | "area" | "bar"

function monthLabel(ts: string): string {
  const d = new Date(ts)
  return Number.isNaN(d.getTime())
    ? ts
    : d.toLocaleDateString(undefined, { month: "short", year: "2-digit" })
}

/** Small line/area/bar toggle (the app's aria-pressed button-group pattern). */
export function ChartTypeToggle({
  value,
  onChange,
  types = ["line", "area", "bar"],
}: {
  value: ChartType
  onChange: (t: ChartType) => void
  types?: ChartType[]
}) {
  return (
    <div className="flex items-center gap-1" role="group" aria-label="Chart type">
      {types.map((ct) => (
        <button
          key={ct}
          type="button"
          aria-pressed={value === ct}
          onClick={() => onChange(ct)}
          className={cn(
            "rounded-md border px-2 py-0.5 text-[11px] font-medium capitalize transition-colors",
            FOCUS_RING,
            value === ct
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border text-muted-foreground hover:bg-muted",
          )}
        >
          {ct}
        </button>
      ))}
    </div>
  )
}

const AXES = [
  <CartesianGrid key="g" strokeDasharray="3 3" stroke="var(--color-border)" />,
  <XAxis key="x" dataKey="label" tick={{ fontSize: 10 }} stroke="var(--color-muted-foreground)" />,
  <Tooltip key="t" contentStyle={TOOLTIP_STYLE} />,
]

/**
 * One forecast variable (temperature, rain, wind, irradiance) with a mean line
 * and a shaded q10-q90 confidence band (recharts stacked-Area trick: a
 * transparent base at q10 + a shaded band of height q90-q10).
 */
export function VariableForecastChart({
  title,
  unit,
  color,
  points,
}: {
  title: string
  unit?: string
  color: string
  points: AiForecastPoint[]
}) {
  const [type, setType] = useState<ChartType>("line")
  const data = points.map((p) => {
    const q10 = p["q0.1"]
    const q90 = p["q0.9"]
    return {
      label: monthLabel(p.timestamp),
      mean: p.mean ?? null,
      q10: q10 ?? null,
      band: q10 != null && q90 != null ? q90 - q10 : null,
    }
  })
  const hasBand = data.some((d) => d.band != null)

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-foreground">
          {title}
          {unit ? <span className="ml-1 text-muted-foreground">({unit})</span> : null}
        </p>
        <ChartTypeToggle value={type} onChange={setType} />
      </div>
      <ResponsiveContainer width="100%" height={160}>
        {type === "bar" ? (
          <BarChart data={data} margin={CHART_MARGIN}>
            {AXES}
            <YAxis tick={{ fontSize: 10 }} stroke="var(--color-muted-foreground)" width={36} />
            <Bar dataKey="mean" name={title} fill={color} radius={[2, 2, 0, 0]} />
          </BarChart>
        ) : (
          <ComposedChart data={data} margin={CHART_MARGIN}>
            {AXES}
            <YAxis tick={{ fontSize: 10 }} stroke="var(--color-muted-foreground)" width={36} />
            {hasBand ? (
              <>
                <Area dataKey="q10" stackId="band" stroke="none" fill="transparent"
                  fillOpacity={0} isAnimationActive={false} legendType="none" />
                <Area dataKey="band" stackId="band" name="80% range" stroke="none"
                  fill={color} fillOpacity={0.15} isAnimationActive={false} />
              </>
            ) : null}
            {type === "area" ? (
              <Area dataKey="mean" name={title} stroke={color} fill={color}
                fillOpacity={0.2} strokeWidth={2} isAnimationActive={false} />
            ) : (
              <Line type="monotone" dataKey="mean" name={title} stroke={color}
                strokeWidth={2} dot={false} isAnimationActive={false} />
            )}
          </ComposedChart>
        )}
      </ResponsiveContainer>
    </div>
  )
}

/** The four hazard indices over the forecast horizon (0..100). */
export function HazardTrajectoryChart({ points }: { points: HazardTrajectoryPoint[] }) {
  const [type, setType] = useState<ChartType>("line")
  const data = points.map((p) => ({
    label: monthLabel(p.timestamp),
    heat: p.heat,
    flood: p.flood,
    storm: p.storm,
    drought: p.drought,
  }))
  const yAxis = (
    <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} stroke="var(--color-muted-foreground)" width={28} />
  )

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-foreground">Hazard outlook (0-100)</p>
        <ChartTypeToggle value={type} onChange={setType} />
      </div>
      <ResponsiveContainer width="100%" height={200}>
        {type === "bar" ? (
          <BarChart data={data} margin={CHART_MARGIN}>
            {AXES}
            {yAxis}
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {HAZARD_SERIES.map((h) => (
              <Bar key={h.key} dataKey={h.key} name={h.label} fill={h.color} />
            ))}
          </BarChart>
        ) : type === "area" ? (
          <AreaChart data={data} margin={CHART_MARGIN}>
            {AXES}
            {yAxis}
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {HAZARD_SERIES.map((h) => (
              <Area key={h.key} dataKey={h.key} name={h.label} stroke={h.color}
                fill={h.color} fillOpacity={0.15} isAnimationActive={false} />
            ))}
          </AreaChart>
        ) : (
          <LineChart data={data} margin={CHART_MARGIN}>
            {AXES}
            {yAxis}
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {HAZARD_SERIES.map((h) => (
              <Line key={h.key} type="monotone" dataKey={h.key} name={h.label}
                stroke={h.color} strokeWidth={2} dot={false} isAnimationActive={false} />
            ))}
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  )
}

/** Expected solar generation per forecast step, from the irradiance forecast. */
export function YieldChart({ yieldData }: { yieldData: AiYield }) {
  const [type, setType] = useState<ChartType>("bar")
  const data = yieldData.generation_kwh_per_step.map((v, i) => ({
    label: `M${i + 1}`,
    kwh: Math.round(v * 10) / 10,
  }))

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-foreground">
          Solar yield <span className="text-muted-foreground">(kWh/day, {yieldData.system_kw} kW)</span>
        </p>
        <ChartTypeToggle value={type} onChange={setType} types={["bar", "area", "line"]} />
      </div>
      <ResponsiveContainer width="100%" height={140}>
        {type === "line" ? (
          <LineChart data={data} margin={CHART_MARGIN}>
            {AXES}
            <YAxis tick={{ fontSize: 10 }} stroke="var(--color-muted-foreground)" width={32} />
            <Line type="monotone" dataKey="kwh" name="kWh/day" stroke="var(--color-chart-1)"
              strokeWidth={2} dot={false} isAnimationActive={false} />
          </LineChart>
        ) : type === "area" ? (
          <AreaChart data={data} margin={CHART_MARGIN}>
            {AXES}
            <YAxis tick={{ fontSize: 10 }} stroke="var(--color-muted-foreground)" width={32} />
            <Area dataKey="kwh" name="kWh/day" stroke="var(--color-chart-1)"
              fill="var(--color-chart-1)" fillOpacity={0.2} isAnimationActive={false} />
          </AreaChart>
        ) : (
          <BarChart data={data} margin={CHART_MARGIN}>
            {AXES}
            <YAxis tick={{ fontSize: 10 }} stroke="var(--color-muted-foreground)" width={32} />
            <Bar dataKey="kwh" name="kWh/day" fill="var(--color-chart-1)" radius={[2, 2, 0, 0]} />
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  )
}
