"use client"

import { useState } from "react"
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
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
import { ArrowDownRight, ArrowRight, ArrowUpRight, Sparkles, Volume2, Square } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { FOCUS_RING } from "@/lib/dashboard/facility-ui"
import { useStreamingAssistant } from "@/hooks/use-assistant"
import { useSpeech } from "@/hooks/use-speech"
import { TypingCursor } from "@/components/assistant/typing-cursor"
import {
  seriesStats,
  severityBuckets,
  type HazardKey,
  type SeriesPoint,
} from "@/lib/climate/hazard-series"
import { useFacilityPreferences } from "./facility-preferences-provider"

type ChartType = "line" | "bar" | "area" | "pie" | "number"
const CHART_TYPES: ChartType[] = ["line", "bar", "area", "pie", "number"]

const TREND_META = {
  rising: { icon: ArrowUpRight, className: "text-destructive" },
  stable: { icon: ArrowRight, className: "text-muted-foreground" },
  falling: { icon: ArrowDownRight, className: "text-success" },
} as const

const TOOLTIP_STYLE = {
  fontSize: 12,
  borderRadius: 8,
  border: "1px solid var(--color-border)",
  background: "var(--color-card)",
} as const

// Extra left/bottom room so the axis titles are not clipped.
const CHART_MARGIN = { top: 8, right: 16, left: 8, bottom: 22 } as const
const AXIS_LABEL_FILL = "var(--color-muted-foreground)"

/**
 * One hazard, shown in a user-chosen chart type (time-series line, bar, area,
 * severity pie, or a big "digital number"), with an AI "Explain" button that
 * interprets the series in plain language (with read-aloud).
 */
