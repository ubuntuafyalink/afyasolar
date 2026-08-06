"use client"

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search, MapPin, RefreshCw, Info, AlertTriangle } from 'lucide-react'
import { useAdminSolarOps } from '@/hooks/use-admin-solar-ops'

const TIER_LABEL: Record<number, string> = { 3: 'Resilient', 2: 'Developing', 1: 'At risk', 0: 'Critical' }

function subColor(status: string | null): string {
  switch ((status || '').toLowerCase()) {
    case 'active':
      return 'bg-green-100 text-green-800'
    case 'suspended':
    case 'cancelled':
      return 'bg-red-100 text-red-800'
    case 'pending':
      return 'bg-yellow-100 text-yellow-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

function fmtDate(iso: string | null): string {
  if (!iso) return 'Never'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? 'Never' : d.toLocaleDateString()
}

export function AdminSolarFacilityStatus() {
  const { data: ops = [], isLoading, refetch } = useAdminSolarOps()
  const [search, setSearch] = useState('')

  const rows = ops.filter((f) => {
    const q = search.toLowerCase()
    return f.facilityName.toLowerCase().includes(q) || (f.region || '').toLowerCase().includes(q)
  })

  const activeSubs = ops.filter((f) => (f.subscriptionStatus || '').toLowerCase() === 'active').length

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading facility status...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold">Facility Status</h2>
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <Info className="h-3.5 w-3.5" />
            No live device telemetry - status reflects subscription, assessments, and climate exposure.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Facilities</p>
            <p className="text-2xl font-bold">{ops.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Active subscriptions</p>
            <p className="text-2xl font-bold">{activeSubs}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Climate critical</p>
            <p className="text-2xl font-bold">{ops.filter((f) => f.criticalAttention).length}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Facilities ({rows.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search facilities..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="space-y-3">
            {rows.map((f) => (
              <div key={f.facilityId} className="border rounded-lg p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-semibold truncate">{f.facilityName}</h3>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {f.region || 'Unknown region'}
                      {f.systemKw != null ? ` • ${f.systemKw} kW` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {f.criticalAttention && (
                      <Badge variant="destructive" className="text-[10px]">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Critical
                      </Badge>
                    )}
                    <Badge className={subColor(f.subscriptionStatus)}>
                      {f.subscriptionStatus || 'no subscription'}
                    </Badge>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3 text-xs">
                  <div>
                    <p className="text-muted-foreground">Resilience</p>
                    <p className="font-medium">
                      {f.rcs != null ? `${f.rcs}${f.tier != null ? ` (${TIER_LABEL[f.tier] ?? ''})` : ''}` : 'Not assessed'}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Hazard exposure</p>
                    <p className="font-medium">
                      {f.topHazard && f.topHazard.type ? `${f.topHazard.type} (${f.topHazard.score})` : 'n/a'}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Energy assessed</p>
                    <p className="font-medium">{fmtDate(f.energyAssessmentDate)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Climate assessed</p>
                    <p className="font-medium">{fmtDate(f.climateAssessmentDate)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {rows.length === 0 && (
            <div className="text-center py-8">
              <MapPin className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900">No facilities found</h3>
              <p className="text-gray-500">Try a different search.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default AdminSolarFacilityStatus
