"use client"

import { useQuery } from "@tanstack/react-query"

export type SupportTicketLite = {
  id: string
  ticketNumber: string
  facilityId: string
  facilityName: string
  subject: string
  category: string
  priority: "low" | "medium" | "high" | "urgent" | string
  status: "open" | "in_progress" | "resolved" | "closed" | string
  createdAt: string
}

export type SystemLogLite = {
  id: string
  level: "info" | "warning" | "error" | "debug" | string
  category: string
  message: string
  timestamp: string
}

/** Support tickets (admin) — a notification source. Errors are isolated to this query. */
export function useAdminSupportTickets() {
  return useQuery({
    queryKey: ["admin-notif-support-tickets"],
    queryFn: async (): Promise<SupportTicketLite[]> => {
      const res = await fetch("/api/afya-solar/admin/support/tickets?status=all", { cache: "no-store" })
      if (!res.ok) throw new Error("Failed to load support tickets")
      const json = await res.json()
      if (!json?.success) throw new Error(json?.error || "Invalid response")
      return (json.data ?? []) as SupportTicketLite[]
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  })
}

/** System logs (admin) — a notification source. Errors are isolated to this query. */
export function useAdminSystemLogs() {
  return useQuery({
    queryKey: ["admin-notif-system-logs"],
    queryFn: async (): Promise<SystemLogLite[]> => {
      const res = await fetch("/api/afya-solar/admin/system/logs?level=all&limit=50", { cache: "no-store" })
      if (!res.ok) throw new Error("Failed to load system logs")
      const json = await res.json()
      if (!json?.success) throw new Error(json?.error || "Invalid response")
      return (json.data ?? []) as SystemLogLite[]
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  })
}