export function HazardChartCard({
  hazardKey,
  title,
  points,
  color,
  live,
  locationLabel,
}: {
  hazardKey: HazardKey
  title: string
  points: SeriesPoint[]
  color: string
  live: boolean
  locationLabel?: string | null
}) {
  const { locale, t } = useFacilityPreferences()
  const [chartType, setChartType] = useState<ChartType>("line")
  const stream = useStreamingAssistant()
  const speech = useSpeech()

  const stats = seriesStats(points)
  const buckets = severityBuckets(points)
  const pieData = [
    { name: t("climateOutlook.severity.low"), value: buckets.low, fill: "var(--color-success)" },
    { name: t("climateOutlook.severity.moderate"), value: buckets.moderate, fill: "var(--color-warning)" },
    { name: t("climateOutlook.severity.high"), value: buckets.high, fill: "var(--color-destructive)" },
  ].filter((d) => d.value > 0)

  function explain() {
    if (!stats || points.length === 0) return
    const from = points[0]?.year
    const to = points[points.length - 1]?.year
    const context =
      `Hazard: ${title}. Index 0-100 (higher = worse exposure). Period ${from} to ${to}. ` +
      `Latest ${stats.latest}, average ${stats.avg}, minimum ${stats.min}, maximum ${stats.max}, overall trend ${stats.trend}.` +
      (locationLabel ? ` Location: ${locationLabel}.` : "")
    stream.run({
      messages: [{ role: "user", content: `Explain the ${title} hazard trend for this facility in plain language.` }],
      context,
      mode: "interpret",
    })
  }

  function renderChart() {
    if (chartType === "number") {
      const TrendIcon = stats ? TREND_META[stats.trend].icon : ArrowRight
      return (
        <div className="flex h-[200px] flex-col justify-center gap-2">
          <div className="flex items-end gap-2">
            <span className="text-5xl font-black tracking-tight text-foreground">{stats?.latest ?? "--"}</span>
            <span className="pb-1 text-sm text-muted-foreground">/100</span>
            {stats ? (
              <span className={cn("mb-1 inline-flex items-center gap-1 text-xs", TREND_META[stats.trend].className)}>
                <TrendIcon className="size-3.5" aria-hidden />
                {t(`climateOutlook.trend.${stats.trend}`)}
              </span>
            ) : null}
          </div>
          <dl className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="rounded-md border border-border p-2">
              <dt className="text-muted-foreground">{t("climateOutlook.stat.avg")}</dt>
              <dd className="text-base font-semibold text-foreground">{stats?.avg ?? "--"}</dd>
            </div>
            <div className="rounded-md border border-border p-2">
              <dt className="text-muted-foreground">{t("climateOutlook.stat.min")}</dt>
              <dd className="text-base font-semibold text-foreground">{stats?.min ?? "--"}</dd>
            </div>
            <div className="rounded-md border border-border p-2">
              <dt className="text-muted-foreground">{t("climateOutlook.stat.max")}</dt>
              <dd className="text-base font-semibold text-foreground">{stats?.max ?? "--"}</dd>
            </div>
          </dl>
        </div>
      )
    }

    if (chartType === "pie") {
      return (
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label>
              {pieData.map((d, i) => (
                <Cell key={i} fill={d.fill} />
              ))}
            </Pie>
            <Tooltip contentStyle={TOOLTIP_STYLE} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
      )
    }

    // NOTE: these must be an ARRAY, not a React Fragment. Recharts detects axes
    // and grid by inspecting its DIRECT children; it does not look inside a
    // Fragment, so wrapping them in <>...</> makes the axes silently disappear.
    // An array is flattened by React, so recharts sees each element directly.
    const axes = [
      <CartesianGrid key="grid" strokeDasharray="3 3" stroke="var(--color-border)" />,
      <XAxis
        key="x"
        dataKey="year"
        tick={{ fontSize: 11 }}
        stroke="var(--color-muted-foreground)"
        label={{
          value: t("climateOutlook.axisYear"),
          position: "insideBottom",
          offset: -8,
          fontSize: 11,
          fill: AXIS_LABEL_FILL,
        }}
      />,
      <YAxis
        key="y"
        domain={[0, 100]}
        tick={{ fontSize: 11 }}
        stroke="var(--color-muted-foreground)"
        label={{
          value: t("climateOutlook.axisIndex"),
          angle: -90,
          position: "insideLeft",
          offset: 16,
          fontSize: 11,
          fill: AXIS_LABEL_FILL,
          style: { textAnchor: "middle" },
        }}
      />,
      <Tooltip key="tt" contentStyle={TOOLTIP_STYLE} />,
    ]

    if (chartType === "bar") {
      return (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={points} margin={CHART_MARGIN}>
            {axes}
            <Bar dataKey="value" name={title} fill={color} radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )
    }

    if (chartType === "area") {
      return (
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={points} margin={CHART_MARGIN}>
            {axes}
            <Area dataKey="value" name={title} stroke={color} fill={color} fillOpacity={0.25} strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      )
    }

    return (
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={points} margin={CHART_MARGIN}>
          {axes}
          <Line type="monotone" dataKey="value" name={title} stroke={color} strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <span className="size-3 rounded-full" style={{ background: color }} aria-hidden />
            {title}
          </CardTitle>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 pt-1" role="group" aria-label={t("climateOutlook.chartType")}>
          {CHART_TYPES.map((ct) => (
            <button
              key={ct}
              type="button"
              aria-pressed={chartType === ct}
              onClick={() => setChartType(ct)}
              className={cn(
                "rounded-md border px-2 py-0.5 text-xs font-medium transition-colors",
                FOCUS_RING,
                chartType === ct
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground hover:bg-muted",
              )}
            >
              {t(`climateOutlook.chart.${ct}`)}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {renderChart()}

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={explain}
            disabled={stream.isStreaming || !stats}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md border border-primary/40 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary disabled:opacity-50",
              FOCUS_RING,
            )}
          >
            <Sparkles className="size-3.5" aria-hidden />
            {stream.isStreaming ? t("climateOutlook.interpreting") : t("climateOutlook.explain")}
          </button>
          {stream.text && !stream.isStreaming && speech.supported ? (
            <button
              type="button"
              onClick={() => (speech.speaking ? speech.stop() : speech.speak(stream.text, locale === "sw" ? "sw-TZ" : "en-US"))}
              className={cn("inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground", FOCUS_RING)}
              aria-label={speech.speaking ? t("toolbar.stop") : t("toolbar.readAloud")}
            >
              {speech.speaking ? <Square className="size-3.5" aria-hidden /> : <Volume2 className="size-3.5" aria-hidden />}
            </button>
          ) : null}
        </div>

        {stream.isError ? (
          <p className="text-xs text-muted-foreground" role="status">
            {t("climateOutlook.explainUnavailable")}
          </p>
        ) : null}
        {stream.text ? (
          <p className="rounded-md bg-muted/50 p-2 text-xs text-foreground" aria-live="polite">
            {stream.text}
            {stream.isStreaming ? <TypingCursor /> : null}
          </p>
        ) : null}
        {!live ? <p className="text-[11px] text-muted-foreground">{t("climateOutlook.offlineFallback")}</p> : null}
      </CardContent>
    </Card>
  )
}
