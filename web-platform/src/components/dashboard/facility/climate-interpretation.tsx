"use client"

import { useEffect, useRef, useState } from "react"
import { Sparkles, Volume2, Square } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { FOCUS_RING } from "@/lib/dashboard/facility-ui"
import { useStreamingAssistant } from "@/hooks/use-assistant"
import { useSpeech } from "@/hooks/use-speech"
import { TypingCursor } from "@/components/assistant/typing-cursor"
import { toHazardSeries, seriesStats, HAZARD_KEYS } from "@/lib/climate/hazard-series"
import type { HazardTrendPoint, ResiHealthCvi } from "@/lib/dashboard/facility-demo-data"
import { useFacilityPreferences } from "./facility-preferences-provider"

/**
 * Plain-language interpretation of the currently loaded climate data. Auto-runs
 * (once per resolved query) when enabled and real data is present, so users with
 * limited data skills immediately get meaning. Cached per queryKey, with an
 * auto toggle and read-aloud to control cost and aid accessibility.
 */
export function ClimateInterpretation({
  trend,
  cvi,
  locationLabel,
  rangeLabel,
  temporalLabel,
  live,
  queryKey,
}: {
  trend: HazardTrendPoint[]
  cvi: ResiHealthCvi
  locationLabel?: string | null
  rangeLabel: string
  temporalLabel: string
  live: boolean
  queryKey: string
}) {
  const { locale, t } = useFacilityPreferences()
  const [auto, setAuto] = useState(true)
  const stream = useStreamingAssistant()
  const speech = useSpeech()
  const lastKey = useRef<string>("")

  function buildContext(): string {
    const lines = HAZARD_KEYS.map((h) => {
      const stats = seriesStats(toHazardSeries(trend, h))
      if (!stats) return `${h}: no data`
      return `${h}: latest ${stats.latest}/100, avg ${stats.avg}, trend ${stats.trend}`
    })
    return (
      `Climate hazard indices (0-100, higher = worse). Location: ${locationLabel ?? "selected point"}. ` +
      `Period: ${rangeLabel} (${temporalLabel}).\n${lines.join("\n")}\n` +
      `Climate Vulnerability Index composite: ${cvi.composite}/100 ` +
      `(flood ${cvi.byHazard.flood}, drought ${cvi.byHazard.drought}, heat ${cvi.byHazard.heat}, storm ${cvi.byHazard.storm}).`
    )
  }

  function run() {
    if (!trend.length) return
    stream.run({
      messages: [{ role: "user", content: "Summarize what this climate data means for my facility." }],
      context: buildContext(),
      mode: "interpret",
    })
  }

  // Auto-interpret once per resolved query when enabled and we have real data.
  useEffect(() => {
    if (!auto || !live || !trend.length) return
    if (lastKey.current === queryKey) return
    lastKey.current = queryKey
    run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryKey, auto, live, trend.length])

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="size-5 text-primary" aria-hidden />
            {t("climateOutlook.aiSummaryTitle")}
          </CardTitle>
          <label className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={auto}
              onChange={(e) => setAuto(e.target.checked)}
              className={cn("size-3.5 rounded border-border", FOCUS_RING)}
            />
            {t("climateOutlook.autoInterpret")}
          </label>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={run}
            disabled={stream.isStreaming || !trend.length}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md border border-primary/40 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary disabled:opacity-50",
              FOCUS_RING,
            )}
          >
            <Sparkles className="size-3.5" aria-hidden />
            {stream.isStreaming ? t("climateOutlook.interpreting") : t("climateOutlook.interpretNow")}
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
            {t("climateOutlook.explainUnavailable")}
          </p>
        ) : null}
        {stream.text ? (
          <p className="rounded-md bg-muted/50 p-3 text-sm text-foreground" aria-live="polite">
            {stream.text}
            {stream.isStreaming ? <TypingCursor /> : null}
          </p>
        ) : stream.isStreaming ? (
          <p className="rounded-md bg-muted/50 p-3 text-sm text-muted-foreground" aria-live="polite">
            {t("climateOutlook.interpreting")}
            <TypingCursor />
          </p>
        ) : !stream.isError ? (
          <p className="text-xs text-muted-foreground">{t("climateOutlook.aiSummaryHint")}</p>
        ) : null}
      </CardContent>
    </Card>
  )
}
