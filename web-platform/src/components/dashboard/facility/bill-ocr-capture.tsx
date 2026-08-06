"use client"

import { useRef, useState } from "react"
import { FileText, Loader2, Upload } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { DemoDataBadge } from "@/components/ui/demo-data-badge"
import { formatCurrency } from "@/lib/utils"
import { getAuditOutputs } from "@/lib/dashboard/facility-demo-data"

type Extracted = { kwh: number; amountTsh: number }

/**
 * Spec 7.1 / 9.2: bill & receipt photo OCR. The user uploads a photo of a
 * TANESCO bill or fuel receipt; OCR extracts kWh and TSh.
 *
 * [data] the OCR is STUBBED (returns demo figures). TODO: wire real OCR
 * (Cloudinary) per spec. Nothing is uploaded to a server here.
 */
export function BillOcrCapture({ facilityId }: { facilityId?: string }) {
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [scanning, setScanning] = useState(false)
  const [extracted, setExtracted] = useState<Extracted | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (imageUrl) URL.revokeObjectURL(imageUrl)
    setImageUrl(URL.createObjectURL(file))
    setExtracted(null)
    setScanning(true)
    window.setTimeout(() => {
      const o = getAuditOutputs(facilityId)
      setExtracted({
        kwh: Math.round(o.spendBySource[0].monthlyTsh / 280),
        amountTsh: o.spendBySource[0].monthlyTsh,
      })
      setScanning(false)
    }, 1000)
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="size-5 text-primary" aria-hidden /> Bill &amp; receipt scan
          </CardTitle>
          <DemoDataBadge label="OCR stubbed" />
        </div>
        <p className="text-xs text-muted-foreground">
          Photograph a grid bill or fuel receipt to extract kWh and cost.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <input ref={fileRef} type="file" accept="image/*" className="sr-only" onChange={onFile} />
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt="Uploaded bill"
            className="max-h-40 w-full rounded-lg border border-border object-cover"
          />
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex min-h-28 w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/30 text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <Upload className="size-6" aria-hidden />
            <span className="text-sm">Tap to upload a photo</span>
          </button>
        )}

        {scanning ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden /> Extracting figures…
          </p>
        ) : extracted ? (
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground">Energy</p>
              <p className="text-lg font-bold text-foreground">{extracted.kwh} kWh</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground">Amount</p>
              <p className="text-lg font-bold text-foreground">{formatCurrency(extracted.amountTsh)}</p>
            </div>
          </div>
        ) : null}

        {imageUrl ? (
          <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
            Upload another
          </Button>
        ) : null}
      </CardContent>
    </Card>
  )
}
