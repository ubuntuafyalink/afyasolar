"use client"

import { useRef, useState, type ReactNode } from "react"
import { Camera, Check, Loader2, ScanLine } from "lucide-react"

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { DemoDataBadge } from "@/components/ui/demo-data-badge"
import { getFridgeStatus } from "@/lib/dashboard/facility-demo-data"

/**
 * Spec 8.2 "Pima joto sasa" (measure temperature now) → here in English as
 * "Measure temp now". Opens the camera to scan the fridge logger display and
 * saves a manual reading.
 *
 * The OCR step is STUBBED for now (returns a plausible reading derived from the
 * facility's demo status). TODO: wire real OCR (Cloudinary / vision model) per
 * spec 7.1. Nothing here writes to a backend.
 */
export function FridgeReadingCapture({
  facilityId,
  trigger,
  onSaved,
}: {
  facilityId?: string
  trigger?: ReactNode
  /** Called with the captured reading when the user saves (local only). */
  onSaved?: (tempC: number) => void
}) {
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [reading, setReading] = useState<number | null>(null)
  const [scanning, setScanning] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  function reset() {
    if (imageUrl) URL.revokeObjectURL(imageUrl)
    setImageUrl(null)
    setReading(null)
    setScanning(false)
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (imageUrl) URL.revokeObjectURL(imageUrl)
    setImageUrl(URL.createObjectURL(file))
    setReading(null)
    setScanning(true)
    // Stubbed OCR: resolve to a reading coherent with the demo status.
    window.setTimeout(() => {
      setReading(getFridgeStatus(facilityId).tempC)
      setScanning(false)
    }, 900)
  }

  return (
    <Dialog onOpenChange={(open) => !open && reset()}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button className="min-h-11">
            <Camera className="size-4" aria-hidden /> Measure temp now
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Measure temperature <DemoDataBadge label="OCR stubbed" />
          </DialogTitle>
          <DialogDescription>
            Point your camera at the fridge logger display to capture a reading.
          </DialogDescription>
        </DialogHeader>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          onChange={onFile}
        />

        <div className="space-y-3">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt="Captured fridge logger display"
              className="max-h-48 w-full rounded-lg border border-border object-cover"
            />
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex min-h-32 w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/30 text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <Camera className="size-7" aria-hidden />
              <span className="text-sm">Tap to open camera</span>
            </button>
          )}

          {scanning ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" aria-hidden /> Reading the display…
            </p>
          ) : reading !== null ? (
            <div className="flex items-center gap-2 rounded-lg bg-success/10 p-3 text-success">
              <ScanLine className="size-5" aria-hidden />
              <span className="text-sm font-medium">Detected reading:</span>
              <span className="text-lg font-bold">{reading.toFixed(1)}°C</span>
            </div>
          ) : null}
        </div>

        <DialogFooter>
          {imageUrl ? (
            <Button variant="outline" onClick={() => fileRef.current?.click()}>
              Retake
            </Button>
          ) : null}
          <DialogClose asChild>
            <Button
              disabled={reading === null}
              onClick={() => reading !== null && onSaved?.(reading)}
            >
              <Check className="size-4" aria-hidden /> Save reading
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
