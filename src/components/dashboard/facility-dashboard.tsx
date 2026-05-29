"use client"

import { useState } from "react"
import { useFacility } from "@/hooks/use-facilities"
import { useLiveEnergyData } from "@/hooks/use-energy-data"
import { DashboardSkeleton } from "@/components/ui/skeleton"
import { FacilityDashboardContent } from "./facility-dashboard-content"

interface FacilityDashboardProps {
  facilityId?: string
}

export function FacilityDashboard({ facilityId }: FacilityDashboardProps) {
  const { data: facility, isLoading: facilityLoading } = useFacility(facilityId)
  const { data: liveData, isLoading: dataLoading } = useLiveEnergyData(facilityId)

  if (facilityLoading || dataLoading) {
    return (
      <div className="min-h-screen bg-muted/30 p-6">
        <DashboardSkeleton />
      </div>
    )
  }

  return <FacilityDashboardContent facility={facility} liveData={liveData} />
}

