"use client"

import { useMemo } from "react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { StatCard } from "@/components/ui/stat-card"
import { Wifi, WifiOff } from "lucide-react"
import { useAdminSolarDevices, type SolarDevice } from "@/hooks/use-admin-solar-devices"

function formatLastSeen(iso: string): string {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return "unknown"
  const minsAgo = Math.max(0, Math.round((Date.now() - then) / 60000))
  if (minsAgo <= 1) return "just now"
  if (minsAgo <= 60) return `${minsAgo} min ago`
  const hours = Math.round(minsAgo / 60)
  if (hours <= 48) return `${hours} ${hours === 1 ? "hour" : "hours"} ago`
  const days = Math.round(hours / 24)
  return `${days} ${days === 1 ? "day" : "days"} ago`
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

function DeviceRowItem({ row }: { row: SolarDevice }) {
  const online = row.status === "online"
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3">
      <div className="min-w-0">
        <span className="font-medium text-foreground">{row.facilityName}</span>
        <span className="ml-2 text-xs text-muted-foreground capitalize">{row.type}</span>
        <p className="font-mono text-xs text-muted-foreground">{row.serialNumber}</p>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Last seen {formatLastSeen(row.lastSeen)}</span>
        <OnlineBadge online={online} />
      </div>
    </li>
  )
}

export function AdminTelemetryRegistry() {
  const { data, isLoading, isError } = useAdminSolarDevices()
  const devices = useMemo(() => data ?? [], [data])

  const onlineCount = devices.filter((r) => r.status === "online").length
  const offlineCount = devices.length - onlineCount

  if (isLoading) {
    return <div className="h-64 animate-pulse rounded-lg bg-muted" />
  }
  if (isError) {
    return <p className="text-sm text-destructive">Could not load telemetry. Please retry.</p>
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2">
            <Wifi aria-hidden className="size-5 text-primary" />
            Telemetry Registry
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard title="Devices online" value={onlineCount} icon={<Wifi />} accent="success" meta="Reporting telemetry" />
          <StatCard title="Devices offline" value={offlineCount} icon={<WifiOff />} accent="destructive" meta="No recent data" />
          <StatCard title="Total devices" value={devices.length} icon={<Wifi />} accent="muted" meta="Registered devices" />
        </div>

        {devices.length === 0 ? (
          <p className="text-sm text-muted-foreground">No devices registered yet.</p>
        ) : (
          <ul className="space-y-2">
            {devices.map((row) => (
              <DeviceRowItem key={row.id} row={row} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
