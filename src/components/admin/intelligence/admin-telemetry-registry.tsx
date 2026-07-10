"use client"

import { useMemo } from "react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { StatCard } from "@/components/ui/stat-card"
import { DemoDataBadge } from "@/components/ui/demo-data-badge"
import { Wifi, WifiOff } from "lucide-react"
import {
  getTelemetryRegistry,
  type TelemetryRow,
} from "@/lib/dashboard/admin-portfolio-data"

function formatLastSeen(minsAgo: number): string {
  if (minsAgo <= 1) return "just now"
  if (minsAgo <= 60) return `${minsAgo} min ago`
  const hours = Math.round(minsAgo / 60)
  return `${hours} ${hours === 1 ? "hour" : "hours"} ago`
}

function OnlineBadge({ online }: { online: boolean }) {
  if (online) {
    return (
      <Badge variant="success">
        <Wifi aria-hidden className="size-3" />
        Online
      </Badge>
    )
  }
  return (
    <Badge variant="destructive">
      <WifiOff aria-hidden className="size-3" />
      Offline
    </Badge>
  )
}

function TelemetryRowItem({ row }: { row: TelemetryRow }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3">
      <div className="min-w-0">
        <span className="font-medium text-foreground">{row.facility.name}</span>
        <span className="ml-2 text-xs text-muted-foreground">{row.facility.region}</span>
        <p className="font-mono text-xs text-muted-foreground">{row.meterSerial}</p>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">
          Last seen {formatLastSeen(row.lastSeenMinsAgo)}
        </span>
        <OnlineBadge online={row.online} />
      </div>
    </li>
  )
}

export function AdminTelemetryRegistry() {
  const registry = useMemo(() => getTelemetryRegistry(), [])

  const onlineCount = registry.filter((r) => r.online).length
  const offlineCount = registry.length - onlineCount

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2">
            <Wifi aria-hidden className="size-5 text-primary" />
            Telemetry Registry
          </CardTitle>
          <DemoDataBadge />
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard
            title="Meters online"
            value={onlineCount}
            icon={<Wifi />}
            accent="success"
            meta="Reporting telemetry"
          />
          <StatCard
            title="Meters offline"
            value={offlineCount}
            icon={<WifiOff />}
            accent="destructive"
            meta="No recent data"
          />
          <StatCard
            title="Total meters"
            value={registry.length}
            icon={<Wifi />}
            accent="muted"
            meta="Registered devices"
          />
        </div>

        <ul className="space-y-2">
          {registry.map((row) => (
            <TelemetryRowItem key={row.facility.id} row={row} />
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
