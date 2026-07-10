"use client"

import { useState } from "react"
import { FileDown, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { getErrorMessage } from "@/lib/get-error-message"
import { useFacilityPreferences } from "./facility-preferences-provider"

/**
 * Downloads the shareable Facility Resilience Report as a PDF. The (large)
 * jsPDF library and the generator are dynamically imported on click, so they
 * never ship in the dashboard's main bundle. Respects the current EN/SW locale.
 */
export function ResilienceReportButton({
  facilityId,
  facilityName,
  region,
  className,
}: {
  facilityId?: string
  facilityName?: string | null
  region?: string | null
  className?: string
}) {
  const { t, locale } = useFacilityPreferences()
  const [busy, setBusy] = useState(false)

  const onClick = async () => {
    setBusy(true)
    try {
      const { generateResilienceReport } = await import("@/lib/dashboard/resilience-report")
      await generateResilienceReport({ facilityId, facilityName, region, locale, t })
      toast.success(t("report.ready"))
    } catch (err) {
      toast.error(`${t("report.failed")}: ${getErrorMessage(err)}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      disabled={busy}
      aria-busy={busy}
      className={cn("min-h-11 gap-1.5", className)}
    >
      {busy ? (
        <Loader2 className="size-4 animate-spin" aria-hidden />
      ) : (
        <FileDown className="size-4" aria-hidden />
      )}
      {busy ? t("report.generating") : t("report.download")}
    </Button>
  )
}
