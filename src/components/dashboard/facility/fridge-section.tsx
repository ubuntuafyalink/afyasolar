"use client"

import { Wrench } from "lucide-react"
import { toast } from "sonner"

import { LazyMotionProvider } from "@/components/motion/lazy-motion-provider"
import { Button } from "@/components/ui/button"
import { FridgePredictionAlert } from "./fridge-prediction-alert"
import { FridgeTempChart } from "./fridge-temp-chart"
import { FridgeEventsList } from "./fridge-events-list"
import { FridgeReadingCapture } from "./fridge-reading-capture"
import { FridgeTroubleshoot } from "./fridge-troubleshoot"

/**
 * Spec 8.2 "Friji detail" → the Fridge section. Composes the predictive alert,
 * 24h temperature chart with safe band, recent events, a camera reading-capture
 * dialog, and the guided troubleshooting flow. Desktop-first.
 */
export function FridgeSection({ facilityId }: { facilityId?: string }) {
  return (
    <LazyMotionProvider>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Fridge</h2>
            <p className="text-sm text-muted-foreground">
              Cold-chain status and history for your vaccine fridge.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <FridgeReadingCapture
              facilityId={facilityId}
              onSaved={(t) => toast.success(`Reading saved: ${t.toFixed(1)}°C`)}
            />
            <FridgeTroubleshoot
              trigger={
                <Button variant="outline" className="min-h-11">
                  <Wrench className="size-4" aria-hidden /> Problem with fridge
                </Button>
              }
            />
          </div>
        </div>

        <FridgePredictionAlert facilityId={facilityId} />

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <FridgeTempChart facilityId={facilityId} />
          </div>
          <FridgeEventsList facilityId={facilityId} />
        </div>
      </div>
    </LazyMotionProvider>
  )
}
