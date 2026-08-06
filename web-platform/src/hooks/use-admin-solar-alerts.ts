"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

export type SolarAlert = {
  id: string
  deviceId: string
  deviceSerial: string
  facilityName: string
  type: string
  severity: "critical" | "high" | "medium" | "low" | string
  title: string
  message: string
  timestamp: string | null
  status: "active" | "acknowledged" | "resolved" | "dismissed" | string
  acknowledgedBy?: string | null
  acknowledgedAt?: string | null
  resolvedBy?: string | null
  resolvedAt?: string | null
  value: number
  threshold: number
}

const KEY = ["admin-solar-alerts"]

/** Real device alerts across the portfolio + acknowledge/resolve mutations. */
export function useAdminSolarAlerts() {
  const qc = useQueryClient()

  const query = useQuery({
    queryKey: KEY,
    queryFn: async () => {
      const res = await fetch("/api/admin/solar/alerts?status=all&severity=all", { cache: "no-store" })
      if (!res.ok) throw new Error("Failed to load alerts")
      const json = await res.json()
      if (!json?.success) throw new Error(json?.error || "Invalid response")
      return json.data as SolarAlert[]
    },
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  })

  const acknowledge = useMutation({
    mutationFn: async ({ id, acknowledgedBy }: { id: string; acknowledgedBy: string }) => {
      const res = await fetch(`/api/admin/solar/alerts/${id}/acknowledge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acknowledgedBy }),
      })
      if (!res.ok) throw new Error("Failed to acknowledge alert")
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })

  const resolve = useMutation({
    mutationFn: async ({ id, resolvedBy, resolution }: { id: string; resolvedBy: string; resolution?: string }) => {
      const res = await fetch(`/api/admin/solar/alerts/${id}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resolvedBy, resolution: resolution ?? "Resolved from intelligence console" }),
      })
      if (!res.ok) throw new Error("Failed to resolve alert")
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })

  const generate = useMutation({
    mutationFn: async (opts?: { dryRun?: boolean }) => {
      const res = await fetch("/api/admin/intelligence/generate-alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dryRun: opts?.dryRun ?? false }),
      })
      if (!res.ok) throw new Error("Failed to run climate alert scan")
      return res.json() as Promise<{
        success: boolean
        dryRun: boolean
        scanned: number
        created: number
        skipped: { duplicate: number; noDevice: number }
      }>
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })

  return { query, acknowledge, resolve, generate }
}
