"use client"

import { useQuery } from "@tanstack/react-query"

export type AssessmentCycle = {
  id: string
  facilityId: string
  facilityName: string | null
  startedAt: string | null
  completedAt: string | null
  status: string // draft | completed | archived
  updatedAt: string | null
}

/** All assessment cycles across facilities (admin) / own facility (facility user). */
export function useAdminAssessmentCycles() {
  return useQuery({
    queryKey: ["admin-assessment-cycles"],
    queryFn: async () => {
      const res = await fetch("/api/assessment-cycles", { cache: "no-store" })
      if (!res.ok) throw new Error("Failed to load assessment cycles")
      const json = await res.json()
      if (!json?.success) throw new Error(json?.error || "Invalid response")
      return (json.cycles ?? []) as AssessmentCycle[]
    },
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  })
}
