"use client"

import { DownloadCloud } from "lucide-react"

import { cn } from "@/lib/utils"
import { useFacilityPreferences } from "./facility-preferences-provider"

/**
 * Small marker that a section's data is cached and usable offline. Pairs with
 * the DemoDataBadge during the simulation phase; in production it reflects the
 * service-worker cache state for the section.
 */
export function OfflineReadyBadge({ className }: { className?: string }) {
  const { t } = useFacilityPreferences()
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-border bg-muted/60 px-2 py-0.5 text-[11px] font-medium text-muted-foreground",
        className,
      )}
    >
      <DownloadCloud className="size-3" aria-hidden />
      {t("toolbar.offlineReady")}
    </span>
  )
}
