"use client"

import { Sparkles, RefreshCw, CloudSun, BatteryCharging, Activity } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { resolveCoords } from "@/lib/climate/nasa-power"
import { useAiAdvisory } from "@/hooks/use-ai-advisory"

/**
 * AI Advisory: the LLM layer that turns the engine's numeric outputs (climate
 * hazards, solar yield, battery RUL, anomalies) into a plain-language
 * recommendation for the facility manager. Composed in the AI service; works
 * keyless via a deterministic fallback, upgrades to an open-weights LLM when a
 * key is configured. Co-located with Equipment Health but covers climate too.
 */
export function AiAdvisoryCard({
  facilityId,
  region,
  ageDays,
  systemKw,
}: {
  facilityId?: string
  region?: string | null
  ageDays?: number
  systemKw?: number
}) {
  const coords = resolveCoords({ facilityId, region })
  const { data, isLoading, isFetching, isError, error, refetch } = useAiAdvisory({
    facilityId: facilityId ?? null,
    lat: coords.lat,
    lon: coords.lon,
    ageDays,
    systemKw,
  })

  const modelNotReady = (error as Error | undefined)?.message?.toLowerCase().includes("warming")
  const inputs = data?.inputs
  const isLlm = data?.source === "llm"

  return (
    <section className="space-y-4" aria-labelledby="ai-advisory-title">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="size-5 text-primary" aria-hidden />
            <h2 id="ai-advisory-title" className="text-xl font-semibold text-foreground">
              AI Advisory
            </h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Plain-language summary of climate, solar yield &amp; equipment health, with recommended actions.
          </p>
        </div>
        {data ? (
          <span
            className="rounded-full border px-2 py-0.5 text-[10px] font-medium"
            style={
              isLlm
                ? { borderColor: "color-mix(in oklch, var(--color-primary) 30%, transparent)", backgroundColor: "color-mix(in oklch, var(--color-primary) 10%, transparent)", color: "var(--color-primary)" }
                : { borderColor: "var(--color-border)", color: "var(--color-muted-foreground)" }
            }
          >
            {isLlm ? `AI · ${data.model ?? "LLM"}` : "AI · rule-based"}
          </span>
        ) : null}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="size-4 text-primary" aria-hidden />
            Recommendation
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="ml-auto h-7 gap-1 px-2 text-xs"
              onClick={() => refetch()}
              loading={isFetching && !isLoading}
              disabled={!facilityId}
            >
              {!(isFetching && !isLoading) ? <RefreshCw className="size-3.5" aria-hidden /> : null}
              Regenerate
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="space-y-2">
              <div className="h-4 w-full animate-pulse rounded bg-muted" />
              <div className="h-4 w-11/12 animate-pulse rounded bg-muted" />
              <div className="h-4 w-4/5 animate-pulse rounded bg-muted" />
            </div>
          ) : isError || !data ? (
            <p className="text-sm text-muted-foreground">
              {modelNotReady
                ? "The advisory engine is warming up — try again shortly."
                : "Advisory unavailable. Ensure the AI service is running."}
            </p>
          ) : (
            <>
              <p className="text-sm leading-relaxed text-foreground">{data.advisory}</p>

              {/* Inputs strip: what the advisory was computed from. */}
              <div className="flex flex-wrap gap-2 border-t border-border pt-3">
                {inputs?.hazards?.composite != null ? (
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
                    <CloudSun className="size-3.5" aria-hidden />
                    Hazard {inputs.hazards.composite}/100
                  </span>
                ) : null}
                {inputs?.mean_daily_kwh != null ? (
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
                    <CloudSun className="size-3.5" aria-hidden />
                    {inputs.mean_daily_kwh} kWh/day
                  </span>
                ) : null}
                {inputs?.rul_days != null ? (
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
                    <BatteryCharging className="size-3.5" aria-hidden />
                    Battery ~{Math.max(0, Math.round(inputs.rul_days))} d
                  </span>
                ) : null}
                {inputs?.anomalies != null ? (
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
                    <Activity className="size-3.5" aria-hidden />
                    {inputs.anomalies} anomal{inputs.anomalies === 1 ? "y" : "ies"}
                  </span>
                ) : null}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <p className="text-[11px] text-muted-foreground">
        Generated from the AI engine&apos;s climate &amp; equipment models. Advisory guidance is a
        decision aid, not a substitute for on-site inspection.
      </p>
    </section>
  )
}
