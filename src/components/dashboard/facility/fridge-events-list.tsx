"use client"

import { DoorOpen, ThermometerSun, ClipboardPen, Wrench } from "lucide-react"
import type { LucideIcon } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { getFridgeEvents, type FridgeEventType } from "@/lib/dashboard/facility-demo-data"

const EVENT_META: Record<
  FridgeEventType,
  { icon: LucideIcon; tint: string }
> = {
  door: { icon: DoorOpen, tint: "bg-muted text-muted-foreground" },
  excursion: { icon: ThermometerSun, tint: "bg-destructive/10 text-destructive" },
  manual: { icon: ClipboardPen, tint: "bg-primary/10 text-primary" },
  maintenance: { icon: Wrench, tint: "bg-warning/15 text-warning-foreground" },
}

function timeAgo(iso: string): string {
  const mins = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60_000))
  if (mins < 60) return `${mins} min ago`
  const hrs = Math.round(mins / 60)
  return hrs < 24 ? `${hrs} h ago` : `${Math.round(hrs / 24)} d ago`
}

/** Spec 8.2 "Friji detail": events list — door openings, excursions, manual readings, maintenance. */
export function FridgeEventsList({ facilityId }: { facilityId?: string }) {
  const events = [...getFridgeEvents(facilityId)].sort(
    (a, b) => new Date(b.atIso).getTime() - new Date(a.atIso).getTime(),
  )

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Recent events</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {events.map((event) => {
            const meta = EVENT_META[event.type]
            const Icon = meta.icon
            return (
              <li key={event.id} className="flex items-start gap-3 rounded-lg border border-border p-3">
                <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", meta.tint)}>
                  <Icon className="size-5" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">{event.title}</p>
                  <p className="text-xs text-muted-foreground">{event.detail}</p>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">{timeAgo(event.atIso)}</span>
              </li>
            )
          })}
        </ul>
      </CardContent>
    </Card>
  )
}
