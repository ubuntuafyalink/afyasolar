"use client"

import { CheckCircle2, TriangleAlert } from "lucide-react"

import { Card } from "@/components/ui/card"
import { DemoDataBadge } from "@/components/ui/demo-data-badge"
import { cn } from "@/lib/utils"
import { getColdChainPrediction } from "@/lib/dashboard/facility-demo-data"

/**
 * Spec 11.3 "Predict": predictive cold-chain failure alert, 2–4 weeks ahead.
 *
 * [data] — fed by the local demo module. TODO: wire the real predictive model
 * (compressor run-time + temperature-recovery telemetry) per spec Part 11.
 */
export function FridgePredictionAlert({ facilityId }: { facilityId?: string }) {
  const p = getColdChainPrediction(facilityId)

  return (
    <Card
      className={cn(
        "border-2 p-4",
        p.atRisk ? "border-warning/40 bg-warning/5" : "border-success/30 bg-success/5",
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-lg",
            p.atRisk ? "bg-warning/15 text-warning-foreground" : "bg-success/10 text-success",
          )}
        >
          {p.atRisk ? (
            <TriangleAlert className="size-6" aria-hidden />
          ) : (
            <CheckCircle2 className="size-6" aria-hidden />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-foreground">
              {p.atRisk ? "Cold-chain failure predicted" : "Cold chain looks healthy"}
            </h3>
            <DemoDataBadge />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{p.signal}</p>
          {p.atRisk ? (
            <p className="mt-2 text-sm font-medium text-foreground">
              Likely window: {p.etaDaysMin}–{p.etaDaysMax} days · {p.confidencePct}% confidence.
              Schedule a preventive check and prepare a backup cold box.
            </p>
          ) : null}
        </div>
      </div>
    </Card>
  )
}
