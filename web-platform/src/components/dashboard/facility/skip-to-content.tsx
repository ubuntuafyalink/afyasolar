"use client"

import { FOCUS_RING } from "@/lib/dashboard/facility-ui"
import { cn } from "@/lib/utils"
import { useFacilityPreferences } from "./facility-preferences-provider"

/**
 * Keyboard skip link (WCAG 2.4.1). Visually hidden until focused, then it jumps
 * focus past the sidebar/header to the main content region (#facility-main).
 */
export function SkipToContent() {
  const { t } = useFacilityPreferences()
  return (
    <a
      href="#facility-main"
      className={cn(
        "sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60]",
        "focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground",
        FOCUS_RING,
      )}
    >
      {t("toolbar.skipToContent")}
    </a>
  )
}
