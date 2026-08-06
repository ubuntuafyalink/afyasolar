"use client"

import { useState } from "react"
import { Download, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { getErrorMessage } from "@/lib/get-error-message"
import { exportRowsToExcel, type ExportRow } from "@/lib/dashboard/export-data"
import { useT } from "./facility-preferences-provider"

/**
 * Generic "Export" button. Rows are produced lazily on click; the xlsx library
 * loads on demand (see export-data.ts). Shows busy state + a toast.
 */
export function ExportButton({
  getRows,
  filename,
  className,
}: {
  getRows: () => ExportRow[]
  filename: string
  className?: string
}) {
  const t = useT()
  const [busy, setBusy] = useState(false)

  const onClick = async () => {
    setBusy(true)
    try {
      await exportRowsToExcel(getRows(), filename)
      toast.success(t("export.done"))
    } catch (err) {
      toast.error(`${t("export.failed")}: ${getErrorMessage(err)}`)
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
      className={cn("min-h-9 gap-1.5", className)}
    >
      {busy ? (
        <Loader2 className="size-4 animate-spin" aria-hidden />
      ) : (
        <Download className="size-4" aria-hidden />
      )}
      {t("export.label")}
    </Button>
  )
}
