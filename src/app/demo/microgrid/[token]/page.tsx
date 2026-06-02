'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { StatCard } from '@/components/ui/stat-card'
import { AlertCircle, BarChart3, DollarSign, Home, Plug, Zap } from 'lucide-react'

const MICROGRID_CONSUMERS = {
  'afx-worker-house-001': {
    id: 'worker-house-001',
    name: 'Staff House - Dr. Emmanuel',
    type: 'staff_housing',
    parentFacility: 'Arafa Majumba Sita Health Center',
    parentFacilityId: 'arafa-majumba-sita',
    meterId: 'MG-0056',
    meterSerial: 'SN-MG-0056-2025',
    tariffPerKwh: 450,
    monthlyUsage: 45,
    monthlyCost: 20250,
    balance: 12500,
    phone: '+255 712 445 678',
    address: 'Staff Quarters, Arafa Majumba',
    registeredAt: '2025-09-10',
    status: 'active',
    appliances: [
      { name: 'LED Lighting', power: 100, usage: 5 },
      { name: 'Refrigerator', power: 150, usage: 8 },
      { name: 'Water Pump', power: 500, usage: 4 },
      { name: 'Ceiling Fans', power: 200, usage: 6 },
      { name: 'TV/Entertainment', power: 150, usage: 3 },
    ],
    dailyUsage: 1.5,
    dailyCost: 675,
  },
  'afx-pharmacy-microgrid-001': {
    id: 'pharmacy-001',
    name: 'Arafa Pharmacy - Microenterprise',
    type: 'nearby_business',
    parentFacility: 'Arafa Majumba Sita Health Center',
    parentFacilityId: 'arafa-majumba-sita',
    meterId: 'MG-0057',
    meterSerial: 'SN-MG-0057-2025',
    tariffPerKwh: 500,
    monthlyUsage: 120,
    monthlyCost: 60000,
    balance: 35000,
    phone: '+255 712 556 789',
    address: 'Arafa Shopping Complex, Dar es Salaam',
    registeredAt: '2025-08-15',
    status: 'active',
    appliances: [
      { name: 'Refrigeration Unit', power: 800, usage: 8 },
      { name: 'LED Lighting', power: 300, usage: 10 },
      { name: 'Air Conditioning', power: 2000, usage: 6 },
      { name: 'POS System', power: 200, usage: 12 },
      { name: 'Water Heater', power: 1500, usage: 2 },
    ],
    dailyUsage: 4.0,
    dailyCost: 2000,
  },
}

