"use client"

import { useState } from "react"
import { Sparkles } from "lucide-react"
import { m } from "framer-motion"

import { Button } from "@/components/ui/button"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { LazyMotionProvider } from "@/components/motion/lazy-motion-provider"
import { useAiExplain } from "@/hooks/use-ai-explain"
import type { ExplainMetric } from "@/lib/ai/explain-service"
import {
  BAND_COLOR,
  BAND_LABELS,
  EXPLAINER_UI,
  computeBand,
  type Locale,
} from "@/lib/dashboard/explainer-copy"
import { useFacilityPreferences } from "./facility-preferences-provider"

export type ExplainDriver = { label: string; value: string | number; sub?: string }

/**
 * "What does this mean?" affordance for a single AI prediction. A ghost icon
 * button opens a popover with an instant severity band + drivers, then an AI
 * narrative (fetched only on open, in the facility's language). Educational and
 * scoped to one metric — complements, doesn't duplicate, the Advisory.
 */
export function ExplainPopover({
  metric,
  value,
  unit,
  label,
  drivers,
  context,
}: {
  metric: ExplainMetric
  value?: number
  unit?: string
  label: string
  drivers?: ExplainDriver[]
  context?: Record<string, unknown>
}) {
  const [open, setOpen] = useState(false)
  const locale = (useFacilityPreferences().locale as Locale) ?? "en"
  const t = (k: string) => EXPLAINER_UI[k][locale]

  const band = computeBand(metric, value)
  const bandColor = BAND_COLOR[band]
  const bandLabel = BAND_LABELS[band][locale]

  const { data, isLoading, isError } = useAiExplain({
    metric, value, unit, lang: locale, context: { ...context, label }, enabled: open,
  })
  const isLlm = data?.source === "llm"

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-5 shrink-0 rounded px-1.5 text-[11px] font-medium text-primary hover:bg-primary/10 hover:underline"
          aria-label={`${t("explain")}: ${label}`}
          title={`${t("explain")}: ${label}`}
        >
          {t("explain")}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        {/* Header: metric + value + instant severity band */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-foreground">{label}</p>
            {value != null ? (
              <p className="text-lg font-black tracking-tight text-foreground">
                {value}
                {unit ? <span className="text-xs font-medium text-muted-foreground">{unit}</span> : null}
              </p>
            ) : null}
          </div>
          <span
            className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
            style={{ color: bandColor, backgroundColor: `color-mix(in oklch, ${bandColor} 15%, transparent)` }}
          >
            {bandLabel}
          </span>
        </div>

        {/* Drivers (deterministic, instant) */}
        {drivers && drivers.length > 0 ? (
          <div className="mt-3 space-y-1 border-t border-border pt-2">
            <p className="text-[11px] font-medium text-muted-foreground">{t("drivers")}</p>
            {drivers.map((d, i) => (
              <div key={i} className="flex items-center justify-between gap-2 text-xs">
                <span className="text-muted-foreground">{d.label}</span>
                <span className="font-medium text-foreground">
                  {d.value}
                  {d.sub ? <span className="ml-1 text-[10px] text-muted-foreground">{d.sub}</span> : null}
                </span>
              </div>
            ))}
          </div>
        ) : null}

        {/* AI narrative */}
        <div className="mt-3 border-t border-border pt-2">
          <div className="mb-1 flex items-center gap-1.5">
            <Sparkles className="size-3.5 text-primary" aria-hidden />
            <span className="text-[11px] font-medium text-muted-foreground">{t("meaning")}</span>
            {data ? (
              <span
                className="ml-auto rounded-full border px-1.5 py-0.5 text-[9px] font-medium"
                style={
                  isLlm
                    ? { borderColor: "color-mix(in oklch, var(--color-primary) 30%, transparent)", color: "var(--color-primary)" }
                    : { borderColor: "var(--color-border)", color: "var(--color-muted-foreground)" }
                }
              >
                {isLlm ? t("aiBadge") : t("ruleBadge")}
              </span>
            ) : null}
          </div>

          {isLoading ? (
            <div className="space-y-1.5" aria-live="polite">
              <div className="h-3 w-full animate-pulse rounded bg-muted" />
              <div className="h-3 w-11/12 animate-pulse rounded bg-muted" />
              <div className="h-3 w-3/5 animate-pulse rounded bg-muted" />
              <span className="sr-only">{t("loading")}</span>
            </div>
          ) : isError || !data ? (
            <p className="text-xs text-muted-foreground">{t("error")}</p>
          ) : (
            <LazyMotionProvider>
              <m.p
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                className="text-xs leading-relaxed text-foreground"
              >
                {data.explanation}
              </m.p>
            </LazyMotionProvider>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
