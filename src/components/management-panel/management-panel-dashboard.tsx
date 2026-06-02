"use client"

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Building2,
  Zap,
  DollarSign,
  Leaf,
  Sun,
  BarChart3,
  MapPin,
  Calendar,
  CheckCircle2,
  Download,
  RefreshCw,
  ChevronRight,
  Activity,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { format, formatDistanceToNow } from 'date-fns'
import {
  ManagementPanelDashboardSkeleton,
  ManagementPanelErrorState,
} from '@/components/management-panel/management-panel-loading'
import { FacilityDetailSimulation } from '@/components/management-panel/facility-detail-simulation'
import { EmptyState } from '@/components/ui/empty-state'

interface SimulatedFacility {
  id: string
  name: string
  location: string
  region: string
  status: string
  solarStatus: string
  paygStatus: string
  installationDate: string
  paygOperationalDate: string
  energyConsumptionBefore: number
  energyConsumptionAfter: number
  monthlyEnergySavings: number
  electricityCostBefore: string
  electricityCostAfter: string
  monthlyCostSavings: string
  carbonEmissionReduction: number
  solarCapacity: number
  batteryCapacity: number
  smartMeterSerial: string
  facilityType: string
  notes: string
}

interface DashboardStats {
  totalFacilities: number
  totalEnergySavings: number
  totalCostSavings: number
  totalCarbonReduction: number
  totalSolarCapacity: number
  averageEnergyReduction: number
  averageCostReduction: number
}

interface MonthlyTrendPoint {
  yearMonth: string
  totalEnergySavings: number
  totalCostSavings: number
}

