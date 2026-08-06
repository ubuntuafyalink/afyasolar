"use client"

import { useQuery } from "@tanstack/react-query"

export type SolarDevice = {
  id: string
  serialNumber: string
  type: string
  facilityId: string
  facilityName: string
  status: "online" | "offline" | "maintenance" | "error" | string
  lastSeen: string
  efficiency: number
  batteryLevel: number
  temperature: number
  powerOutput: number
  location: string
  installDate: string
  firmwareVersion: string
  alerts: number
}

/** All solar devices with latest health/telemetry across the portfolio (admin). */
export function useAdminSolarDevices() {
  return useQuery({
    queryKey: ["admin-solar-devices"],
    queryFn: async () => {
      const res = await fetch("/api/admin/solar/devices", { cache: "no-store" })
      if (!res.ok) throw new Error("Failed to load devices")
      const json = await res.json()
      if (!json?.success) throw new Error(json?.error || "Invalid response")
      return json.data as SolarDevice[]
    },
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  })
}
