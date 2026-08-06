import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Gauge, ShieldCheck, RefreshCw, Info, AlertTriangle } from 'lucide-react'
import { useAdminSolarOps } from '@/hooks/use-admin-solar-ops'
import { gradeFromScore } from '@/lib/solar/ops-estimate'

const TIER_LABEL: Record<number, string> = { 3: 'Resilient', 2: 'Developing', 1: 'At risk', 0: 'Critical' }

function avg(nums: number[]): number | null {
  const vals = nums.filter((n) => Number.isFinite(n))
  if (!vals.length) return null
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
}

export function AdminSolarPerformance() {
  const { data: ops = [], isLoading, refetch } = useAdminSolarOps()

  const withEnergy = ops.filter((f) => f.bmiPercent != null)
  const withClimate = ops.filter((f) => f.rcs != null)
  const rows = ops.filter((f) => f.bmiPercent != null || f.rcs != null)

  const avgBmi = avg(withEnergy.map((f) => f.bmiPercent as number))
  const avgRcs = avg(withClimate.map((f) => f.rcs as number))

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading readiness...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold">Assessment Readiness</h2>
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <Info className="h-3.5 w-3.5" />
            Energy maturity (BMI) and climate resilience (RCS) from facility assessments. Not device telemetry.
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
            <p className="text-sm text-muted-foreground">Avg Energy Maturity (BMI)</p>
            <p className="text-2xl font-bold">{avgBmi != null ? `${avgBmi}%` : 'No data'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Avg Resilience (RCS)</p>
            <p className="text-2xl font-bold">{avgRcs != null ? avgRcs : 'No data'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Energy Assessed</p>
            <p className="text-2xl font-bold">{withEnergy.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Climate Assessed</p>
            <p className="text-2xl font-bold">{withClimate.length}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Per-facility readiness ({rows.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {rows.map((f) => (
              <div key={f.facilityId} className="border rounded-lg p-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="min-w-0">
                    <h3 className="font-semibold truncate">{f.facilityName}</h3>
                    <p className="text-sm text-muted-foreground">{f.region || 'Unknown region'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {f.criticalAttention && (
                      <Badge variant="destructive" className="text-[10px]">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Critical
                      </Badge>
                    )}
                    {f.tier != null && <Badge variant="secondary">{TIER_LABEL[f.tier] ?? `Tier ${f.tier}`}</Badge>}
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
                  <div className="flex items-center gap-2">
                    <Gauge className="h-4 w-4 text-primary" />
                    <div>
                      <p className="text-xs text-muted-foreground">Energy BMI</p>
                      <p className="text-sm font-medium">
                        {f.bmiPercent != null ? `${f.bmiPercent}% (${gradeFromScore(f.bmiPercent)})` : 'Not assessed'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-emerald-600" />
                    <div>
                      <p className="text-xs text-muted-foreground">Resilience RCS</p>
                      <p className="text-sm font-medium">
                        {f.rcs != null ? `${f.rcs} (${gradeFromScore(f.rcs)})` : 'Not assessed'}
                      </p>
                    </div>
                  </div>
                  {f.sectionScores ? (
                    <div className="md:col-span-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                      <span>Reliability: {f.sectionScores.reliability}/10</span>
                      <span>Wastage: {f.sectionScores.wastage}/10</span>
                      <span>Thermal: {f.sectionScores.thermal}/10</span>
                      <span>Behavior: {f.sectionScores.behavior}/10</span>
                    </div>
                  ) : (
                    <div className="md:col-span-2 text-xs text-muted-foreground self-center">
                      Section breakdown not recorded
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {rows.length === 0 && (
            <div className="text-center py-8">
              <Gauge className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900">No assessments yet</h3>
              <p className="text-gray-500">Readiness appears once facilities complete an energy or climate assessment.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default AdminSolarPerformance
