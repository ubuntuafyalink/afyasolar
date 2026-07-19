"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { m } from "framer-motion"
import { format } from "date-fns"
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  RadialBarChart,
  RadialBar,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts"
import {
  Building2,
  Users,
  Zap,
  DollarSign,
  AlertTriangle,
  ShieldCheck,
  Leaf,
  CreditCard,
  Satellite,
  Thermometer,
  CloudRain,
  Wind,
  Sun,
  RefreshCcw,
} from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { StatCard } from "@/components/ui/stat-card"
import { AnimatedNumber } from "@/components/ui/animated-number"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { LazyMotionProvider } from "@/components/motion/lazy-motion-provider"
import { fadeInUp, scaleIn, staggerContainer } from "@/components/motion/variants"
import { SwitchableChart, type ChartDatum } from "@/components/admin/intelligence/switchable-chart"
import { cn, formatCurrency } from "@/lib/utils"
import { useAdminPortfolio } from "@/hooks/use-admin-portfolio"
import { useAdminPortfolioClimate } from "@/hooks/use-admin-portfolio-climate"
import { useAdminCarbonCredits } from "@/hooks/use-admin-carbon-credits"
import { useAfyaSolarAdminFinancialSummary } from "@/hooks/use-admin-portfolio-billing"
import { useNasaPower } from "@/hooks/use-nasa-power"
import { summarize, byRegion } from "@/lib/dashboard/admin-portfolio-real"
import {
  resolveCoords,
  rangeForPreset,
  projectCvi,
  toSolarResource,
  NASA_POWER_PARAMETERS,
  SOLAR_PARAMETERS,
} from "@/lib/climate/nasa-power"
import type { PortfolioFacility } from "@/lib/dashboard/admin-portfolio-types"

type ActivityRange = "weekly" | "monthly" | "all" | "all-time"

const HAZARDS = [
  { key: "heat", label: "Heat", color: "#ef4444" },
  { key: "flood", label: "Flood", color: "#3b82f6" },
  { key: "drought", label: "Drought", color: "#f59e0b" },
  { key: "storm", label: "Storm", color: "#8b5cf6" },
] as const

const TIER_COLOR: Record<string, string> = {
  Resilient: "#10b981",
  Developing: "#3b82f6",
  "At risk": "#f59e0b",
  Critical: "#ef4444",
}

const TOOLTIP_STYLE = {
  fontSize: 12,
  borderRadius: 8,
  border: "1px solid var(--color-border)",
  background: "var(--color-card)",
} as const

const r0 = (n: number | null | undefined) => (n == null ? "—" : Math.round(n).toString())

function cviColor(v: number): string {
  if (v >= 66) return "#ef4444"
  if (v >= 40) return "#f59e0b"
  return "#10b981"
}

function fmtNasaDate(d?: string): string {
  if (!d || d.length !== 8) return "—"
  const y = Number(d.slice(0, 4))
  const mo = Number(d.slice(4, 6)) - 1
  const day = Number(d.slice(6, 8))
  const dt = new Date(y, mo, day)
  return Number.isNaN(dt.getTime()) ? "—" : dt.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
}

function mostCommonRegion(facilities: PortfolioFacility[]): string | undefined {
  const counts = new Map<string, number>()
  for (const f of facilities) {
    if (!f.region) continue
    counts.set(f.region, (counts.get(f.region) ?? 0) + 1)
  }
  let best: string | undefined
  let bestN = 0
  for (const [region, n] of counts) if (n > bestN) { best = region; bestN = n }
  return best
}

// --- small section helpers ---------------------------------------------------

