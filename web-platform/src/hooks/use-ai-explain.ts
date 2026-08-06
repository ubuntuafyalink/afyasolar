"use client"

import { useQuery } from "@tanstack/react-query"

import { fetchAiExplanation, type AiExplanation, type FetchAiExplanationArgs } from "@/lib/ai/explain-service"

export type UseAiExplainArgs = FetchAiExplanationArgs & { enabled?: boolean }

/**
 * Plain-language explanation of one prediction via /api/ai/explain. Only fetches
 * when `enabled` (e.g. the explainer popover is open) to avoid an LLM call per
 * rendered metric. Cached per metric + rounded value + language.
 */
export function useAiExplain({ enabled = true, ...args }: UseAiExplainArgs) {
  const roundedValue = args.value != null ? Math.round(args.value) : null
  return useQuery<AiExplanation>({
    queryKey: ["ai-explain", args.metric, roundedValue, args.lang ?? "en"],
    queryFn: () => fetchAiExplanation(args),
    enabled,
    staleTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  })
}
