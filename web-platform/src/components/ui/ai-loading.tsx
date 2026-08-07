"use client"

import { Loader2, Sparkles } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * Standard "AI is working" indicator: a spinner + a clear status message, shown
 * together with the skeleton placeholders so users can tell an AI feature is
 * actively fetching/generating (often multi-step) rather than just idle.
 *
 * Pair it with the card's existing skeleton, e.g.:
 *   <div className="space-y-3">
 *     <AiLoadingIndicator label="Generating advisory…" />
 *     <div aria-hidden>…skeleton bars…</div>
 *   </div>
 */
export function AiLoadingIndicator({ label, className }: { label: string; className?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex items-center gap-2 rounded-md border border-primary/20 bg-primary/5 px-3 py-2",
        className,
      )}
    >
      <Loader2 className="size-4 shrink-0 animate-spin text-primary" aria-hidden />
      <span className="text-xs font-medium text-primary">{label}</span>
      <Sparkles className="ml-auto size-3.5 shrink-0 animate-pulse text-primary/50" aria-hidden />
    </div>
  )
}
