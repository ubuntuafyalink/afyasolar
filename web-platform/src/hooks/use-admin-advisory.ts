"use client"

import { useQuery } from "@tanstack/react-query"

import type {
  AdvisoryPriorityFacility,
  PortfolioAdvisoryAggregate,
} from "@/lib/ai/portfolio-advisory-server"

export type AdminAdvisoryData = {
  advisory: string
  source: "llm" | "fallback"
  model?: string
  generatedAt: string
  aggregate: PortfolioAdvisoryAggregate
  top: AdvisoryPriorityFacility[]
}

/** Portfolio advisory (fleet briefing + ranked priority facilities), admin. */
export function useAdminAdvisory() {
  return useQuery({
    queryKey: ["admin-advisory"],
    queryFn: async (): Promise<AdminAdvisoryData> => {
      const res = await fetch("/api/admin/solar/advisory", { cache: "no-store" })
      if (!res.ok) throw new Error("Failed to load portfolio advisory")
      const json = await res.json()
      if (!json?.success) throw new Error(json?.error || "Invalid response")
      return {
        advisory: json.advisory,
        source: json.source,
        model: json.model,
        generatedAt: json.generatedAt,
        aggregate: json.aggregate as PortfolioAdvisoryAggregate,
        top: (json.top ?? []) as AdvisoryPriorityFacility[],
      }
    },
    staleTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
  })
}
