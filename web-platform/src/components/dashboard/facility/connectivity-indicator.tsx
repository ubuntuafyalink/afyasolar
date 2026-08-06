"use client"

import { Wifi, WifiOff } from "lucide-react"

import { cn } from "@/lib/utils"
import { useOnlineStatus } from "@/hooks/use-online-status"
import { useFacilityPreferences } from "./facility-preferences-provider"

/**
 * Compact online/offline pill for the dashboard header. Connectivity is shown
 * with an icon AND a text label (never colour alone) so it reads on low-quality
 * screens and for colour-blind users. The full offline banner lives separately.
 */
export function ConnectivityIndicator({ className }: { className?: string }) {
  const online = useOnlineStatus()
  const { t } = useFacilityPreferences()

  return (
    <span
      role="status"
      aria-live="polite"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
        online
          ? "border-success/30 bg-success/10 text-success"
          : "border-warning/40 bg-warning/15 text-warning-foreground",
        className,
      )}
    >
      {online ? (
        <Wifi className="size-3.5" aria-hidden />
      ) : (
        <WifiOff className="size-3.5" aria-hidden />
      )}
      <span>{online ? t("toolbar.online") : t("toolbar.offline")}</span>
    </span>
  )
}
