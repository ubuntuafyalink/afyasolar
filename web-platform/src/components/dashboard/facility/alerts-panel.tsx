"use client"

import { BellRing } from "lucide-react"

import { getFacilityAlerts } from "@/lib/dashboard/facility-demo-data"
import { AlertCard } from "./alerts/alert-card"
import { DailyPushPreview } from "./alerts/daily-push-preview"

/**
 * Spec 11.3 / 15 (I42I46): additive alerts surface for the existing
 * Notifications section heatwave, flood, outage-probability and climate-disease
 * alerts, plus a preview of the daily 06:30 status push. All [data] (demo).
 */
export function AlertsPanel({
  facilityId,
  facilityName,
}: {
  facilityId?: string
  facilityName?: string | null
}) {
  const alerts = getFacilityAlerts(facilityId)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <BellRing className="size-5 text-primary" aria-hidden />
        <h2 className="text-lg font-semibold text-foreground">Climate &amp; power alerts</h2>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        {alerts.map((alert) => (
          <AlertCard key={alert.kind} alert={alert} />
        ))}
      </div>
      <DailyPushPreview facilityId={facilityId} facilityName={facilityName} />
    </div>
  )
}
