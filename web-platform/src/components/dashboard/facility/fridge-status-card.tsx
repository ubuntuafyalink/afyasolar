"use client"

import { m } from "framer-motion"
import { AlertTriangle, CheckCircle2 } from "lucide-react"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { getFridgeStatus } from "@/lib/dashboard/facility-demo-data"

/** "{n} min ago" / "{n} h ago" relative label for the last-checked timestamp. */
function timeAgo(iso: string): string {
  const mins = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60_000))
  if (mins < 60) return `${mins} min ago`
  const hrs = Math.round(mins / 60)
  return hrs === 1 ? "1 h ago" : `${hrs} h ago`
}

/**
 * Spec 8.2 "card one": the fridge-status hero. A single large SAFE / DANGER word
 * with current temperature and last-checked time. Green (success) when safe, red
 * (danger) when over-temperature, with a one-tap troubleshooting CTA when unsafe.
 *
 * Must be rendered inside <LazyMotionProvider> (uses framer-motion `m`).
 */
export function FridgeStatusCard({
  facilityId,
  className,
  onTroubleshoot,
}: {
  facilityId?: string
  className?: string
  /** Opens the guided troubleshooting flow (wired to the Fridge section). */
  onTroubleshoot?: () => void
}) {
  const fridge = getFridgeStatus(facilityId)
  const safe = fridge.status === "safe"

  return (
    <Card
      className={cn(
        "relative overflow-hidden border-2 p-0",
        safe ? "border-success/30 bg-success/5" : "border-destructive/40 bg-destructive/5",
        className,
      )}
    >
      <m.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="flex flex-col items-center justify-center gap-2 p-6 text-center"
      >
        <div
          className={cn(
            "flex items-center gap-2 text-sm font-medium",
            safe ? "text-success" : "text-destructive",
          )}
        >
          {safe ? (
            <CheckCircle2 className="size-5" aria-hidden />
          ) : (
            <AlertTriangle className="size-5" aria-hidden />
          )}
          <span>Vaccine fridge</span>
        </div>

        <p
          className={cn(
            "text-6xl font-black leading-none tracking-tight sm:text-7xl",
            safe ? "text-success" : "text-destructive",
          )}
          aria-label={safe ? "Fridge status: safe" : "Fridge status: danger, over temperature"}
        >
          {safe ? "SAFE" : "DANGER"}
        </p>

        <p className="text-xl font-semibold text-foreground">{fridge.tempC.toFixed(1)}°C</p>
        <p className="text-xs text-muted-foreground">Last checked {timeAgo(fridge.lastCheckedIso)}</p>

        {!safe && onTroubleshoot ? (
          <Button variant="destructive" className="mt-3 min-h-11 px-6" onClick={onTroubleshoot}>
            Tell me the problem
          </Button>
        ) : null}
      </m.div>
    </Card>
  )
}
