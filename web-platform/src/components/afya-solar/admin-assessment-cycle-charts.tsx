"use client"

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { MeuSummary } from "@/components/solar/afya-solar-sizing-tool"
import {
  ChartFallback,
  EnergyMixDonutChart,
  ImprovementTimelineChart,
  LoadBreakdownBarChart,
} from "@/components/intelligence/energy-charts"
import { extractClimateScore } from "@/lib/assessment-cycle-overview-metrics"

type ClimateScoreShape = NonNullable<ReturnType<typeof extractClimateScore>>

// climate_score_summaries dimensions are stored as 0-100 capacity scores (CRiPHC model).
function clampPct(v: number | null | undefined) {
  if (v == null || Number.isNaN(Number(v))) return 0
  return Math.min(100, Math.max(0, Math.round(Number(v))))
}

const VIOLET = "#6d28d9"
const VIOLET_LIGHT = "#c4b5fd"

export function AdminEnergyChartSection({
  meu,
  bmiTrend,
}: {
  meu: MeuSummary | null
  bmiTrend: { date: string; value: number }[]
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="border-emerald-100">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Load breakdown</CardTitle>
          <CardDescription className="text-xs">Top equipment by daily kWh (saved MEU)</CardDescription>
        </CardHeader>
        <CardContent>
          <LoadBreakdownBarChart meu={meu} />
        </CardContent>
      </Card>
      <Card className="border-emerald-100">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Energy mix</CardTitle>
          <CardDescription className="text-xs">By device category</CardDescription>
        </CardHeader>
        <CardContent>
          <EnergyMixDonutChart meu={meu} />
        </CardContent>
      </Card>
      <Card className="border-emerald-100 lg:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">BMI trend</CardTitle>
          <CardDescription className="text-xs">Saved points from assessment cycle state</CardDescription>
        </CardHeader>
        <CardContent>
          <ImprovementTimelineChart points={bmiTrend} />
        </CardContent>
      </Card>
    </div>
  )
}

export function AdminClimateChartSection({
  score,
  topRisks,
  evidence,
}: {
  score: ClimateScoreShape | null
  topRisks: Array<Record<string, unknown>>
  evidence: Array<Record<string, unknown>>
}) {
  const radarData = score
    ? [
        { module: "HES", value: clampPct(score.hes) },
        { module: "CSF", value: clampPct(score.csf) },
        { module: "ECPQ", value: clampPct(score.ecpq) },
        { module: "EDC", value: clampPct(score.edc) },
        { module: "RRC", value: clampPct(score.rrc) },
      ]
    : []

  const riskRows = topRisks.map((r) => ({
    name: String(r.title ?? "Risk").length > 22 ? `${String(r.title).slice(0, 20)}…` : String(r.title ?? "Risk"),
    severity: Number(r.severity ?? 0),
  }))

  const typeCounts = new Map<string, number>()
  for (const e of evidence) {
    const t = String((e as { type?: string }).type || "unknown")
    typeCounts.set(t, (typeCounts.get(t) || 0) + 1)
  }
  const pieData = Array.from(typeCounts.entries()).map(([name, value]) => ({ name, value }))

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="border-violet-100">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Module scores</CardTitle>
          <CardDescription className="text-xs">Dimension capacity 0-100 (from climate_score_summaries)</CardDescription>
        </CardHeader>
        <CardContent className="h-[260px]">
          {!score || radarData.every((d) => d.value === 0) ? (
            <ChartFallback message="No module scores persisted for this cycle." />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                <PolarGrid />
                <PolarAngleAxis dataKey="module" tick={{ fontSize: 10 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} />
                <Radar name="Score" dataKey="value" stroke={VIOLET} fill={VIOLET_LIGHT} fillOpacity={0.5} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </RadarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card className="border-violet-100">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Top risks</CardTitle>
          <CardDescription className="text-xs">Ranked drivers (severity)</CardDescription>
        </CardHeader>
        <CardContent className="h-[260px]">
          {riskRows.length === 0 ? (
            <ChartFallback message="No risk drivers stored for this cycle." />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={riskRows} layout="vertical" margin={{ left: 8, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-violet-100" />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 9 }} />
                <Tooltip formatter={(v: number) => [`${v}%`, "Severity"]} />
                <Bar dataKey="severity" radius={[0, 4, 4, 0]}>
                  {riskRows.map((_, i) => (
                    <Cell key={i} fill={i === 0 ? VIOLET : VIOLET_LIGHT} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card className="border-violet-100 lg:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Evidence by type</CardTitle>
          <CardDescription className="text-xs">Counts from evidence_items</CardDescription>
        </CardHeader>
        <CardContent className="h-[240px]">
          {pieData.length === 0 ? (
            <ChartFallback message="No evidence items for this cycle." />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={88}>
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={i % 2 === 0 ? VIOLET : "#8b5cf6"} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
