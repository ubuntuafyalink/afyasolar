"use client"

import { ConnectivityIndicator } from "./connectivity-indicator"
import { LanguageToggle } from "./language-toggle"
import { AccessibilityMenu } from "./accessibility-menu"

/**
 * Header cluster for the additive facility "v2" preferences: connectivity
 * status, language (EN/SW), and accessibility controls. Rendered in the
 * dashboard header next to the existing actions. Flag-gated by the caller.
 */
export function FacilityToolbar() {
  return (
    <div className="flex items-center gap-2">
      <ConnectivityIndicator className="hidden sm:inline-flex" />
      <LanguageToggle />
      <AccessibilityMenu />
    </div>
  )
}
