"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { StatCard } from "@/components/ui/stat-card"
import { EmptyState } from "@/components/ui/empty-state"
import { useFacility } from "@/hooks/use-facilities"
import { useEnergyData } from "@/hooks/use-energy-data"
import { useDevices } from "@/hooks/use-devices"
import { formatCurrency } from "@/lib/utils"
import { 
  ArrowLeft, 
  Zap, 
  Sun, 
  Battery, 
  BarChart3, 
  DollarSign, 
  Building2, 
  MapPin, 
  Phone, 
  CreditCard,
  TrendingUp,
  Activity,
  CheckCircle2,
  AlertCircle,
  Plug
} from "lucide-react"
import Link from "next/link"
import { useMemo } from "react"
import { cn } from "@/lib/utils"

interface FacilityMetricsPageProps {
  facilityId: string
}

export function FacilityMetricsPage({ facilityId }: FacilityMetricsPageProps) {
  const { data: facility, isLoading: facilityLoading } = useFacility(facilityId)
  const { data: energyData, isLoading: energyLoading } = useEnergyData(undefined, facilityId)
  const { data: devices, isLoading: devicesLoading } = useDevices(facilityId)
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month'>('today')

  const metrics = useMemo(() => {
    if (!energyData || energyData.length === 0) {
      return {
        totalConsumption: 0,
        avgPower: 0,
        maxPower: 0,
        totalSolarGeneration: 0,
        avgBatteryLevel: 0,
        gridConsumption: 0,
        solarPercentage: 0,
        costSavings: 0,
      }
    }

    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)

    let filteredData = energyData
    if (timeRange === 'today') {
      filteredData = energyData.filter(d => new Date(d.timestamp) >= today)
    } else if (timeRange === 'week') {
      filteredData = energyData.filter(d => new Date(d.timestamp) >= weekAgo)
    } else if (timeRange === 'month') {
      filteredData = energyData.filter(d => new Date(d.timestamp) >= monthAgo)
    }

    const totalConsumption = filteredData.reduce((sum, d) => sum + Number(d.energy), 0)
    const avgPower = filteredData.length > 0 
      ? filteredData.reduce((sum, d) => sum + Number(d.power), 0) / filteredData.length 
      : 0
    const maxPower = Math.max(...filteredData.map(d => Number(d.power)), 0)
    const totalSolarGeneration = filteredData.reduce((sum, d) => sum + (Number(d.solarGeneration) || 0), 0)
    const batteryLevels = filteredData.filter(d => d.batteryLevel).map(d => Number(d.batteryLevel))
    const avgBatteryLevel = batteryLevels.length > 0
      ? batteryLevels.reduce((sum, b) => sum + b, 0) / batteryLevels.length
      : 0

    const gridConsumption = totalConsumption - totalSolarGeneration
    const solarPercentage = totalConsumption > 0 ? (totalSolarGeneration / totalConsumption) * 100 : 0
    
    const ratePerKwh = 357.14285
    const gridCost = gridConsumption * ratePerKwh
    const costSavings = gridCost - (gridCost * (1 - solarPercentage / 100))
    
    return {
      totalConsumption,
      avgPower,
      maxPower,
      totalSolarGeneration,
      avgBatteryLevel,
      gridConsumption,
      solarPercentage,
      costSavings,
    }
  }, [energyData, timeRange])

  if (facilityLoading || energyLoading || devicesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground font-medium">Loading facility metrics...</p>
        </div>
      </div>
    )
  }

  if (!facility) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" aria-hidden />
            <p className="text-muted-foreground mb-4 font-medium">Facility not found</p>
            <Button asChild>
              <Link href="/dashboard/admin">
                <ArrowLeft className="w-4 h-4 mr-2" aria-hidden />
                Back to Management Panel
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const creditBalance = Number(facility.creditBalance || 0)
  const isLowCredit = creditBalance < 10000

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-start gap-4">
            <Button variant="ghost" asChild className="mt-1">
              <Link href="/dashboard/admin">
                <ArrowLeft className="w-4 h-4 mr-2" aria-hidden />
                Back
              </Link>
            </Button>
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{facility.name}</h1>
                <Badge
                  variant={facility.status === 'active' ? 'success' : 'secondary'}
                  className="text-xs font-semibold capitalize"
                >
                  {facility.status}
                </Badge>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4" aria-hidden />
                  <span>{facility.city}, {facility.region}</span>
                </div>
                {facility.phone && (
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-4 h-4" aria-hidden />
                    <span>{facility.phone}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Facility Information Card */}
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" aria-hidden />
              Facility Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Credit Balance</p>
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-primary" aria-hidden />
                  <p className={cn(
                    "text-lg font-bold",
                    isLowCredit ? "text-warning" : "text-foreground"
                  )}>
                    {formatCurrency(creditBalance)}
                  </p>
                </div>
                {isLowCredit && (
                  <Badge variant="warning" className="text-xs">
                    Low Credit
                  </Badge>
                )}
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Payment Model</p>
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-primary" aria-hidden />
                  <p className="text-lg font-semibold text-foreground capitalize">{facility.paymentModel || 'N/A'}</p>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Address</p>
                <p className="text-sm text-muted-foreground line-clamp-2">{facility.address || 'N/A'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Devices</p>
                <div className="flex items-center gap-2">
                  <Plug className="w-4 h-4 text-primary" aria-hidden />
                  <p className="text-lg font-semibold text-foreground">{devices?.length || 0} Active</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Time Range Selector */}
        <Card className="shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-foreground">Time Range</p>
              <div className="flex gap-2">
                {(['today', 'week', 'month'] as const).map((range) => (
                  <Button
                    key={range}
                    variant={timeRange === range ? 'default' : 'outline'}
                    onClick={() => setTimeRange(range)}
                    size="sm"
                  >
                    {range === 'today' ? 'Today' : range === 'week' ? 'This Week' : 'This Month'}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Primary Metrics - Large Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Consumption"
            value={metrics.totalConsumption.toFixed(2)}
            icon={<Zap />}
            meta="kWh"
            accent="success"
          />
          <StatCard
            title="Solar Generation"
            value={metrics.totalSolarGeneration.toFixed(2)}
            icon={<Sun />}
            meta={
              <>
                kWh • <span className="font-semibold text-solar-foreground">{metrics.solarPercentage.toFixed(1)}%</span> of total
              </>
            }
            accent="solar"
          />
          <StatCard
            title="Credit Balance"
            value={formatCurrency(creditBalance)}
            icon={<DollarSign />}
            meta="Available balance"
            accent="primary"
          />
          <StatCard
            title="Cost Savings"
            value={formatCurrency(metrics.costSavings)}
            icon={<TrendingUp />}
            meta="From solar generation"
            accent="muted"
          />
        </div>

        {/* Secondary Metrics */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card className="shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Average Power</CardTitle>
              <BarChart3 className="h-4 w-4 text-primary" aria-hidden />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{metrics.avgPower.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground mt-1">Watts</p>
            </CardContent>
          </Card>

          <Card className="shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Peak Power</CardTitle>
              <Zap className="h-4 w-4 text-primary" aria-hidden />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{metrics.maxPower.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground mt-1">Watts</p>
            </CardContent>
          </Card>

          <Card className="shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Average Battery</CardTitle>
              <Battery className="h-4 w-4 text-primary" aria-hidden />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{metrics.avgBatteryLevel.toFixed(0)}%</div>
              <p className="text-xs text-muted-foreground mt-1">Battery level</p>
            </CardContent>
          </Card>
        </div>

        {/* Devices Section */}
        <Card className="shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Plug className="w-5 h-5 text-primary" aria-hidden />
                  Devices
                </CardTitle>
                <CardDescription className="mt-1">Smart meters and energy monitors</CardDescription>
              </div>
              <Badge variant="outline" className="text-sm">
                {devices?.length || 0} Total
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {devices && devices.length > 0 ? (
              <div className="grid gap-3 md:grid-cols-2">
                {devices.map((device) => (
                  <div
                    key={device.id}
                    className="flex items-center justify-between p-4 border border-border rounded-lg bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "h-10 w-10 rounded-lg flex items-center justify-center",
                        device.status === 'active'
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground"
                      )}>
                        <Plug className="w-5 h-5" aria-hidden />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{device.serialNumber}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-sm text-muted-foreground">{device.type}</p>
                          <span className="text-muted-foreground">•</span>
                          <Badge
                            variant={device.status === 'active' ? 'success' : 'secondary'}
                            className="text-xs capitalize"
                          >
                            {device.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    {device.status === 'active' && (
                      <CheckCircle2 className="w-5 h-5 text-primary" aria-hidden />
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={<Plug />}
                title="No devices found"
                description="Devices will appear here once connected"
              />
            )}
          </CardContent>
        </Card>

        {/* Recent Energy Data */}
        <Card className="shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-primary" aria-hidden />
                  Recent Energy Data
                </CardTitle>
                <CardDescription className="mt-1">Latest energy consumption readings</CardDescription>
              </div>
              <Badge variant="outline" className="text-sm">
                {energyData?.length || 0} Records
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {energyData && energyData.length > 0 ? (
              <div className="overflow-x-auto">
                <div className="min-w-full">
                  <div className="space-y-2 max-h-[500px] overflow-y-auto">
                    {energyData.slice(0, 50).map((data) => (
                      <div
                        key={data.id}
                        className="flex items-center justify-between p-4 border border-border rounded-lg bg-card hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Zap className="w-5 h-5 text-primary" aria-hidden />
                          </div>
                          <div>
                            <p className="font-semibold text-foreground">{Number(data.power).toFixed(2)} W</p>
                            <p className="text-sm text-muted-foreground mt-0.5">
                              {new Date(data.timestamp).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="text-sm font-medium">
                            {Number(data.energy).toFixed(2)} kWh
                          </Badge>
                          {data.solarGeneration && Number(data.solarGeneration) > 0 && (
                            <div className="flex items-center gap-1 text-xs text-solar-foreground">
                              <Sun className="w-3 h-3" aria-hidden />
                              <span>{Number(data.solarGeneration).toFixed(2)} kWh</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <EmptyState
                icon={<Activity />}
                title="No energy data available"
                description="Energy readings will appear here once devices start reporting"
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
