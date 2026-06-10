"use client"

import * as React from "react"
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts"

import { cn } from "@/lib/utils"
import { FOCUS_RING } from "@/lib/dashboard/facility-ui"

export type ChartKind = "bar" | "pie" | "line" | "area" | "number"

const KIND_LABEL: Record<ChartKind, string> = {
  bar: "Bar",
  pie: "Pie",
  line: "Line",
  area: "Area",
  number: "Numbers",
}

const FALLBACK_COLOR = "#10b981"

const TOOLTIP_STYLE = {
  fontSize: 12,
  borderRadius: 8,
  border: "1px solid var(--color-border)",
  background: "var(--color-card)",
} as const

export type ChartDatum = { label: string; value: number; color?: string }

/**
 * A single dataset rendered in an admin-chosen format (bar / pie / line / area /
 * numbers). Mirrors the facility `HazardChartCard` toggle pattern so the look and
 * keyboard behaviour stay consistent across dashboards. Data logic stays with the
 * caller; this component only switches the presentation.
 */
export function SwitchableChart({
  data,
  kinds,
  defaultKind,
  height = 224,
  layout = "horizontal",
  valueLabel,
  valueSuffix = "",
  format,
  caption,
  summary,
  emptyHint = "No data yet.",
}: {
  data: ChartDatum[]
  kinds: ChartKind[]
  defaultKind?: ChartKind
  height?: number
  /** Bar orientation: "vertical" puts category labels on the Y axis. */
  layout?: "horizontal" | "vertical"
  valueLabel: string
  valueSuffix?: string
  /** Formats values in tooltips / number tiles (e.g. currency). */
  format?: (n: number) => string
  caption?: string
  /** Headline shown above the per-category tiles in the "number" view. */
  summary?: { label: string; value: string }
  emptyHint?: string
}) {
  const [kind, setKind] = React.useState<ChartKind>(defaultKind ?? kinds[0])
  const fmt = React.useCallback(
    (n: number) => (format ? format(n) : `${n}${valueSuffix}`),
    [format, valueSuffix],
  )

  const hasData = data.length > 0 && data.some((d) => d.value > 0 || d.value === 0)

  const empty = (
    <div className="flex items-center justify-center text-sm text-muted-foreground" style={{ height }}>
      {emptyHint}
    </div>
  )

  function renderChart() {
    if (!hasData) return empty

    if (kind === "number") {
      return (
        <div className="flex flex-col justify-center gap-3" style={{ minHeight: height }}>
          {summary && (
            <div className="flex items-end gap-2">
              <span className="text-4xl font-black tracking-tight text-foreground">{summary.value}</span>
              <span className="pb-1.5 text-sm text-muted-foreground">{summary.label}</span>
            </div>
          )}
          <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
            {data.map((d) => (
              <div key={d.label} className="rounded-md border border-border p-2">
                <dt className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                  <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: d.color ?? FALLBACK_COLOR }} />
                  <span className="truncate">{d.label}</span>
                </dt>
                <dd className="mt-0.5 text-base font-semibold tabular-nums text-foreground">{fmt(d.value)}</dd>
              </div>
            ))}
          </dl>
        </div>
      )
    }

    if (kind === "pie") {
      const pieData = data.filter((d) => d.value > 0)
      return (
        <ResponsiveContainer width="100%" height={height}>
          <PieChart>
            <Pie data={pieData} dataKey="value" nameKey="label" cx="50%" cy="50%" innerRadius={48} outerRadius={78} paddingAngle={2}>
              {pieData.map((d, i) => (
                <Cell key={i} fill={d.color ?? FALLBACK_COLOR} />
              ))}
            </Pie>
            <Tooltip formatter={(v: number, n) => [fmt(v), n as string]} contentStyle={TOOLTIP_STYLE} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
      )
    }

    // Axes must be a flat ARRAY (not a Fragment) — recharts only inspects its
    // direct children for axes/grid (see hazard-chart-card.tsx note).
    const vertical = layout === "vertical"
    const axes = [
      <CartesianGrid key="grid" strokeDasharray="3 3" stroke="var(--color-border)" vertical={vertical} horizontal={!vertical} />,
      vertical ? (
        <XAxis key="x" type="number" tick={{ fontSize: 11 }} tickFormatter={(v: number) => fmt(v)} stroke="var(--color-muted-foreground)" />
      ) : (
        <XAxis key="x" dataKey="label" tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
      ),
      vertical ? (
        <YAxis key="y" type="category" dataKey="label" width={92} tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
      ) : (
        <YAxis key="y" tick={{ fontSize: 11 }} tickFormatter={(v: number) => fmt(v)} stroke="var(--color-muted-foreground)" />
      ),
      <Tooltip key="tt" formatter={(v: number) => [fmt(v), valueLabel]} contentStyle={TOOLTIP_STYLE} />,
    ]

    if (kind === "bar") {
      return (
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={data} layout={layout} margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
            {axes}
            <Bar dataKey="value" name={valueLabel} radius={vertical ? [0, 4, 4, 0] : [4, 4, 0, 0]}>
              {data.map((d, i) => (
                <Cell key={i} fill={d.color ?? FALLBACK_COLOR} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )
    }

    if (kind === "area") {
      return (
        <ResponsiveContainer width="100%" height={height}>
          <AreaChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => fmt(v)} stroke="var(--color-muted-foreground)" />
            <Tooltip formatter={(v: number) => [fmt(v), valueLabel]} contentStyle={TOOLTIP_STYLE} />
            <Area type="monotone" dataKey="value" name={valueLabel} stroke={FALLBACK_COLOR} fill={FALLBACK_COLOR} fillOpacity={0.22} strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      )
    }

    // line
    return (
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => fmt(v)} stroke="var(--color-muted-foreground)" />
          <Tooltip formatter={(v: number) => [fmt(v), valueLabel]} contentStyle={TOOLTIP_STYLE} />
          <Line type="monotone" dataKey="value" name={valueLabel} stroke={FALLBACK_COLOR} strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    )
  }

  return (
    <div className="space-y-2">
      {kinds.length > 1 && (
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={`${valueLabel} chart type`}>
          {kinds.map((k) => (
            <button
              key={k}
              type="button"
              aria-pressed={kind === k}
              onClick={() => setKind(k)}
              className={cn(
                "rounded-md border px-2 py-0.5 text-xs font-medium transition-colors",
                FOCUS_RING,
                kind === k
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground hover:bg-muted",
              )}
            >
              {KIND_LABEL[k]}
            </button>
          ))}
        </div>
      )}
      {renderChart()}
      {caption && <p className="text-center text-xs text-muted-foreground">{caption}</p>}
    </div>
  )
}
