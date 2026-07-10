"use client"

import { useCallback, useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts"
import { CloudSun, RefreshCw, Shield, TrendingUp, ShieldAlert } from "lucide-react"
import { cn } from "@/lib/utils"
import { buildSurgeRecommendations } from "@/lib/intelligence/surge-recommendations"

type ClimatePayload = {
  profile: {
    floodRiskScore: number
    heatRiskScore: number
    windRiskScore: number
    rainRiskScore: number
    overallResilienceScore: number
    dataSource: string
  }
  adaptations: {
    id: string
    riskCategory: string
    recommendation: string
    status: string
    implementedAt: string | null
    estimatedGainPoints: number
  }[]
  monthlyTrend: { periodMonth: string; resilienceScore: number; adaptationCompletionPct: number }[]
  completionPct: number
  effectiveness: {
    realizedGain: number
    potentialGain: number
    completedCount: number
    activeCount: number
    observed: { points: number; fromMonth: string; toMonth: string } | null
  }
}

const STATUS_OPTIONS = ["recommended", "planned", "in_progress", "completed", "dismissed"] as const

interface FacilityClimateResilienceDashboardProps {
  facilityId?: string | null
}

export function FacilityClimateResilienceDashboard({ facilityId }: FacilityClimateResilienceDashboardProps) {
  const [data, setData] = useState<ClimatePayload | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!facilityId) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/facility/${facilityId}/climate-resilience`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed to load")
      setData(json.data)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load")
    } finally {
      setLoading(false)
    }
  }, [facilityId])

  useEffect(() => {
    load()
  }, [load])

  const onStatusChange = async (adaptationId: string, status: string) => {
    if (!facilityId) return
    setUpdatingId(adaptationId)
    try {
      const res = await fetch(
        `/api/facility/${facilityId}/climate-resilience/adaptations/${adaptationId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        }
      )
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Update failed")
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed")
    } finally {
      setUpdatingId(null)
    }
  }

  if (!facilityId) {
    return (
      <p className="text-sm text-muted-foreground">Facility context required for climate resilience.</p>
    )
  }

  const radarData = data
    ? [
        { metric: "Flood", value: data.profile.floodRiskScore, fullMark: 100 },
        { metric: "Heat", value: data.profile.heatRiskScore, fullMark: 100 },
        { metric: "Wind", value: data.profile.windRiskScore, fullMark: 100 },
        { metric: "Rain", value: data.profile.rainRiskScore, fullMark: 100 },
      ]
    : []

  const trendChart =
    data?.monthlyTrend.map((m) => ({
      month: m.periodMonth.slice(5),
      score: m.resilienceScore,
      done: m.adaptationCompletionPct,
    })) ?? []

  // Real-hazard-driven pre-positioning actions (from the profile exposure scores).
  const surge = data
    ? buildSurgeRecommendations({
        heat: data.profile.heatRiskScore,
        flood: data.profile.floodRiskScore,
        storm: data.profile.windRiskScore,
        drought: data.profile.rainRiskScore,
      })
    : []

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between gap-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CloudSun className="h-4 w-4" />
          Hazard exposure (0100, higher = more risk). Resilience score reflects mitigations.
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => load()} disabled={loading}>
          <RefreshCw className={cn("h-4 w-4 mr-1", loading && "animate-spin")} />
          Refresh
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {data && (
        <>
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="border-emerald-100 lg:col-span-1">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Shield className="h-4 w-4 text-emerald-600" />
                  Resilience score
                </CardTitle>
                <CardDescription className="text-xs">Higher is better (inverse of unmanaged risk).</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-bold text-emerald-800">{data.profile.overallResilienceScore}</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  <Badge variant="outline">Source: {data.profile.dataSource}</Badge>
                  <Badge variant="outline">Adaptations done: {data.completionPct}%</Badge>
                </div>
              </CardContent>
            </Card>
            <Card className="border-emerald-100 lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Hazard radar</CardTitle>
                <CardDescription className="text-xs">Relative exposure used for adaptation planning (demo-seeded).</CardDescription>
              </CardHeader>
              <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                    <PolarGrid />
                    <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
                    <Radar name="Risk" dataKey="value" stroke="#059669" fill="#34d399" fillOpacity={0.35} />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card className="border-emerald-100">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-600" />
                Adaptation impact
              </CardTitle>
              <CardDescription className="text-xs">
                Estimated points use a documented per-hazard model; observed change reads the real resilience history.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-4">
              <div>
                <p className="text-2xl font-bold text-emerald-800">+{data.effectiveness.realizedGain}</p>
                <p className="text-[11px] text-muted-foreground">
                  est. points realized · {data.effectiveness.completedCount} completed
                </p>
              </div>
              <div>
                <p className="text-2xl font-bold text-indigo-700">+{data.effectiveness.potentialGain}</p>
                <p className="text-[11px] text-muted-foreground">
                  est. points available · {data.effectiveness.activeCount} planned
                </p>
              </div>
              {data.effectiveness.observed ? (
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {data.effectiveness.observed.points >= 0 ? "+" : ""}
                    {data.effectiveness.observed.points}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    observed RCS change (all factors) · {data.effectiveness.observed.fromMonth}→
                    {data.effectiveness.observed.toMonth}
                  </p>
                </div>
              ) : (
                <div className="flex items-center">
                  <p className="text-[11px] text-muted-foreground">
                    Observed change appears once monthly resilience history accrues.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {surge.length > 0 && (
            <Card className="border-amber-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-amber-600" />
                  Preparedness actions
                </CardTitle>
                <CardDescription className="text-xs">
                  Pre-position now for the hazards currently elevated at this facility (real NASA POWER exposure).
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {surge.map((s) => (
                  <div key={s.hazard} className="rounded-lg border border-amber-100 bg-amber-50/40 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm font-medium text-foreground">{s.title.en}</span>
                      <Badge
                        variant="secondary"
                        className={cn(
                          s.severity === "critical"
                            ? "bg-destructive/10 text-destructive"
                            : "bg-amber-100 text-amber-800",
                        )}
                      >
                        {s.severity} · {s.score}/100
                      </Badge>
                    </div>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-muted-foreground">
                      {s.actions.map((a, i) => (
                        <li key={i}>{a.en}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <Card className="border-emerald-100">
            <CardHeader>
              <CardTitle className="text-sm">Resilience trend</CardTitle>
              <CardDescription className="text-xs">
                Track whether completed adaptations correlate with higher resilience scores over time.
              </CardDescription>
            </CardHeader>
            <CardContent className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendChart} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="score" name="Resilience" stroke="#059669" strokeWidth={2} dot />
                  <Line type="monotone" dataKey="done" name="% adaptations done" stroke="#6366f1" strokeWidth={2} dot />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="border-emerald-100">
            <CardHeader>
              <CardTitle className="text-sm">Adaptation plan</CardTitle>
              <CardDescription className="text-xs">
                Recommendations from hazard profile. Update status as your team implements measures.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {data.adaptations.map((a) => (
                <div key={a.id} className="rounded-lg border border-emerald-50 bg-white p-3 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="capitalize">
                        {a.riskCategory.replace("_", " ")}
                      </Badge>
                      <Badge variant="outline" className="text-[11px] text-emerald-700">
                        {a.status === "completed" ? "+" : "up to +"}
                        {a.estimatedGainPoints} pts est.
                      </Badge>
                    </div>
                    <Select
                      value={
                        STATUS_OPTIONS.includes(a.status as (typeof STATUS_OPTIONS)[number])
                          ? a.status
                          : "recommended"
                      }
                      onValueChange={(v) => onStatusChange(a.id, v)}
                      disabled={updatingId === a.id}
                    >
                      <SelectTrigger className="w-[160px] h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map((s) => (
                          <SelectItem key={s} value={s} className="text-xs capitalize">
                            {s.replace("_", " ")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="text-sm text-muted-foreground">{a.recommendation}</p>
                  {a.implementedAt && (
                    <p className="text-[11px] text-emerald-700">Completed: {new Date(a.implementedAt).toLocaleString()}</p>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
