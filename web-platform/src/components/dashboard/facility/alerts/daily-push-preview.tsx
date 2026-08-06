"use client"

import { MessageSquare, Smartphone } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DemoDataBadge } from "@/components/ui/demo-data-badge"
import { getDailyPushPreview } from "@/lib/dashboard/facility-demo-data"

/**
 * Spec 15.3: the daily 06:30 status push (WhatsApp + SMS). Surface only this
 * previews the message the facility would receive; nothing is sent from here.
 *
 * [data] composed from the local demo module. TODO: wire the real BullMQ push
 * job + WhatsApp Cloud API per spec Part 15.
 */
export function DailyPushPreview({
  facilityId,
  facilityName,
}: {
  facilityId?: string
  facilityName?: string | null
}) {
  const push = getDailyPushPreview(facilityId, facilityName)

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Smartphone className="size-5 text-primary" aria-hidden /> Daily 06:30 status push
          </CardTitle>
          <DemoDataBadge label="Preview only" />
        </div>
        <p className="text-xs text-muted-foreground">
          What you receive each morning by WhatsApp, with SMS backup.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="secondary" className="gap-1">
            <MessageSquare className="size-3" aria-hidden /> WhatsApp
          </Badge>
          <Badge variant="outline">SMS backup</Badge>
          <span>· sent at {push.time}</span>
        </div>
        {/* Chat bubble */}
        <div className="max-w-md rounded-2xl rounded-tl-sm border border-border bg-muted/40 p-3">
          <p className="text-sm font-medium text-foreground">{push.greeting}</p>
          <ul className="mt-1 space-y-0.5">
            {push.lines.map((line, i) => (
              <li key={i} className="text-sm text-muted-foreground">
                {line}
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
