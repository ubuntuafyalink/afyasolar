"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

export type CarbonCredit = {
  id: string
  deviceId: string
  facilityId: string
  facilityName: string
  deviceSerial: string
  period: string
  startDate: string
  endDate: string
  energyGenerated: number
  co2Saved: number
  creditsEarned: number
  creditValue: number
  totalValue: number
  verificationStatus: "pending" | "verified" | "certified" | "rejected"
  certificateId?: string
  verifiedAt?: string
  verifiedBy?: string
  notes?: string
  createdAt: string
  updatedAt: string
  metadata: {
    efficiency: number
    operatingHours: number
    baselineEmissions: number
    gridEmissionFactor: number
    calculationMethod: string
  }
}

export type CarbonCreditFilters = {
  facilityId?: string
  deviceId?: string
  status?: string
  period?: string
}

const BASE_KEY = "admin-carbon-verification"

async function postTransition(action: "verify" | "certify" | "reject", id: string, note?: string) {
  const res = await fetch(`/api/admin/carbon-credits/${id}/${action}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ note }),
  })
  if (!res.ok) {
    const j = await res.json().catch(() => null)
    throw new Error(j?.error || `Failed to ${action} carbon credit`)
  }
  return res.json()
}

/**
 * Real carbon-credit review queue + verify/certify/reject mutations. Mirrors
 * use-admin-solar-alerts: mutations invalidate the list so the queue refreshes.
 * Acting admin identity + certificate id are stamped server-side.
 */
export function useAdminCarbonVerification(filters: CarbonCreditFilters = {}) {
  const qc = useQueryClient()
  const key = [
    BASE_KEY,
    filters.facilityId ?? "all",
    filters.deviceId ?? "all",
    filters.status ?? "all",
    filters.period ?? "all",
  ]

  const query = useQuery({
    queryKey: key,
    queryFn: async (): Promise<CarbonCredit[]> => {
      const params = new URLSearchParams({ limit: "50" })
      if (filters.facilityId) params.set("facilityId", filters.facilityId)
      if (filters.deviceId) params.set("deviceId", filters.deviceId)
      if (filters.status) params.set("status", filters.status)
      if (filters.period) params.set("period", filters.period)
      const res = await fetch(`/api/admin/carbon-credits?${params.toString()}`, { cache: "no-store" })
      if (!res.ok) throw new Error("Failed to load carbon credits")
      const json = await res.json()
      if (!json?.success) throw new Error(json?.error || "Invalid response")
      return json.data as CarbonCredit[]
    },
    refetchInterval: 60_000,
  })

  // Invalidate every filter variant of the list after a transition.
  const onSuccess = () => qc.invalidateQueries({ queryKey: [BASE_KEY] })

  const verify = useMutation({
    mutationFn: ({ id, note }: { id: string; note?: string }) => postTransition("verify", id, note),
    onSuccess,
  })
  const certify = useMutation({
    mutationFn: ({ id, note }: { id: string; note?: string }) => postTransition("certify", id, note),
    onSuccess,
  })
  const reject = useMutation({
    mutationFn: ({ id, note }: { id: string; note?: string }) => postTransition("reject", id, note),
    onSuccess,
  })

  return { query, verify, certify, reject }
}