function ChartCard({ title, caption, children }: { title: string; caption?: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        {caption ? <CardDescription>{caption}</CardDescription> : null}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

function TodayTile({ icon, label, value, unit, color }: { icon: React.ReactNode; label: string; value: number | null; unit: string; color: string }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span style={{ color }}>{icon}</span>
        {label}
      </div>
      <div className="mt-1 text-xl font-bold text-foreground">
        {value == null ? "—" : <AnimatedNumber value={value} decimals={1} suffix={` ${unit}`} />}
      </div>
    </div>
  )
}

// --- main --------------------------------------------------------------------

export function AdminOverview() {
  const [activityRange, setActivityRange] = React.useState<ActivityRange>("monthly")

  // Operational snapshot.
  const overview = useQuery({
    queryKey: ["admin-overview"],
    queryFn: async () => {
      const res = await fetch("/api/admin/overview")
      if (!res.ok) throw new Error("Failed to load overview")
      return res.json() as Promise<{
        asOf: string
        kpis: {
          facilitiesTotal: number; facilitiesActive: number
          usersTotal: number; usersFacility: number; usersAdmin: number
          devicesTotal: number; devicesOnline: number
          activeAlerts: number; criticalAlerts: number
          revenueTotalCompleted: number; revenue30dCompleted: number
          transactions30d: { total: number; completed: number; failed: number; pending: number }
        }
      }>
    },
    refetchInterval: 15000,
  })
  const kpis = overview.data?.kpis

  const userActivity = useQuery({
    queryKey: ["admin-activity", "users", activityRange],
    queryFn: async () => {
      const res = await fetch(`/api/admin/activity?scope=users&range=${activityRange}`)
      if (!res.ok) throw new Error("Failed to load user activity")
      return res.json() as Promise<{ rows: Array<Record<string, unknown>> }>
    },
    refetchInterval: 15000,
  })
  const facilityActivity = useQuery({
    queryKey: ["admin-activity", "facilities", activityRange],
    queryFn: async () => {
      const res = await fetch(`/api/admin/activity?scope=facilities&range=${activityRange}`)
      if (!res.ok) throw new Error("Failed to load facility activity")
      return res.json() as Promise<{ rows: Array<Record<string, unknown>> }>
    },
    refetchInterval: 15000,
  })
  const activeSubs = useQuery({
    queryKey: ["admin-active-subs", "afya-solar"],
    queryFn: async () => {
      const res = await fetch(`/api/admin/subscriptions/active?service=afya-solar`)
      if (!res.ok) throw new Error("Failed to load active subscriptions")
      return res.json() as Promise<{ success: boolean; data: Array<Record<string, unknown>> }>
    },
    refetchInterval: 30000,
  })

  const { facilities } = useAdminPortfolio()
  const climateQ = useAdminPortfolioClimate()
  const aggregate = climateQ.data?.aggregate ?? null
  const carbon = useAdminCarbonCredits()
  const financial = useAfyaSolarAdminFinancialSummary("30d")

  const summary = React.useMemo(() => summarize(facilities), [facilities])

  // --- NASA today (representative coordinate) -------------------------------
  const region = React.useMemo(() => mostCommonRegion(facilities), [facilities])
  const coords = React.useMemo(() => resolveCoords({ region }), [region])
  const range = React.useMemo(() => rangeForPreset("1y"), [])
  const nasa = useNasaPower({
    lat: coords.lat,
    lon: coords.lon,
    temporal: range.temporal,
    start: range.start,
    end: range.end,
    parameters: [...NASA_POWER_PARAMETERS, ...SOLAR_PARAMETERS],
  })
  const today = React.useMemo(() => {
    const series = nasa.data?.series
    const last = (k: string) => {
      const arr = series?.[k] ?? []
      return arr.length ? arr[arr.length - 1] : undefined
    }
    const t = last("T2M_MAX")
    return {
      date: t?.date,
      temp: t?.value ?? null,
      precip: last("PRECTOTCORR")?.value ?? null,
      wind: last("WS10M")?.value ?? null,
      solar: last("ALLSKY_SFC_SW_DWN")?.value ?? null,
    }
  }, [nasa.data])
  const sky = nasa.data ? toSolarResource(nasa.data)?.sky : null

  // --- chart datasets -------------------------------------------------------
  const hazardRadar = React.useMemo(
    () => HAZARDS.map((h) => ({ metric: h.label, value: Math.round((aggregate?.byHazard as Record<string, number> | undefined)?.[h.key] ?? 0) })),
    [aggregate],
  )
  const cvi = aggregate?.composite ?? 0
  const cvi2030 = aggregate ? Math.round(projectCvi(aggregate, 2030).composite) : 0
  const cvi2050 = aggregate ? Math.round(projectCvi(aggregate, 2050).composite) : 0

  const tierData = React.useMemo<ChartDatum[]>(
    () => (["Resilient", "Developing", "At risk", "Critical"] as const).map((t) => ({ label: t, value: summary.tierCounts[t], color: TIER_COLOR[t] })),
    [summary],
  )
  const regionRcs = React.useMemo<ChartDatum[]>(
    () => byRegion(facilities).filter((g) => g.avgRcs != null).map((g) => ({ label: g.region, value: g.avgRcs as number, color: "#3b82f6" })),
    [facilities],
  )
  const coverage = React.useMemo<ChartDatum[]>(
    () => [
      { label: "Assessed", value: summary.assessed, color: "#10b981" },
      { label: "Not assessed", value: summary.facilities - summary.assessed, color: "#94a3b8" },
    ],
    [summary],
  )
  const transactionsData = React.useMemo<ChartDatum[]>(() => {
    const t = kpis?.transactions30d
    return [
      { label: "Completed", value: t?.completed ?? 0, color: "#10b981" },
      { label: "Pending", value: t?.pending ?? 0, color: "#f59e0b" },
      { label: "Failed", value: t?.failed ?? 0, color: "#ef4444" },
    ]
  }, [kpis])
  const deviceData = React.useMemo<ChartDatum[]>(() => {
    const online = kpis?.devicesOnline ?? 0
    const total = kpis?.devicesTotal ?? 0
    return [
      { label: "Online", value: online, color: "#10b981" },
      { label: "Offline", value: Math.max(0, total - online), color: "#94a3b8" },
    ]
  }, [kpis])

  const energyTotals = React.useMemo(() => {
    const sized = facilities.filter((f) => f.energy)
    const sum = (pick: (f: PortfolioFacility) => number | null | undefined) => sized.reduce((s, f) => s + (pick(f) ?? 0), 0)
    const eff = facilities.map((f) => f.energyBmiPercent).filter((v): v is number => v != null)
    return {
      solarKw: sum((f) => f.energy?.solarArraySize),
      savings: sum((f) => f.energy?.annualSavings),
      avgBmi: eff.length ? Math.round(eff.reduce((s, v) => s + v, 0) / eff.length) : null,
    }
  }, [facilities])

  const paymentSuccess = financial.data?.paymentSuccessRate ?? 0

  return (
    <LazyMotionProvider>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">System overview</h2>
            <p className="mt-1 text-sm text-muted-foreground">Live operational, climate and financial analytics — auto-refreshes every 15s.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => overview.refetch()} disabled={overview.isFetching}>
              <RefreshCcw className={cn("mr-1 h-4 w-4", overview.isFetching && "animate-spin")} />
              Refresh
            </Button>
            {overview.data?.asOf && (
              <Badge variant="secondary" className="text-xs">Updated {format(new Date(overview.data.asOf), "HH:mm:ss")}</Badge>
            )}
          </div>
        </div>

        {/* KPI band */}
        <m.div variants={staggerContainer} initial="hidden" animate="show" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <m.div variants={scaleIn}><StatCard title="Facilities" meta={`${kpis?.facilitiesActive ?? 0} active`} icon={<Building2 />} accent="primary" value={<AnimatedNumber value={kpis?.facilitiesTotal ?? 0} />} /></m.div>
          <m.div variants={scaleIn}><StatCard title="Users" meta={`${kpis?.usersFacility ?? 0} facility · ${kpis?.usersAdmin ?? 0} admin`} icon={<Users />} accent="success" value={<AnimatedNumber value={kpis?.usersTotal ?? 0} />} /></m.div>
          <m.div variants={scaleIn}><StatCard title="Devices online" meta={`of ${kpis?.devicesTotal ?? 0}`} icon={<Zap />} accent="primary" value={<AnimatedNumber value={kpis?.devicesOnline ?? 0} />} /></m.div>
          <m.div variants={scaleIn}><StatCard title="Revenue (30d)" meta={`${formatCurrency(kpis?.revenueTotalCompleted ?? 0)} all-time`} icon={<DollarSign />} accent="solar" value={<AnimatedNumber value={kpis?.revenue30dCompleted ?? 0} prefix="TSh " />} /></m.div>
          <m.div variants={scaleIn}><StatCard title="Active alerts" meta={`${kpis?.criticalAlerts ?? 0} critical`} icon={<AlertTriangle />} accent={(kpis?.criticalAlerts ?? 0) > 0 ? "destructive" : (kpis?.activeAlerts ?? 0) > 0 ? "warning" : "muted"} value={<AnimatedNumber value={kpis?.activeAlerts ?? 0} />} /></m.div>
          <m.div variants={scaleIn}><StatCard title="Avg resilience (RCS)" meta={`${summary.assessed}/${summary.facilities} assessed`} icon={<ShieldCheck />} accent="primary" value={summary.avgRcs != null ? <AnimatedNumber value={summary.avgRcs} /> : "—"} /></m.div>
          <m.div variants={scaleIn}><StatCard title="CO₂ avoided" meta="Carbon credits" icon={<Leaf />} accent="success" value={<AnimatedNumber value={(carbon.data?.co2SavedKg ?? 0) / 1000} decimals={1} suffix=" t" />} /></m.div>
          <m.div variants={scaleIn}><StatCard title="Active subscriptions" meta="Afya Solar" icon={<CreditCard />} accent="primary" value={<AnimatedNumber value={financial.data?.activeSubscriptions ?? 0} />} /></m.div>
        </m.div>

        {/* NASA climate today */}
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Satellite className="size-4 text-primary" aria-hidden /> Climate conditions today
            </h3>
            <Badge variant="secondary" className="gap-1 text-xs">
              NASA POWER · as of {fmtNasaDate(today.date)}{region ? ` · ${region}` : ""}
            </Badge>
          </div>

          <m.div variants={fadeInUp} initial="hidden" animate="show" className="grid gap-3 lg:grid-cols-4">
            {nasa.isLoading ? (
              Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)
            ) : (
              <>
                <TodayTile icon={<Thermometer className="size-4" />} label="Max temperature" value={today.temp} unit="°C" color="#ef4444" />
                <TodayTile icon={<CloudRain className="size-4" />} label="Precipitation" value={today.precip} unit="mm" color="#3b82f6" />
                <TodayTile icon={<Wind className="size-4" />} label="Wind speed" value={today.wind} unit="m/s" color="#8b5cf6" />
                <TodayTile icon={<Sun className="size-4" />} label={`Solar${sky ? ` · ${sky}` : ""}`} value={today.solar} unit="kWh/m²" color="#f59e0b" />
              </>
            )}
          </m.div>

          <m.div variants={fadeInUp} initial="hidden" animate="show" className="grid gap-3 lg:grid-cols-3">
            <ChartCard title="Hazard exposure" caption="Portfolio average, 0–100 (higher = worse)">
              <ResponsiveContainer width="100%" height={240}>
                <RadarChart data={hazardRadar} cx="50%" cy="50%" outerRadius="70%">
                  <PolarGrid stroke="var(--color-border)" />
                  <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9 }} />
                  <Radar name="Exposure" dataKey="value" stroke="#16a34a" fill="#22c55e" fillOpacity={0.35} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                </RadarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Climate Vulnerability Index" caption="Composite 0–100, with projection">
              <div className="relative">
                <ResponsiveContainer width="100%" height={200}>
                  <RadialBarChart cx="50%" cy="70%" innerRadius="70%" outerRadius="110%" startAngle={180} endAngle={0} data={[{ name: "CVI", value: cvi, fill: cviColor(cvi) }]}>
                    <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                    <RadialBar dataKey="value" cornerRadius={8} background={{ fill: "var(--color-muted)" }} />
                  </RadialBarChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-x-0 bottom-8 text-center">
                  <div className="text-3xl font-black text-foreground">{r0(cvi)}</div>
                  <div className="text-xs text-muted-foreground">composite CVI</div>
                </div>
              </div>
              <div className="mt-1 flex items-center justify-center gap-2 text-xs">
                <Badge variant="outline">2030: {cvi2030}</Badge>
                <Badge variant="outline">2050: {cvi2050}</Badge>
              </div>
            </ChartCard>

            <ChartCard title="Hazard trend (NASA, by year)" caption="Portfolio-weighted indices">
              {aggregate?.trend?.length ? (
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={aggregate.trend} margin={{ top: 8, right: 12, bottom: 0, left: -16 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    {HAZARDS.map((h) => (
                      <Line key={h.key} type="monotone" dataKey={h.key} name={h.label} stroke={h.color} strokeWidth={2} dot={false} />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-56 items-center justify-center text-sm text-muted-foreground">{climateQ.isLoading ? "Loading NASA climate…" : "No climate data yet."}</div>
              )}
            </ChartCard>
          </m.div>
        </section>

        {/* Resilience & energy */}
        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Resilience &amp; energy</h3>
          <m.div variants={fadeInUp} initial="hidden" animate="show" className="grid gap-3 lg:grid-cols-3">
            <ChartCard title="Resilience tiers"><SwitchableChart data={tierData} kinds={["pie", "bar", "number"]} valueLabel="Facilities" caption="Distribution across tiers" emptyHint="No assessments yet." /></ChartCard>
            <ChartCard title="Avg RCS by region"><SwitchableChart data={regionRcs} kinds={["bar", "line", "number"]} layout="vertical" valueLabel="Avg RCS" caption="Assessed facilities only" emptyHint="No assessments yet." /></ChartCard>
            <ChartCard title="Assessment coverage"><SwitchableChart data={coverage} kinds={["pie", "bar", "number"]} valueLabel="Facilities" caption="Climate-assessed vs not" /></ChartCard>
          </m.div>
          <m.div variants={staggerContainer} initial="hidden" animate="show" className="grid gap-3 sm:grid-cols-3">
            <m.div variants={scaleIn}><StatCard title="Total solar capacity" meta="Assessed facilities" icon={<Sun />} accent="solar" value={<AnimatedNumber value={energyTotals.solarKw} decimals={1} suffix=" kW" />} /></m.div>
            <m.div variants={scaleIn}><StatCard title="Modelled annual savings" meta="Across assessed" icon={<DollarSign />} accent="success" value={<AnimatedNumber value={energyTotals.savings} prefix="TSh " />} /></m.div>
            <m.div variants={scaleIn}><StatCard title="Avg efficiency (BMI)" meta="Energy assessment" icon={<Zap />} accent={energyTotals.avgBmi != null && energyTotals.avgBmi < 60 ? "warning" : "primary"} value={energyTotals.avgBmi != null ? <AnimatedNumber value={energyTotals.avgBmi} suffix="%" /> : "—"} /></m.div>
          </m.div>
        </section>

        {/* Operations & finance */}
        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Operations &amp; finance</h3>
          <m.div variants={fadeInUp} initial="hidden" animate="show" className="grid gap-3 lg:grid-cols-3">
            <ChartCard title="Transactions (30d)" caption="By status"><SwitchableChart data={transactionsData} kinds={["pie", "bar", "number"]} valueLabel="Transactions" /></ChartCard>
            <ChartCard title="Device fleet" caption="Online vs offline"><SwitchableChart data={deviceData} kinds={["pie", "number"]} valueLabel="Devices" /></ChartCard>
            <ChartCard title="Payment health" caption="Completed share, last 30 days">
              <div className="relative">
                <ResponsiveContainer width="100%" height={200}>
                  <RadialBarChart cx="50%" cy="70%" innerRadius="70%" outerRadius="110%" startAngle={180} endAngle={0} data={[{ name: "Success", value: paymentSuccess, fill: paymentSuccess >= 90 ? "#10b981" : paymentSuccess >= 70 ? "#f59e0b" : "#ef4444" }]}>
                    <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                    <RadialBar dataKey="value" cornerRadius={8} background={{ fill: "var(--color-muted)" }} />
                  </RadialBarChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-x-0 bottom-8 text-center">
                  <div className="text-3xl font-black text-foreground">{r0(paymentSuccess)}%</div>
                  <div className="text-xs text-muted-foreground">success rate</div>
                </div>
              </div>
              <div className="mt-1 flex items-center justify-center gap-2 text-xs">
                <Badge variant="outline">{formatCurrency(financial.data?.pendingPayments ?? 0)} pending</Badge>
                <Badge variant="outline">{formatCurrency(financial.data?.overduePayments ?? 0)} overdue</Badge>
              </div>
            </ChartCard>
          </m.div>
        </section>

        {/* Activity */}
        <section className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-sm font-semibold text-foreground">Activity &amp; usage</h3>
            <Select value={activityRange} onValueChange={(v) => setActivityRange(v as ActivityRange)}>
              <SelectTrigger className="h-8 w-full text-xs sm:w-[160px]"><SelectValue placeholder="Range" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Last 7 days</SelectItem>
                <SelectItem value="monthly">Last 30 days</SelectItem>
                <SelectItem value="all">Last 12 months</SelectItem>
                <SelectItem value="all-time">All time</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            <ChartCard title="Top facilities by logins">
              <div className="space-y-2">
                {(facilityActivity.data?.rows ?? []).slice(0, 8).map((row, i) => (
                  <div key={String(row.facilityId ?? i)} className="flex items-center justify-between gap-2 rounded-md border border-border p-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-foreground">{String(row.facilityName ?? "—")}</div>
                      <div className="truncate text-[11px] text-muted-foreground">{[row.city, row.region].filter(Boolean).join(", ")}</div>
                    </div>
                    <Badge variant="secondary">{String(row.loginCount ?? 0)} logins</Badge>
                  </div>
                ))}
                {(!facilityActivity.data?.rows || facilityActivity.data.rows.length === 0) && <p className="text-xs text-muted-foreground">No login events yet.</p>}
              </div>
            </ChartCard>
            <ChartCard title="Top users by logins">
              <div className="space-y-2">
                {(userActivity.data?.rows ?? []).slice(0, 8).map((row, i) => (
                  <div key={String(row.userId ?? row.email ?? i)} className="flex items-center justify-between gap-2 rounded-md border border-border p-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-foreground">{String(row.name ?? row.email ?? "—")}</div>
                      <div className="truncate text-[11px] text-muted-foreground">{String(row.email ?? "")} · {String(row.role ?? "")}</div>
                    </div>
                    <Badge variant="success">{String(row.loginCount ?? 0)} logins</Badge>
                  </div>
                ))}
                {(!userActivity.data?.rows || userActivity.data.rows.length === 0) && <p className="text-xs text-muted-foreground">No login events yet.</p>}
              </div>
            </ChartCard>
          </div>
          <ChartCard title="Afya Solar active subscriptions" caption={`${activeSubs.data?.data?.length ?? 0} active (non-expired)`}>
            <div className="grid gap-2 sm:grid-cols-2">
              {(activeSubs.data?.data ?? []).slice(0, 12).map((row, i) => (
                <div key={String(row.facilityId ?? i)} className="flex items-center justify-between gap-2 rounded-md border border-border p-2">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-foreground">{String(row.facilityName ?? "—")}</div>
                    <div className="truncate text-[11px] text-muted-foreground">{String(row.planType ?? "")}{row.billingCycle ? ` · ${row.billingCycle}` : ""}</div>
                  </div>
                  <Badge variant="success">Active</Badge>
                </div>
              ))}
              {(!activeSubs.data?.data || activeSubs.data.data.length === 0) && <p className="text-xs text-muted-foreground">No active subscriptions found.</p>}
            </div>
          </ChartCard>
        </section>
      </div>
    </LazyMotionProvider>
  )
}