export default function MicrogridConsumerPage({ params }: { params: { token: string } }) {
  const consumer = MICROGRID_CONSUMERS[params.token as keyof typeof MICROGRID_CONSUMERS]

  if (!consumer) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-border">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-destructive" aria-hidden />
            </div>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>Invalid microgrid consumer token. Please check your access link.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  const isBusiness = consumer.type === 'nearby_business'

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-card border-b border-border p-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-3 mb-2">
              {isBusiness ? <Plug className="w-6 h-6 text-primary" aria-hidden /> : <Home className="w-6 h-6 text-primary" aria-hidden />}
              <h1 className="text-2xl font-semibold text-foreground">{consumer.name}</h1>
            </div>
            <p className="text-muted-foreground mt-1">
              {consumer.address} • Powered by {consumer.parentFacility}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Connection Status</p>
            <Badge variant={consumer.status === 'active' ? 'success' : 'destructive'} className="mt-1">
              {consumer.status === 'active' ? '✓ Connected' : 'Disconnected'}
            </Badge>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard
            title="Today's Usage"
            value={`${consumer.dailyUsage.toFixed(1)} kWh`}
            icon={<Zap />}
            accent="solar"
            meta={`TSh ${consumer.dailyCost.toLocaleString()}`}
          />
          <StatCard
            title="Monthly Usage"
            value={`${consumer.monthlyUsage} kWh`}
            icon={<BarChart3 />}
            accent="primary"
            meta={`Avg ${(consumer.monthlyUsage / 30).toFixed(1)} kWh/day`}
          />
          <StatCard
            title="Available Balance"
            value={`TSh ${consumer.balance.toLocaleString()}`}
            icon={<DollarSign />}
            accent="success"
            meta={`Days remaining: ${Math.floor(consumer.balance / consumer.dailyCost)}`}
          />
          <StatCard
            title="Tariff Rate"
            value={`TSh ${consumer.tariffPerKwh}`}
            icon={<Plug />}
            accent="muted"
            meta="per kWh"
          />
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="appliances">Appliances</TabsTrigger>
            <TabsTrigger value="consumption">Usage History</TabsTrigger>
            <TabsTrigger value="billing">Billing</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Connection Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm text-muted-foreground">Meter ID</label>
                    <p className="text-lg font-semibold text-foreground">{consumer.meterId}</p>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Meter Serial</label>
                    <p className="text-lg font-semibold text-foreground font-mono">{consumer.meterSerial}</p>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Connection Date</label>
                    <p className="text-lg font-semibold text-foreground">{consumer.registeredAt}</p>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Contact</label>
                    <p className="text-lg font-semibold text-foreground">{consumer.phone}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Parent Facility</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm text-muted-foreground">Facility Name</label>
                    <p className="text-lg font-semibold text-foreground">{consumer.parentFacility}</p>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Power Source</label>
                    <p className="text-lg font-semibold text-foreground">Solar Microgrid (10kW)</p>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Grid Status</label>
                    <div className="mt-2">
                      <Badge variant="success">Online & Supplying Power</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="appliances">
            <Card>
              <CardHeader>
                <CardTitle>Active Appliances</CardTitle>
                <CardDescription>Device power consumption breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {consumer.appliances.map((appliance, idx) => (
                    <div key={idx} className="bg-muted rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="font-semibold text-foreground">{appliance.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {appliance.power}W × {appliance.usage}h/day
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-foreground">{(appliance.power * appliance.usage / 1000).toFixed(2)} kWh/day</p>
                          <p className="text-xs text-muted-foreground">
                            TSh {((appliance.power * appliance.usage / 1000) * consumer.tariffPerKwh).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <Progress value={(appliance.power / 2000) * 100} className="h-1" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="consumption">
            <Card>
              <CardHeader>
                <CardTitle>Usage Trends</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <Alert className="bg-primary/5 border-primary/20">
                  <BarChart3 className="h-4 w-4 text-primary" aria-hidden />
                  <AlertDescription className="text-foreground">
                    Your usage is {consumer.monthlyUsage > 100 ? 'high' : 'moderate'} compared to similar {consumer.type === 'nearby_business' ? 'businesses' : 'residences'} on this microgrid.
                  </AlertDescription>
                </Alert>

                <div className="bg-muted rounded-lg p-6">
                  <p className="text-sm text-muted-foreground mb-4">Last 7 Days Average</p>
                  <p className="text-4xl font-bold text-foreground">{(consumer.monthlyUsage / 30 * 7).toFixed(1)} kWh</p>
                  <p className="text-sm text-muted-foreground mt-2">≈ {(consumer.dailyUsage * 7).toFixed(1)} kWh for this week</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="billing">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Current Bill</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-muted rounded-lg p-4">
                    <div className="flex justify-between mb-2">
                      <span className="text-muted-foreground">Monthly Usage</span>
                      <span className="text-foreground font-semibold">{consumer.monthlyUsage} kWh</span>
                    </div>
                    <div className="flex justify-between mb-2">
                      <span className="text-muted-foreground">Rate</span>
                      <span className="text-foreground font-semibold">TSh {consumer.tariffPerKwh}/kWh</span>
                    </div>
                    <div className="border-t border-border pt-2 mt-2">
                      <div className="flex justify-between">
                        <span className="text-primary font-semibold">Total Due</span>
                        <span className="text-2xl font-bold text-primary">TSh {consumer.monthlyCost.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Account Balance</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-primary/5 rounded-lg p-6 border border-primary/20">
                    <p className="text-sm text-muted-foreground mb-2">Available Credit</p>
                    <p className="text-4xl font-bold text-primary">TSh {consumer.balance.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground mt-3">
                      Sufficient for {Math.floor(consumer.balance / consumer.dailyCost)} more days
                    </p>
                  </div>

                  <Button className="w-full">
                    <DollarSign className="w-4 h-4 mr-2" aria-hidden />
                    Add Credit / Top Up
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

