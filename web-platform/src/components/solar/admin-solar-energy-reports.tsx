import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FileText, Zap, TrendingUp, BarChart3, RefreshCw, Info } from 'lucide-react'
import { useAdminSolarOps } from '@/hooks/use-admin-solar-ops'

export function AdminSolarEnergyReports() {
  const { data: ops = [], isLoading, refetch } = useAdminSolarOps()

  const rows = ops.filter((f) => f.estimatedDailyKwh != null)

  const totals = rows.reduce(
    (acc, f) => ({
      annualKwh: acc.annualKwh + (f.estimatedAnnualKwh || 0),
      savings: acc.savings + (f.estimatedAnnualSavingsTzs || 0),
      co2: acc.co2 + (f.estimatedAnnualCo2Kg || 0),
      dailyLoad: acc.dailyLoad + (f.dailyLoadKwh || 0),
    }),
    { annualKwh: 0, savings: 0, co2: 0, dailyLoad: 0 },
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading estimated energy...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold">Estimated Energy & Savings</h2>
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <Info className="h-3.5 w-3.5" />
            Estimated from system design + climate (NASA peak-sun-hours). Not metered telemetry.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-muted-foreground">Est. Annual Generation</p>
                <p className="text-2xl font-bold">{totals.annualKwh.toLocaleString()} kWh</p>
              </div>
              <Zap className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-muted-foreground">Est. Daily Load</p>
                <p className="text-2xl font-bold">{Math.round(totals.dailyLoad).toLocaleString()} kWh</p>
              </div>
              <BarChart3 className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-muted-foreground">Est. Annual Savings (TZS)</p>
                <p className="text-2xl font-bold">{totals.savings.toLocaleString()}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-muted-foreground">Est. Annual CO2 Avoided</p>
                <p className="text-2xl font-bold">{totals.co2.toLocaleString()} kg</p>
              </div>
              <FileText className="h-8 w-8 text-indigo-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Per-facility estimates ({rows.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {rows.map((f) => (
              <div key={f.facilityId} className="border rounded p-4">
                <div className="flex justify-between items-start gap-4">
                  <div className="min-w-0">
                    <h3 className="font-semibold truncate">{f.facilityName}</h3>
                    <p className="text-sm text-muted-foreground">
                      {f.region || 'Unknown region'}
                      {f.systemKw != null ? ` • ${f.systemKw} kW system` : ''}
                      {f.peakSunHours != null ? ` • ${f.peakSunHours} PSH` : ''}
                    </p>
                  </div>
                  <Badge variant={f.estimatedSource === 'assessment' ? 'default' : 'secondary'}>
                    {f.estimatedSource === 'assessment' ? 'design estimate' : 'modeled'}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Est. daily</p>
                    <p className="font-medium">{f.estimatedDailyKwh} kWh</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Est. annual</p>
                    <p className="font-medium">{(f.estimatedAnnualKwh || 0).toLocaleString()} kWh</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Daily load</p>
                    <p className="font-medium">{f.dailyLoadKwh != null ? `${f.dailyLoadKwh} kWh` : 'n/a'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Est. annual savings</p>
                    <p className="font-medium">
                      {f.estimatedAnnualSavingsTzs != null ? `${f.estimatedAnnualSavingsTzs.toLocaleString()} TZS` : 'n/a'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {rows.length === 0 && (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900">No energy estimates yet</h3>
              <p className="text-gray-500">
                Estimates appear once a facility has an energy assessment, or a subscription system size plus
                climate data.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default AdminSolarEnergyReports
