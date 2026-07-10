"use client"

import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { Activity, Lightbulb, Gauge } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DemoDataBadge } from "@/components/ui/demo-data-badge"
import { cn } from "@/lib/utils"
import { getEcoPulseEpi } from "@/lib/dashboard/facility-demo-data"
import { computeEcoPulseEpi, type EcoPulseResult } from "@/lib/dashboard/eco-pulse"

const BAND_STYLE: Record<string, string> = {
  efficient: "text-success",
  expected: "text-success",
  inefficient: "text-warning-foreground",
  "check-data": "text-muted-foreground",
}

type EffPayload = {
  source: "db" | "simulated" | "hybrid"
  daily: { consumedKwh: number }[]
}

/**
 * Eco-Pulse Energy Performance Index. Prefers a REAL index from metered
 * consumption (recent use vs the facility's own trailing baseline, see
 * lib/dashboard/eco-pulse.ts); falls back to a clearly-badged demo value when the
 * facility has no real consumption history.
 */
export function EcoPulseEpi({ facilityId }: { facilityId?: string }) {
  const query = useQuery<EffPayload>({
    queryKey: ["eco-pulse-efficiency", facilityId],
    queryFn: async () => {
      const res = await fetch(`/api/facility/${facilityId}/efficiency-performance?days=30`)
      if (!res.ok) throw new Error(`efficiency-performance ${res.status}`)
      return res.json()
    },
    enabled: Boolean(facilityId),
    staleTime: 10 * 60 * 1000,
  })

  const { epi, live } = useMemo<{ epi: EcoPulseResult; live: boolean }>(() => {
    const payload = query.data
    if (payload && payload.source !== "simulated") {
      const real = computeEcoPulseEpi(payload.daily.map((d) => d.consumedKwh))
      if (real) return { epi: real, live: true }
    }
    return { epi: getEcoPulseEpi(facilityId), live: false }
  }, [query.data, facilityId])

  // Position on a 0.5–1.6 scale for the marker.
  const pct = Math.max(0, Math.min(100, ((epi.epi - 0.5) / (1.6 - 0.5)) * 100))

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="size-5 text-primary" aria-hidden /> Eco-Pulse performance
          </CardTitle>
          {live ? (
            <span className="inline-flex items-center gap-1 rounded-md border border-success/30 bg-success/10 px-2 py-0.5 text-[11px] font-medium text-success">
              <Gauge className="size-3" aria-hidden /> Live · from meter
            </span>
          ) : (
            <DemoDataBadge />
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Observed use vs your recent baseline (1.0 = tracking your norm).
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-baseline gap-2">
          <span className={cn("text-4xl font-black tracking-tight", BAND_STYLE[epi.band])}>
            {epi.epi.toFixed(2)}
          </span>
          <span className="text-sm text-muted-foreground">EPI</span>
        </div>

        {/* Scale 0.5 … 1.0 … 1.6 with a marker */}
        <div className="space-y-1">
          <div className="relative h-2 w-full rounded-full bg-gradient-to-r from-success/40 via-success/30 to-destructive/40">
            <span
              className="absolute -top-1 size-4 -translate-x-1/2 rounded-full border-2 border-background bg-foreground"
              style={{ left: `${pct}%` }}
              aria-hidden
            />
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>0.8 low</span>
            <span>1.0 expected</span>
            <span>1.3+ high</span>
          </div>
        </div>

        <p className="text-sm font-medium text-foreground">{epi.headline}</p>
        <div className="flex items-start gap-2 rounded-lg bg-muted/50 p-3">
          <Lightbulb className="mt-0.5 size-4 shrink-0 text-warning-foreground" aria-hidden />
          <p className="text-xs text-muted-foreground">{epi.hypothesis}</p>
        </div>
      </CardContent>
    </Card>
  )
}
