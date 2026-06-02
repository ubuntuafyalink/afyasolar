"use client"

import { cn } from "@/lib/utils"
import { useT } from "./facility-preferences-provider"

/**
 * Small live/paused status with a pulsing dot and last-updated time. The pulse
 * only animates while live (and the feed is paused under reduced-motion, so the
 * animation never runs when the user opted out). aria-live announces updates.
 */
export function LiveIndicator({
  live,
  lastUpdated,
  className,
}: {
  live: boolean
  lastUpdated: Date | null
  className?: string
}) {
  const t = useT()
  return (
    <span
      role="status"
      aria-live="polite"
      className={cn("inline-flex items-center gap-1.5 text-xs", className)}
    >
      <span className="relative flex size-2" aria-hidden>
        {live && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
        )}
        <span
          className={cn(
            "relative inline-flex size-2 rounded-full",
            live ? "bg-success" : "bg-muted-foreground",
          )}
        />
      </span>
      <span className={live ? "font-medium text-success" : "text-muted-foreground"}>
        {live ? t("telemetry.live") : t("telemetry.paused")}
      </span>
      {lastUpdated && (
        <span className="text-muted-foreground">
          · {t("telemetry.updated", { time: lastUpdated.toLocaleTimeString() })}
        </span>
      )}
    </span>
  )
}
