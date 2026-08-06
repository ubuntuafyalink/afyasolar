'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
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
  Sun,
  Leaf,
  MapPin,
  Calendar,
  CheckCircle2,
  RefreshCw,
  ChevronRight,
  Activity,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  ManagementPanelPageSkeleton,
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
  paygOperationalDate?: string
  energyConsumptionBefore: number
  energyConsumptionAfter: number
  monthlyEnergySavings: number
  electricityCostBefore: string
  electricityCostAfter: string
  monthlyCostSavings: string
  carbonEmissionReduction: number
  solarCapacity: number
  batteryCapacity: number
  facilityType: string
  notes: string
  smartMeterSerial?: string
}

export function ManagementPanelSitesContent() {
  const [facilities, setFacilities] = useState<SimulatedFacility[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedFacility, setSelectedFacility] = useState<SimulatedFacility | null>(null)

  const fetchData = async () => {
    try {
      setError(null)
      setRefreshing(true)
      const res = await fetch('/api/management-panel/facilities')
      if (!res.ok) throw new Error('Failed to fetch facilities')
      const data = await res.json()
      setFacilities(data.facilities || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load sites')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const isOperational = (s: string) =>
    s?.toLowerCase() === 'active' || s?.toLowerCase() === 'operational'
  const getPerf = (p: number) =>
    p >= 50
      ? { text: 'Excellent', color: 'border-transparent bg-success/10 text-success' }
      : p >= 40
        ? { text: 'Very Good', color: 'border-transparent bg-secondary text-secondary-foreground' }
        : p >= 30
          ? { text: 'Good', color: 'border-transparent bg-warning/15 text-warning-foreground' }
          : { text: 'Fair', color: 'border-transparent bg-muted text-muted-foreground' }

  if (loading) {
    return <ManagementPanelPageSkeleton titleWidth="w-52" rows={6} />
  }

  if (error) {
    return (
      <ManagementPanelErrorState
        title="Unable to load installation sites"
        message={error}
        onRetry={fetchData}
      />
    )
  }

  return (
    <>
      <div className="mb-6 animate-in fade-in duration-300">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Installation Sites</h1>
        <p className="text-sm text-muted-foreground mt-1">All completed and operational solar installation sites</p>
      </div>
      <Card className="rounded-lg border-border shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
        <CardContent className="p-4 md:p-6">
          <div className="flex justify-end mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchData}
              disabled={refreshing}
              className="gap-2"
            >
              <RefreshCw className={cn('w-4 h-4', refreshing && 'animate-spin')} aria-hidden />
              {refreshing ? 'Refreshing…' : 'Refresh'}
            </Button>
          </div>
          <div className="space-y-4 max-h-[70vh] overflow-y-auto overflow-x-hidden pr-1 scroll-smooth [scrollbar-gutter:stable]">
            {facilities.length === 0 && (
              <EmptyState
                icon={<Building2 />}
                title="No installation sites in the database yet."
                description="Run the management panel seed to load sites."
              />
            )}
            {facilities.map((f) => {
              const energyPct = f.energyConsumptionBefore
                ? Math.round((f.monthlyEnergySavings / f.energyConsumptionBefore) * 100)
                : 0
              const costPct =
                Number(f.electricityCostBefore) > 0
                  ? Math.round((Number(f.monthlyCostSavings) / Number(f.electricityCostBefore)) * 100)
                  : 0
              const perf = getPerf(energyPct)
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setSelectedFacility(f)}
                  className={cn(
                    'w-full text-left rounded-lg border border-border bg-card p-5 cursor-pointer',
                    'transition-all duration-200 hover:shadow-md hover:border-primary/20 hover:-translate-y-0.5',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
                  )}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-semibold text-foreground">{f.name}</h3>
                        <Badge variant={isOperational(f.status) ? 'success' : 'secondary'}>
                          <CheckCircle2 className="w-3 h-3 mr-1" aria-hidden />
                          {f.status}
                        </Badge>
                        <Badge variant="outline" className={perf.color}>
                          {perf.text}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 mt-1.5 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" aria-hidden />
                          {f.location}, {f.region}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" aria-hidden />
                          Installed: {new Date(f.installationDate).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 text-sm">
                        <div className="bg-muted rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <Zap className="w-4 h-4 text-primary" aria-hidden />
                            <span className="font-medium text-foreground">Energy</span>
                          </div>
                          <p className="text-primary font-semibold">-{energyPct}%</p>
                        </div>
                        <div className="bg-muted rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <DollarSign className="w-4 h-4 text-solar-foreground" aria-hidden />
                            <span className="font-medium text-foreground">Costs</span>
                          </div>
                          <p className="text-primary font-semibold">-{costPct}%</p>
                        </div>
                        <div className="bg-muted rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <Sun className="w-4 h-4 text-solar-foreground" aria-hidden />
                            <span className="font-medium text-foreground">System</span>
                          </div>
                          <p className="text-muted-foreground">
                            {f.solarCapacity} kW · {f.batteryCapacity} kWh
                          </p>
                        </div>
                        <div className="bg-muted rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <Leaf className="w-4 h-4 text-success" aria-hidden />
                            <span className="font-medium text-foreground">CO₂</span>
                          </div>
                          <p className="text-muted-foreground">{f.carbonEmissionReduction} kg/mo</p>
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0 mt-1" aria-hidden />
                  </div>
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

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
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="rounded-lg border border-border bg-muted p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" aria-hidden />
                      <span className="text-sm font-medium">Installation</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {new Date(selectedFacility.installationDate).toLocaleDateString()}
                    </p>
                    {selectedFacility.paygOperationalDate && (
                      <p className="text-sm text-muted-foreground">
                        PAYG: {new Date(selectedFacility.paygOperationalDate).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  {selectedFacility.smartMeterSerial && (
                    <div className="rounded-lg border border-border bg-muted p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Activity className="w-4 h-4 text-muted-foreground" aria-hidden />
                        <span className="text-sm font-medium">Meter</span>
                      </div>
                      <p className="text-sm font-mono text-muted-foreground">{selectedFacility.smartMeterSerial}</p>
                    </div>
                  )}
                </div>
                <div className="rounded-lg border border-border p-4 space-y-2">
                  <h4 className="text-sm font-semibold text-foreground mb-2">Energy</h4>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Before → After</span>
                    <span>{selectedFacility.energyConsumptionBefore} → {selectedFacility.energyConsumptionAfter} kWh</span>
                  </div>
                  <div className="flex justify-between text-sm font-semibold text-primary">
                    <span>Savings</span>
                    <span>{selectedFacility.monthlyEnergySavings} kWh</span>
                  </div>
                </div>
                <div className="rounded-lg border border-border p-4 space-y-2">
                  <h4 className="text-sm font-semibold text-foreground mb-2">Costs</h4>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Before → After</span>
                    <span>TZS {Number(selectedFacility.electricityCostBefore).toLocaleString()} → {Number(selectedFacility.electricityCostAfter).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm font-semibold text-primary">
                    <span>Savings</span>
                    <span>TZS {Number(selectedFacility.monthlyCostSavings).toLocaleString()}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg border border-border p-4">
                    <Sun className="w-4 h-4 text-solar-foreground mb-1" aria-hidden />
                    <p className="text-sm font-medium">{selectedFacility.solarCapacity} kW · {selectedFacility.batteryCapacity} kWh</p>
                  </div>
                  <div className="rounded-lg border border-border p-4">
                    <Leaf className="w-4 h-4 text-success mb-1" aria-hidden />
                    <p className="text-sm font-medium">{selectedFacility.carbonEmissionReduction} kg CO₂/month</p>
                  </div>
                </div>
                <div className="rounded-lg border border-border p-4 bg-muted/50">
                  <FacilityDetailSimulation facility={selectedFacility} />
                </div>
                {selectedFacility.notes && (
                  <div className="rounded-lg bg-primary/5 border border-primary/20 p-4">
                    <p className="text-sm text-foreground">{selectedFacility.notes}</p>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
