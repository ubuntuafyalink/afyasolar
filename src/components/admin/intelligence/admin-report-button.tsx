"use client"

import { useState } from "react"
import { toast } from "sonner"
import { FileDown, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { downloadPortfolioReportPdf } from "@/lib/dashboard/admin-portfolio-report"
import { getErrorMessage } from "@/lib/get-error-message"

/**
 * Outline button that generates and downloads the portfolio PDF report. Shows a
 * spinner while jsPDF is dynamically loaded + the document is built, and toasts
 * the outcome. No backend; the PDF is produced entirely client-side.
 */
export function AdminReportButton() {
  const [busy, setBusy] = useState(false)

  const handleClick = async () => {
    if (busy) return
    setBusy(true)
    try {
      await downloadPortfolioReportPdf()
      toast.success("Downloaded")
    } catch (error) {
      toast.error(getErrorMessage(error, "Download failed"))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Button variant="outline" onClick={handleClick} disabled={busy}>
      {busy ? (
        <Loader2 aria-hidden className="size-4 animate-spin" />
      ) : (
        <FileDown aria-hidden className="size-4" />
      )}
      Download portfolio report
    </Button>
  )
}
