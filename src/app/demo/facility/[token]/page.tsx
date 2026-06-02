'use client'

import { useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { getFacilityByToken } from '@/lib/facility-data'
import { StatCard } from '@/components/ui/stat-card'
import { Battery, DollarSign, Leaf, Sun, Zap, AlertCircle } from 'lucide-react'

export default function FacilityDemoPage({ params }: { params: { token: string } }) {
  const facility = getFacilityByToken(params.token)

  const dailyGeneration = useMemo(() => {
    if (!facility) return 0
    return facility.monthlySolarProductionKwh / 30
  }, [facility])

  if (!facility) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-border">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-destructive" aria-hidden />
            </div>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>Invalid facility token. Please check your access link.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-card border-b border-border p-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">{facility.name}</h1>
            <p className="text-muted-foreground mt-1">
              {facility.location} • {facility.facilityType}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">System Status</p>
            <Badge variant="success" className="mt-1">Operational</Badge>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard
            title="Daily Generation"
            value={`${dailyGeneration.toFixed(1)} kWh`}
            icon={<Sun />}
            accent="solar"
            meta={<span className="text-primary">↑ 12% vs yesterday</span>}
          />
          <StatCard
            title="Battery Level"
            value="78%"
            icon={<Battery />}
            accent="primary"
            meta={<Progress value={78} className="mt-1 h-1.5" />}
          />
          <StatCard
            title="Monthly Savings"
            value={`TSh ${(facility.monthlySolarSavings / 1000).toFixed(0)}k`}
            icon={<DollarSign />}
            accent="success"
            meta="vs grid electricity"
          />
          <StatCard
            title="CO2 Avoided"
            value={`${facility.co2AvoidedTons.toFixed(2)} tons`}
            icon={<Leaf />}
            accent="success"
            meta="Monthly"
          />
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="efficiency">Energy Efficiency</TabsTrigger>
            <TabsTrigger value="consumption">Consumption</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <Card>
              <CardHeader>
                <CardTitle>System Overview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm text-muted-foreground">System Size</label>
                      <p className="text-lg font-semibold text-foreground">{facility.systemSizeKw} kW</p>
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground">Battery Capacity</label>
                      <p className="text-lg font-semibold text-foreground">{facility.batteryCapacityKwh} kWh</p>
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground">Solar Panels</label>
                      <p className="text-lg font-semibold text-foreground">{facility.panelCount}</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm text-muted-foreground">Installation Date</label>
                      <p className="text-lg font-semibold text-foreground">{facility.installDate}</p>
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground">Contact Person</label>
                      <p className="text-lg font-semibold text-foreground">{facility.contactPerson}</p>
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground">Phone</label>
                      <p className="text-lg font-semibold text-foreground">{facility.contactPhone}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="efficiency">
            <Card>
              <CardHeader>
                <CardTitle>Energy Efficiency Assessment</CardTitle>
                <CardDescription>EEAT Score: {facility.eeatScore}/100</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm text-muted-foreground">Efficiency Rating</label>
                    <span className="text-lg font-semibold text-foreground">{facility.eeatScore}%</span>
                  </div>
                  <Progress value={facility.eeatScore} className="h-2" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-muted rounded-lg p-4">
                    <p className="text-sm text-muted-foreground mb-2">Peak Hours</p>
                    <p className="font-semibold text-foreground">{facility.peakHours}</p>
                  </div>
                  <div className="bg-muted rounded-lg p-4">
                    <p className="text-sm text-muted-foreground mb-2">Off-Peak Hours</p>
                    <p className="font-semibold text-foreground">{facility.offPeakHours}</p>
                  </div>
                  <div className="bg-muted rounded-lg p-4">
                    <p className="text-sm text-muted-foreground mb-2">Critical Load</p>
                    <p className="font-semibold text-foreground">{facility.criticalLoadKw} kW</p>
                  </div>
                  <div className="bg-muted rounded-lg p-4">
                    <p className="text-sm text-muted-foreground mb-2">Non-Critical Load</p>
                    <p className="font-semibold text-foreground">{facility.nonCriticalLoadKw} kW</p>
                  </div>
                </div>

                <Alert className="bg-primary/5 border-primary/20">
                  <AlertCircle className="h-4 w-4 text-primary" aria-hidden />
                  <AlertDescription className="text-foreground">
                    {facility.loadOptimizationPotential}% load optimization potential available
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="consumption">
            <Card>
              <CardHeader>
                <CardTitle>Monthly Consumption & Savings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="bg-destructive/5 rounded-lg p-6 border border-destructive/20">
                    <p className="text-sm text-muted-foreground mb-2">Grid Cost (If no solar)</p>
                    <p className="text-3xl font-bold text-foreground">TSh {(facility.monthlyGridCost / 1000).toFixed(0)}k</p>
                  </div>
                  <div className="bg-primary/5 rounded-lg p-6 border border-primary/20">
                    <p className="text-sm text-muted-foreground mb-2">Monthly Savings</p>
                    <p className="text-3xl font-bold text-primary">TSh {(facility.monthlySolarSavings / 1000).toFixed(0)}k</p>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground mb-3">Monthly Generation vs Consumption</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-muted rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-muted-foreground">Generation</span>
                        <Sun className="w-4 h-4 text-solar-foreground" aria-hidden />
                      </div>
                      <p className="text-2xl font-bold text-foreground">{facility.monthlySolarProductionKwh} kWh</p>
                    </div>
                    <div className="bg-muted rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-muted-foreground">Consumption</span>
                        <Zap className="w-4 h-4 text-primary" aria-hidden />
                      </div>
                      <p className="text-2xl font-bold text-foreground">{facility.monthlyConsumptionKwh} kWh</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payments">
            <Card>
              <CardHeader>
                <CardTitle>Payment & Credit</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-6">
                  <p className="text-sm text-muted-foreground mb-2">Available Credit</p>
                  <p className="text-4xl font-bold text-primary">TSh {facility.creditBalance.toLocaleString()}</p>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-foreground">Payment Model</h3>
                  <Badge variant={facility.paymentModel === 'payg' ? 'default' : 'secondary'}>
                    {facility.paymentModel.toUpperCase()}
                  </Badge>
                </div>

                <div className="space-y-4">
                  <Button className="w-full">
                    <DollarSign className="w-4 h-4 mr-2" aria-hidden />
                    Add Credit / Make Payment
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

