"use client"

import { useQuery } from "@tanstack/react-query"

export type AdminFinancingContract = {
  id: string
  customerId: string
  facilityName: string | null
  facilityStatus: string | null
  principalIssued: number | string
  amountPaid: number | string
  outstandingBalance: number | string
  daysOverdue: number | string
  status: string
}

export type AdminPaygFinancingSummary = {
  contracts: AdminFinancingContract[]
  kpis: {
    totalOutstanding: number
    totalPaid: number
    nextDueAmount: number
    nextDueDate: string | null
    overdueCount: number
    activeContracts: number
    completedContracts: number
    defaultedContracts: number
    totalContracts: number
  }
}

/** Portfolio-wide PAYG / financing summary (admin only). */
export function useAdminPaygFinancing() {
  return useQuery({
    queryKey: ["admin-payg-financing-summary"],
    queryFn: async () => {
      const res = await fetch("/api/admin/payg-financing/summary", { cache: "no-store" })
      if (!res.ok) throw new Error("Failed to load financing summary")
      return (await res.json()) as AdminPaygFinancingSummary
    },
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  })
}
