"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Building2, 
  Zap, 
  DollarSign, 
  TrendingDown, 
  Leaf, 
  Battery,
  Sun,
  BarChart3,
  MapPin,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Download,
  RefreshCw
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { StatCard } from '@/components/ui/stat-card'
import { DashboardSkeleton } from '@/components/ui/skeleton'

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

export default function SimulatedDashboard() {
  const [facilities, setFacilities] = useState<SimulatedFacility[]>([])
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchSimulatedData = async () => {
    try {
      setRefreshing(true)
      const response = await fetch('/api/investor/simulated-facilities')
      if (!response.ok) throw new Error('Failed to fetch simulated data')
      
      const data = await response.json()
      setFacilities(data.facilities || [])
      setStats(data.stats || null)
    } catch (error) {
      console.error('Error fetching simulated data:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchSimulatedData()
  }, [])

  const isOperational = (status: string) =>
    status.toLowerCase() === 'active' || status.toLowerCase() === 'operational'

  const getPerformanceBadge = (savingsPercent: number) => {
    if (savingsPercent >= 50) return { text: 'Excellent', color: 'border-transparent bg-success/10 text-success' }
    if (savingsPercent >= 40) return { text: 'Very Good', color: 'border-transparent bg-secondary text-secondary-foreground' }
    if (savingsPercent >= 30) return { text: 'Good', color: 'border-transparent bg-warning/15 text-warning-foreground' }
    return { text: 'Fair', color: 'border-transparent bg-muted text-muted-foreground' }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-muted/30 p-6">
        <DashboardSkeleton />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-muted/30 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Afya Solar - Investor Dashboard</h1>
            <p className="text-muted-foreground mt-2">Real-time performance monitoring of installed facilities</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              onClick={fetchSimulatedData}
              disabled={refreshing}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} aria-hidden />
              Refresh Data
            </Button>
            <Button className="flex items-center gap-2">
              <Download className="w-4 h-4" aria-hidden />
              Export Report
            </Button>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Active Facilities"
            value={stats.totalFacilities}
            icon={<Building2 />}
            meta="Fully operational sites"
            accent="primary"
          />
          <StatCard
            title="Monthly Energy Savings"
            value={stats.totalEnergySavings.toLocaleString()}
            icon={<Zap />}
            meta="kWh per month"
            accent="success"
          />
          <StatCard
            title="Monthly Cost Savings"
            value={`TZS ${Number(stats.totalCostSavings).toLocaleString()}`}
            icon={<DollarSign />}
            meta="Across all facilities"
            accent="solar"
          />
          <StatCard
            title="CO₂ Reduction"
            value={stats.totalCarbonReduction.toLocaleString()}
            icon={<Leaf />}
            meta="kg per month"
            accent="success"
          />
        </div>
      )}

      {/* Performance Overview */}
      {stats && (
        <Card className="mb-8 border-border shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" aria-hidden />
              Performance Overview
            </CardTitle>
            <CardDescription>Average improvements across all installed facilities</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary mb-2">{stats.averageEnergyReduction}%</div>
                <p className="text-sm text-muted-foreground">Average Energy Reduction</p>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-foreground mb-2">{stats.averageCostReduction}%</div>
                <p className="text-sm text-muted-foreground">Average Cost Reduction</p>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-foreground mb-2">{stats.totalSolarCapacity} kW</div>
                <p className="text-sm text-muted-foreground">Total Solar Capacity</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Facilities Details */}
      <Card className="border-border shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" aria-hidden />
            Installed Facilities - Performance Details
          </CardTitle>
          <CardDescription>Before and after comparison for each facility</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {facilities.map((facility) => {
              const energyReductionPercent = Math.round((facility.monthlyEnergySavings / facility.energyConsumptionBefore) * 100)
              const costReductionPercent = Math.round((Number(facility.monthlyCostSavings) / Number(facility.electricityCostBefore)) * 100)
              const performanceBadge = getPerformanceBadge(energyReductionPercent)

              return (
                <div key={facility.id} className="border border-border rounded-lg p-6 hover:shadow-md transition-shadow">
                  {/* Facility Header */}
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">{facility.name}</h3>
                      <div className="flex flex-wrap items-center gap-4 mt-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" aria-hidden />
                          {facility.location}, {facility.region}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" aria-hidden />
                          Installed: {new Date(facility.installationDate).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={isOperational(facility.status) ? 'success' : 'secondary'}>
                        <CheckCircle2 className="w-3 h-3 mr-1" aria-hidden />
                        {facility.status}
                      </Badge>
                      <Badge variant="outline" className={performanceBadge.color}>
                        {performanceBadge.text}
                      </Badge>
                    </div>
                  </div>

                  {/* Performance Metrics */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    {/* Energy Consumption */}
                    <div className="bg-muted rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Zap className="w-4 h-4 text-primary" aria-hidden />
                        <span className="text-sm font-medium text-foreground">Energy Consumption</span>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Before:</span>
                          <span className="font-medium">{facility.energyConsumptionBefore.toLocaleString()} kWh</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">After:</span>
                          <span className="font-medium text-primary">{facility.energyConsumptionAfter.toLocaleString()} kWh</span>
                        </div>
                        <div className="flex justify-between text-sm font-semibold text-primary">
                          <span>Savings:</span>
                          <span>-{energyReductionPercent}%</span>
                        </div>
                      </div>
                    </div>

                    {/* Cost Analysis */}
                    <div className="bg-muted rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <DollarSign className="w-4 h-4 text-solar-foreground" aria-hidden />
                        <span className="text-sm font-medium text-foreground">Monthly Costs</span>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Before:</span>
                          <span className="font-medium">TZS {Number(facility.electricityCostBefore).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">After:</span>
                          <span className="font-medium text-primary">TZS {Number(facility.electricityCostAfter).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-sm font-semibold text-primary">
                          <span>Savings:</span>
                          <span>-{costReductionPercent}%</span>
                        </div>
                      </div>
                    </div>

                    {/* System Specs */}
                    <div className="bg-muted rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Sun className="w-4 h-4 text-solar-foreground" aria-hidden />
                        <span className="text-sm font-medium text-foreground">System Specifications</span>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Solar Capacity:</span>
                          <span className="font-medium">{facility.solarCapacity} kW</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Battery:</span>
                          <span className="font-medium">{facility.batteryCapacity} kWh</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Meter:</span>
                          <span className="font-medium">{facility.smartMeterSerial}</span>
                        </div>
                      </div>
                    </div>

                    {/* Environmental Impact */}
                    <div className="bg-muted rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Leaf className="w-4 h-4 text-success" aria-hidden />
                        <span className="text-sm font-medium text-foreground">Environmental Impact</span>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">CO₂ Reduction:</span>
                          <span className="font-medium">{facility.carbonEmissionReduction.toLocaleString()} kg/month</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">PAYG Status:</span>
                          <span className="font-medium text-primary">{facility.paygStatus}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Type:</span>
                          <span className="font-medium">{facility.facilityType}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Notes */}
                  {facility.notes && (
                    <div className="mt-4 p-3 bg-primary/5 rounded-lg">
                      <p className="text-sm text-foreground">
                        <strong>Note:</strong> {facility.notes}
                      </p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
