"use client"

import { Clock } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { getServiceHoursRemaining } from "@/lib/dashboard/facility-demo-data"

/**
 * Spec 8.2 "Umeme detail": service-hours-remaining estimate —
 * "At current usage, your facility can deliver critical services until 06:47 tomorrow."
 */
export function ServiceHoursRemaining({
  facilityId,
  batteryLevel,
}: {
  facilityId?: string
  batteryLevel?: number
}) {
  const est = getServiceHoursRemaining(facilityId, batteryLevel)

  return (
    <Card className="border-2 border-primary/20 bg-primary/5">
      <CardContent className="flex items-center gap-4 p-5">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Clock className="size-7" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">
            At current usage, you can keep critical services running until
          </p>
          <p className="text-2xl font-bold tracking-tight text-foreground">{est.untilLabel}</p>
          <p className="text-xs text-muted-foreground">
            ~{est.hours} hours · critical load {est.criticalLoadKw} kW
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
