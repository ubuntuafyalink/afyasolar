"use client"

import { useEffect, useRef, useState } from "react"
import { Sparkles, Volume2, Square } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { FOCUS_RING } from "@/lib/dashboard/facility-ui"
import { useStreamingAssistant } from "@/hooks/use-assistant"
import { useSpeech } from "@/hooks/use-speech"
import { TypingCursor } from "@/components/assistant/typing-cursor"
import { getPowerSnapshot, getServiceHoursRemaining } from "@/lib/dashboard/facility-demo-data"
import type { PowerInputs } from "@/lib/dashboard/power-model"
import type { SkyClass } from "@/lib/climate/nasa-power"
import { useFacilityPreferences } from "./facility-preferences-provider"

/**
 * Plain-language read of the facility's current power situation, derived from
 * the real assessed load + sized solar + climate sun. Auto-runs (once per
 * resolved inputs) and streams the answer with a typing cursor + read-aloud.
 */
export function PowerInterpretation({
  facilityId,
  batteryLevel,
  inputs,
  sky,
}: {
  facilityId?: string
  batteryLevel?: number
  inputs: PowerInputs
  sky?: SkyClass
}) {
  const { locale, t } = useFacilityPreferences()
  const [auto, setAuto] = useState(true)
  const stream = useStreamingAssistant()
  const speech = useSpeech()
  const lastKey = useRef<string>("")

  const queryKey = `${facilityId}-${inputs.dailyLoadKwh}-${inputs.solarCapacityKw}-${inputs.peakSunHours}`

  function buildContext(): string {
    const snap = getPowerSnapshot(facilityId, batteryLevel, inputs)
    const aut = getServiceHoursRemaining(facilityId, batteryLevel, inputs)
    const flow =
      snap.batteryKw > 0 ? `charging ${snap.batteryKw} kW` : snap.batteryKw < 0 ? `discharging ${Math.abs(snap.batteryKw)} kW` : "idle"
    return (
      `Facility power right now: running on ${snap.activeSource}. ` +
      `Solar ${snap.solarKw} kW, load ${snap.loadKw} kW, grid ${snap.gridKw} kW, battery ${snap.batterySocPct}% (${flow}). ` +
      `Battery autonomy for the critical load (${aut.criticalLoadKw} kW): about ${aut.hours} hours, until ${aut.untilLabel}. ` +
      `System: sized solar ${inputs.solarCapacityKw} kW, daily load ${inputs.dailyLoadKwh} kWh, usable battery ${inputs.batteryCapacityKwh} kWh. ` +
      `Today's solar resource: ${inputs.peakSunHours} peak sun hours (${sky ?? "partly"}).`
    )
  }

  function run() {
    stream.run({
      messages: [{ role: "user", content: "Summarize my facility's power situation now and what I should do." }],
      context: buildContext(),
      mode: "interpret",
    })
  }

  useEffect(() => {
    if (!auto) return
    if (lastKey.current === queryKey) return
    lastKey.current = queryKey
    run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryKey, auto])

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="size-5 text-primary" aria-hidden />
            {t("power.aiSummaryTitle")}
          </CardTitle>
          <label className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={auto}
              onChange={(e) => setAuto(e.target.checked)}
              className={cn("size-3.5 rounded border-border", FOCUS_RING)}
            />
            {t("power.autoInterpret")}
          </label>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={run}
            disabled={stream.isStreaming}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md border border-primary/40 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary disabled:opacity-50",
              FOCUS_RING,
            )}
          >
            <Sparkles className="size-3.5" aria-hidden />
            {stream.isStreaming ? t("power.interpreting") : t("power.interpretNow")}
          </button>
          {stream.text && !stream.isStreaming && speech.supported ? (
            <button
              type="button"
              onClick={() =>
                speech.speaking ? speech.stop() : speech.speak(stream.text, locale === "sw" ? "sw-TZ" : "en-US")
              }
              className={cn("inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground", FOCUS_RING)}
              aria-label={speech.speaking ? t("toolbar.stop") : t("toolbar.readAloud")}
            >
              {speech.speaking ? <Square className="size-3.5" aria-hidden /> : <Volume2 className="size-3.5" aria-hidden />}
            </button>
          ) : null}
        </div>

        {stream.isError ? (
          <p className="text-xs text-muted-foreground" role="status">
            {t("power.explainUnavailable")}
          </p>
        ) : null}
        {stream.text ? (
          <p className="rounded-md bg-muted/50 p-3 text-sm text-foreground" aria-live="polite">
            {stream.text}
            {stream.isStreaming ? <TypingCursor /> : null}
          </p>
        ) : stream.isStreaming ? (
          <p className="rounded-md bg-muted/50 p-3 text-sm text-muted-foreground" aria-live="polite">
            {t("power.interpreting")}
            <TypingCursor />
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">{t("power.aiSummaryHint")}</p>
        )}
      </CardContent>
    </Card>
  )
}