export default function ManagementPanelDashboard() {
  const [facilities, setFacilities] = useState<SimulatedFacility[]>([])
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)
  const [trend, setTrend] = useState<MonthlyTrendPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)
  const [selectedFacility, setSelectedFacility] = useState<SimulatedFacility | null>(null)
  const sitesSectionRef = useRef<HTMLDivElement>(null)

  const fetchData = async () => {
    try {
      setError(null)
      setRefreshing(true)
      const [facilitiesRes, metricsRes] = await Promise.all([
        fetch('/api/management-panel/facilities'),
        fetch('/api/management-panel/monthly-metrics'),
      ])
      if (!facilitiesRes.ok) throw new Error('Failed to fetch facilities')
      const data = await facilitiesRes.json()
      setFacilities(data.facilities || [])
      setStats(
        data.stats || {
          totalFacilities: 0,
          totalEnergySavings: 0,
          totalCostSavings: 0,
          totalCarbonReduction: 0,
          totalSolarCapacity: 0,
          averageEnergyReduction: 0,
          averageCostReduction: 0,
        }
      )
      setLastUpdated(data.lastUpdated ?? null)

      if (metricsRes.ok) {
        const metricsData = await metricsRes.json()
        setTrend(metricsData.trend || [])
      } else {
        setTrend([])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleExport = async () => {
    try {
      setExporting(true)
      const res = await fetch('/api/management-panel/export')
      if (!res.ok) throw new Error('Export failed')
      const data = await res.json()
      const csvLines = [
        'Management Panel Report',
        `Exported at,${data.exportedAt}`,
        `Last data update,${data.stats?.lastUpdated ?? 'N/A'}`,
        '',
        'Summary',
        `Total sites,${data.stats?.totalFacilities ?? 0}`,
        `Monthly energy savings (kWh),${data.stats?.totalEnergySavings ?? 0}`,
        `Monthly cost savings (TZS),${data.stats?.totalCostSavings ?? 0}`,
        `CO2 reduction (kg/mo),${data.stats?.totalCarbonReduction ?? 0}`,
        '',
        'Facilities',
        'Name,Location,Region,Type,Monthly energy savings (kWh),Monthly cost savings (TZS),CO2 (kg/mo),Solar (kW)',
        ...(data.facilities || []).map(
          (f: { name: string; location: string; region: string; facilityType: string; monthlyEnergySavings: number; monthlyCostSavings: string; carbonEmissionReduction: number; solarCapacity: number }) =>
            [f.name, f.location, f.region, f.facilityType, f.monthlyEnergySavings, f.monthlyCostSavings, f.carbonEmissionReduction, f.solarCapacity].join(',')
        ),
        '',
        'Monthly trend (aggregate)',
        'Month,Energy savings (kWh),Cost savings (TZS)',
        ...(data.trend || []).map((t: { yearMonth: string; totalEnergySavings: number; totalCostSavings: number }) =>
          [t.yearMonth, t.totalEnergySavings, t.totalCostSavings].join(',')
        ),
        '',
        'Recent payments',
        'Facility,Period,Amount (TZS),Type,Status',
        ...(data.payments || []).map(
          (p: { facilityName: string; periodLabel: string; amount: string; paymentType: string; status: string }) =>
            [p.facilityName, p.periodLabel, p.amount, p.paymentType, p.status].join(',')
        ),
      ]
      const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `management-panel-report-${format(new Date(), 'yyyy-MM-dd')}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Export error:', err)
    } finally {
      setExporting(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const scrollToSites = () => {
    sitesSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const isOperational = (status: string) =>
    status?.toLowerCase() === 'active' || status?.toLowerCase() === 'operational'

  const getPerformanceBadge = (savingsPercent: number) => {
    if (savingsPercent >= 50) return { text: 'Excellent', color: 'border-transparent bg-success/10 text-success' }
    if (savingsPercent >= 40) return { text: 'Very Good', color: 'border-transparent bg-secondary text-secondary-foreground' }
    if (savingsPercent >= 30) return { text: 'Good', color: 'border-transparent bg-warning/15 text-warning-foreground' }
    return { text: 'Fair', color: 'border-transparent bg-muted text-muted-foreground' }
  }

  if (loading) {
    return <ManagementPanelDashboardSkeleton />
  }

  if (error) {
    return (
      <ManagementPanelErrorState
        title="Unable to load dashboard"
        message={error}
        onRetry={fetchData}
      />
    )
  }

  return (
    <div className={cn('h-full overflow-y-auto scroll-smooth', refreshing && 'opacity-75 transition-opacity duration-200')}>
      {/* Header */}
      <div className="mb-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Installation sites results and performance overview
            </p>
            {lastUpdated && (
              <p className="text-xs text-muted-foreground mt-1" title={lastUpdated}>
                Data as of {format(new Date(lastUpdated), 'd MMM yyyy')}
                {typeof window !== 'undefined' && ' · Refreshed ' + formatDistanceToNow(new Date(lastUpdated), { addSuffix: true })}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchData}
              disabled={refreshing}
              className="gap-2 min-w-[88px]"
            >
              <RefreshCw className={cn('w-4 h-4 shrink-0', refreshing && 'animate-spin')} aria-hidden />
              {refreshing ? 'Refreshing…' : 'Refresh'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={handleExport}
              disabled={exporting || facilities.length === 0}
            >
              <Download className={cn('w-4 h-4 shrink-0', exporting && 'animate-pulse')} aria-hidden />
              {exporting ? 'Exporting…' : 'Export'}
            </Button>
          </div>
        </div>
      </div>

      {/* Stat cards clickable, scroll to sites */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 animate-in fade-in slide-in-from-bottom-2 duration-300 delay-75">
          <button
            type="button"
            onClick={scrollToSites}
            className={cn(
              'group text-left rounded-lg border border-border bg-card p-5 shadow-sm cursor-pointer',
              'transition-all duration-200 hover:shadow-md hover:border-primary/20 hover:-translate-y-0.5',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              'border-l-4 border-l-primary'
            )}
          >
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Sites</CardTitle>
              <Building2 className="w-5 h-5 text-primary opacity-80 group-hover:opacity-100" aria-hidden />
            </div>
            <p className="mt-2 text-2xl font-bold text-foreground">{stats.totalFacilities}</p>
            <p className="text-xs text-muted-foreground mt-1">Completed & operational</p>
            <ChevronRight className="w-4 h-4 text-muted-foreground mt-2 opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden />
          </button>

          <button
            type="button"
            onClick={scrollToSites}
            className={cn(
              'group text-left rounded-lg border border-border bg-card p-5 shadow-sm cursor-pointer',
              'transition-all duration-200 hover:shadow-md hover:border-primary/20 hover:-translate-y-0.5',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              'border-l-4 border-l-success'
            )}
          >
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">Monthly Energy Savings</CardTitle>
              <Zap className="w-5 h-5 text-success opacity-80 group-hover:opacity-100" aria-hidden />
            </div>
            <p className="mt-2 text-2xl font-bold text-foreground">{stats.totalEnergySavings.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">kWh per month</p>
            <ChevronRight className="w-4 h-4 text-muted-foreground mt-2 opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden />
          </button>

          <button
            type="button"
            onClick={scrollToSites}
            className={cn(
              'group text-left rounded-lg border border-border bg-card p-5 shadow-sm cursor-pointer',
              'transition-all duration-200 hover:shadow-md hover:border-primary/20 hover:-translate-y-0.5',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              'border-l-4 border-l-solar'
            )}
          >
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">Monthly Cost Savings</CardTitle>
              <DollarSign className="w-5 h-5 text-solar-foreground opacity-80 group-hover:opacity-100" aria-hidden />
            </div>
            <p className="mt-2 text-2xl font-bold text-foreground">TZS {Number(stats.totalCostSavings).toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">Across all sites</p>
            <ChevronRight className="w-4 h-4 text-muted-foreground mt-2 opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden />
          </button>

          <button
            type="button"
            onClick={scrollToSites}
            className={cn(
              'group text-left rounded-lg border border-border bg-card p-5 shadow-sm cursor-pointer',
              'transition-all duration-200 hover:shadow-md hover:border-primary/20 hover:-translate-y-0.5',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              'border-l-4 border-l-success'
            )}
          >
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">CO₂ Reduction</CardTitle>
              <Leaf className="w-5 h-5 text-success opacity-80 group-hover:opacity-100" aria-hidden />
            </div>
            <p className="mt-2 text-2xl font-bold text-foreground">{stats.totalCarbonReduction.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">kg per month</p>
            <ChevronRight className="w-4 h-4 text-muted-foreground mt-2 opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden />
          </button>
        </div>
      )}

      {/* Monthly trend chart from DB */}
      {trend.length > 0 && (
        <Card className="rounded-lg border-border shadow-sm overflow-hidden mb-6 animate-in fade-in slide-in-from-bottom-2 duration-300 delay-100">
          <CardHeader className="bg-muted/50 border-b border-border">
            <CardTitle className="flex items-center gap-2 text-lg">
              <BarChart3 className="w-5 h-5" aria-hidden />
              Monthly savings trend
            </CardTitle>
            <CardDescription>Aggregate energy and cost savings by month (last 12 months)</CardDescription>
          </CardHeader>
          <CardContent className="p-4 md:p-6">
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trend} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="yearMonth" tick={{ fontSize: 12 }} />
                  <YAxis yAxisId="energy" tick={{ fontSize: 12 }} width={45} />
                  <YAxis yAxisId="cost" orientation="right" tick={{ fontSize: 12 }} width={55} tickFormatter={(v) => `${(v / 1e6).toFixed(1)}M`} />
                  <Tooltip
                    formatter={(value: number, name: string) =>
                      name === 'totalEnergySavings' ? [value + ' kWh', 'Energy savings'] : [Number(value).toLocaleString() + ' TZS', 'Cost savings']
                    }
                    labelFormatter={(label) => `Month: ${label}`}
                    contentStyle={{ background: 'var(--color-popover)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)' }}
                  />
                  <Legend />
                  <Line yAxisId="energy" type="monotone" dataKey="totalEnergySavings" name="Energy savings (kWh)" stroke="var(--color-chart-1)" strokeWidth={2} dot={{ r: 3 }} />
                  <Line yAxisId="cost" type="monotone" dataKey="totalCostSavings" name="Cost savings (TZS)" stroke="var(--color-chart-4)" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Performance overview card clickable */}
      {stats && (
        <button
          type="button"
          onClick={scrollToSites}
          className={cn(
            'w-full text-left rounded-lg border border-border bg-card p-6 shadow-sm mb-6 cursor-pointer animate-in fade-in slide-in-from-bottom-2 duration-300 delay-100',
            'transition-all duration-200 hover:shadow-md hover:border-primary/20',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
          )}
        >
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-muted-foreground" aria-hidden />
            <CardTitle className="text-base">Performance Overview</CardTitle>
            <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto" aria-hidden />
          </div>
          <CardDescription className="mb-4">Average improvements across all installed sites</CardDescription>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 rounded-lg bg-muted/80">
              <p className="text-2xl font-bold text-primary">{stats.averageEnergyReduction}%</p>
              <p className="text-sm text-muted-foreground">Average Energy Reduction</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/80">
              <p className="text-2xl font-bold text-foreground">{stats.averageCostReduction}%</p>
              <p className="text-sm text-muted-foreground">Average Cost Reduction</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/80">
              <p className="text-2xl font-bold text-foreground">{stats.totalSolarCapacity} kW</p>
              <p className="text-sm text-muted-foreground">Total Solar Capacity</p>
            </div>
          </div>
        </button>
      )}

      {/* Installed sites scroll target and facility cards */}
      <div ref={sitesSectionRef} className="scroll-mt-4 animate-in fade-in slide-in-from-bottom-2 duration-300 delay-150">
        <Card className="rounded-lg border-border shadow-sm overflow-hidden">
          <CardHeader className="bg-muted/50 border-b border-border">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Building2 className="w-5 h-5" aria-hidden />
              Installed Sites Before & After
            </CardTitle>
            <CardDescription>Click a site card to view full details</CardDescription>
          </CardHeader>
          <CardContent className="p-4 md:p-6">
            <div className="space-y-4 max-h-[60vh] overflow-y-auto overflow-x-hidden pr-1 scroll-smooth [scrollbar-gutter:stable]">
              {facilities.length === 0 && (
                <EmptyState
                  icon={<Building2 />}
                  title="No installation sites in the database yet."
                  description="Run the management panel seed to load sites."
                />
              )}
              {facilities.map((facility) => {
                const energyReductionPercent = facility.energyConsumptionBefore
                  ? Math.round((facility.monthlyEnergySavings / facility.energyConsumptionBefore) * 100)
                  : 0
                const costReductionPercent =
                  Number(facility.electricityCostBefore) > 0
                    ? Math.round((Number(facility.monthlyCostSavings) / Number(facility.electricityCostBefore)) * 100)
                    : 0
                const performanceBadge = getPerformanceBadge(energyReductionPercent)

                return (
                  <button
                    key={facility.id}
                    type="button"
                    onClick={() => setSelectedFacility(facility)}
                    className={cn(
                      'w-full text-left rounded-lg border border-border bg-card p-5 cursor-pointer',
                      'transition-all duration-200 hover:shadow-md hover:border-primary/20 hover:-translate-y-0.5',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                      'flex flex-col sm:flex-row sm:items-center gap-4'
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-semibold text-foreground">{facility.name}</h3>
                        <Badge variant={isOperational(facility.status) ? 'success' : 'secondary'}>
                          <CheckCircle2 className="w-3 h-3 mr-1" aria-hidden />
                          {facility.status}
                        </Badge>
                        <Badge variant="outline" className={performanceBadge.color}>
                          {performanceBadge.text}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 mt-1.5 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" aria-hidden />
                          {facility.location}, {facility.region}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" aria-hidden />
                          {new Date(facility.installationDate).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div>
                          <p className="text-muted-foreground">Energy</p>
                          <p className="font-medium text-primary">-{energyReductionPercent}%</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Cost</p>
                          <p className="font-medium text-primary">-{costReductionPercent}%</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Solar</p>
                          <p className="font-medium">{facility.solarCapacity} kW</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">CO₂</p>
                          <p className="font-medium">{facility.carbonEmissionReduction} kg/mo</p>
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0 self-center sm:self-auto" aria-hidden />
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Facility detail dialog */}
      <Dialog open={!!selectedFacility} onOpenChange={(open) => !open && setSelectedFacility(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto scroll-smooth">
          {selectedFacility && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl">{selectedFacility.name}</DialogTitle>
                <DialogDescription>
                  {selectedFacility.location}, {selectedFacility.region} · {selectedFacility.facilityType}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-6 pt-2">
                <div className="flex flex-wrap gap-2">
                  <Badge variant={isOperational(selectedFacility.status) ? 'success' : 'secondary'}>{selectedFacility.status}</Badge>
                  <Badge variant="outline">{selectedFacility.solarStatus}</Badge>
                  <Badge variant="outline">{selectedFacility.paygStatus}</Badge>
                  <Badge variant="secondary">{selectedFacility.facilityType}</Badge>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="rounded-lg border border-border bg-muted p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" aria-hidden />
                      <span className="text-sm font-medium">Installation</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Installed: {new Date(selectedFacility.installationDate).toLocaleDateString()}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      PAYG operational: {new Date(selectedFacility.paygOperationalDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border bg-muted p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Activity className="w-4 h-4 text-muted-foreground" aria-hidden />
                      <span className="text-sm font-medium">Meter</span>
                    </div>
                    <p className="text-sm font-mono text-muted-foreground">{selectedFacility.smartMeterSerial}</p>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-3">Energy consumption</h4>
                  <div className="rounded-lg border border-border p-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Before</span>
                      <span className="font-medium">{selectedFacility.energyConsumptionBefore} kWh/month</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">After</span>
                      <span className="font-medium text-primary">{selectedFacility.energyConsumptionAfter} kWh/month</span>
                    </div>
                    <div className="flex justify-between text-sm font-semibold text-primary pt-1 border-t border-border">
                      <span>Monthly savings</span>
                      <span>{selectedFacility.monthlyEnergySavings} kWh</span>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-3">Costs</h4>
                  <div className="rounded-lg border border-border p-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Before</span>
                      <span className="font-medium">TZS {Number(selectedFacility.electricityCostBefore).toLocaleString()}/month</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">After</span>
                      <span className="font-medium text-primary">TZS {Number(selectedFacility.electricityCostAfter).toLocaleString()}/month</span>
                    </div>
                    <div className="flex justify-between text-sm font-semibold text-primary pt-1 border-t border-border">
                      <span>Monthly savings</span>
                      <span>TZS {Number(selectedFacility.monthlyCostSavings).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg border border-border p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Sun className="w-4 h-4 text-solar-foreground" aria-hidden />
                      <span className="text-sm font-medium">System</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{selectedFacility.solarCapacity} kW solar</p>
                    <p className="text-sm text-muted-foreground">{selectedFacility.batteryCapacity} kWh battery</p>
                  </div>
                  <div className="rounded-lg border border-border p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Leaf className="w-4 h-4 text-success" aria-hidden />
                      <span className="text-sm font-medium">Impact</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{selectedFacility.carbonEmissionReduction} kg CO₂/month</p>
                  </div>
                </div>
                <div className="rounded-lg border border-border p-4 bg-muted/50">
                  <FacilityDetailSimulation facility={selectedFacility} />
                </div>
                {selectedFacility.notes && (
                  <div className="rounded-lg bg-primary/5 border border-primary/20 p-4">
                    <p className="text-sm text-foreground">
                      <strong>Note:</strong> {selectedFacility.notes}
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
