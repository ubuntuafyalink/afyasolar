import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { BarChart3, Zap, ShieldCheck, MapPin, RefreshCw, Info } from 'lucide-react'
import { useAdminSolarOps } from '@/hooks/use-admin-solar-ops'

const TIER_LABEL: Record<number, string> = { 3: 'Resilient', 2: 'Developing', 1: 'At risk', 0: 'Critical' }
const TIER_COLOR: Record<number, string> = {
  3: 'bg-green-100 text-green-800',
  2: 'bg-blue-100 text-blue-800',
  1: 'bg-yellow-100 text-yellow-800',
  0: 'bg-red-100 text-red-800',
}

function avg(nums: number[]): number | null {
  const vals = nums.filter((n) => Number.isFinite(n))
  if (!vals.length) return null
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
}

export function AdminSolarAnalytics() {
  const { data: ops = [], isLoading, refetch } = useAdminSolarOps()

  const totalFacilities = ops.length
  const withClimate = ops.filter((f) => f.rcs != null)
  const withEnergy = ops.filter((f) => f.bmiPercent != null)
  const avgRcs = avg(withClimate.map((f) => f.rcs as number))
  const avgBmi = avg(withEnergy.map((f) => f.bmiPercent as number))
  const totalAnnualKwh = ops.reduce((s, f) => s + (f.estimatedAnnualKwh || 0), 0)
  const totalSavings = ops.reduce((s, f) => s + (f.estimatedAnnualSavingsTzs || 0), 0)

  const tierCounts: Record<number, number> = { 3: 0, 2: 0, 1: 0, 0: 0 }
  for (const f of withClimate) if (f.tier != null && tierCounts[f.tier] != null) tierCounts[f.tier] += 1

  // By region
  const regionMap = new Map<string, { count: number; rcs: number[]; kwh: number }>()
  for (const f of ops) {
    const region = f.region || 'Unknown'
    const entry = regionMap.get(region) || { count: 0, rcs: [], kwh: 0 }
    entry.count += 1
    if (f.rcs != null) entry.rcs.push(f.rcs)
    entry.kwh += f.estimatedAnnualKwh || 0
    regionMap.set(region, entry)
  }
  const regions = Array.from(regionMap.entries())
    .map(([region, v]) => ({ region, count: v.count, avgRcs: avg(v.rcs), kwh: Math.round(v.kwh) }))
    .sort((a, b) => b.count - a.count)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading portfolio analytics...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold">Portfolio Analytics</h2>
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <Info className="h-3.5 w-3.5" />
            Aggregated from facility assessments + climate. Generation figures are estimated, not metered.
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
            <p className="text-sm text-muted-foreground">Facilities</p>
            <p className="text-2xl font-bold">{totalFacilities}</p>
            <p className="text-xs text-muted-foreground">{withEnergy.length} energy / {withClimate.length} climate assessed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Resilience (RCS)</p>
                <p className="text-2xl font-bold">{avgRcs != null ? avgRcs : 'No data'}</p>
                <p className="text-xs text-muted-foreground">Avg BMI {avgBmi != null ? `${avgBmi}%` : 'n/a'}</p>
              </div>
              <ShieldCheck className="h-8 w-8 text-emerald-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Est. Annual Generation</p>
                <p className="text-2xl font-bold">{totalAnnualKwh.toLocaleString()} kWh</p>
              </div>
              <Zap className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Est. Annual Savings (TZS)</p>
                <p className="text-2xl font-bold">{totalSavings.toLocaleString()}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Resilience tier distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {withClimate.length === 0 ? (
              <p className="text-sm text-gray-500">No climate assessments yet.</p>
            ) : (
              <div className="space-y-2">
                {[3, 2, 1, 0].map((tier) => (
                  <div key={tier} className="flex items-center justify-between">
                    <Badge className={TIER_COLOR[tier]}>{TIER_LABEL[tier]}</Badge>
                    <span className="text-sm font-medium">{tierCounts[tier]}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>By region</CardTitle>
          </CardHeader>
          <CardContent>
            {regions.length === 0 ? (
              <p className="text-sm text-gray-500">No facilities.</p>
            ) : (
              <div className="space-y-3">
                {regions.map((r) => (
                  <div key={r.region} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                      {r.region}
                    </span>
                    <span className="text-muted-foreground">
                      {r.count} facilities • RCS {r.avgRcs ?? 'n/a'} • {r.kwh.toLocaleString()} kWh/yr est.
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default AdminSolarAnalytics
