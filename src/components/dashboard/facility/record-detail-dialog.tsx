"use client"

import { useState } from "react"
import { Download, Loader2 } from "lucide-react"
import { toast } from "sonner"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { getErrorMessage } from "@/lib/get-error-message"
import { downloadRecordPdf, type PdfRow } from "@/lib/dashboard/receipt-pdf"

export type RecordDetail = {
  title: string
  rows: PdfRow[]
  /** Filename stem for the PDF download. */
  filename: string
}

/**
 * Reusable record detail modal: shows a title + label/value rows for a bill,
 * payment, or invoice, with a one-click PDF download. Frontend-only.
 */
export function RecordDetailDialog({
  detail,
  onOpenChange,
}: {
  detail: RecordDetail | null
  onOpenChange: (open: boolean) => void
}) {
  const [busy, setBusy] = useState(false)

  const download = async () => {
    if (!detail) return
    setBusy(true)
    try {
      await downloadRecordPdf(detail.title, detail.rows, detail.filename)
      toast.success("Downloaded")
    } catch (err) {
      toast.error(`Download failed: ${getErrorMessage(err)}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={!!detail} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{detail?.title}</DialogTitle>
        </DialogHeader>
        {detail && (
          <dl className="divide-y divide-border text-sm">
            {detail.rows.map((row) => (
              <div key={row.label} className="flex items-start justify-between gap-4 py-2">
                <dt className="text-muted-foreground">{row.label}</dt>
                <dd className="text-right font-medium text-foreground">{row.value}</dd>
              </div>
            ))}
          </dl>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={download} disabled={busy} className="gap-1.5">
            {busy ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <Download className="size-4" aria-hidden />
            )}
            Download PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
