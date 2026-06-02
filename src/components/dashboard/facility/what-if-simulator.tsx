"use client"

import { useMemo, useState } from "react"
import { ArrowDown, ArrowUp, FlaskConical, Play, Satellite, Sparkles, Square, Volume2 } from "lucide-react"
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { cn, formatCurrency } from "@/lib/utils"
import { FOCUS_RING } from "@/lib/dashboard/facility-ui"
import { TypingCursor } from "@/components/assistant/typing-cursor"
import { useStreamingAssistant } from "@/hooks/use-assistant"
import { useSpeech } from "@/hooks/use-speech"
import {
  resolveCoords,
  rangeForPreset,
  toSolarResource,
  SOLAR_PARAMETERS,
} from "@/lib/climate/nasa-power"
import { useNasaPower } from "@/hooks/use-nasa-power"
import { deriveEnergyProfile, DEFAULT_ENERGY_PROFILE, type PowerInputs } from "@/lib/dashboard/power-model"
import { computeWhatIf, WHATIF_SCENARIOS, type WhatIfComputation, type WhatIfScenarioId } from "@/lib/dashboard/what-if-model"
import type { MeuSummary, SizingSummary } from "@/components/solar/afya-solar-sizing-tool"
import { useFacilityPreferences } from "./facility-preferences-provider"

const VERDICT_META: Record<string, { label: string; className: string }> = {
  good: { label: "Recommended", className: "border-success/30 bg-success/10 text-success" },
  caution: { label: "Proceed with caution", className: "border-destructive/30 bg-destructive/10 text-destructive" },
  tradeoff: { label: "Trade-off", className: "border-warning/40 bg-warning/10 text-warning-foreground" },
}

const TOOLTIP_STYLE = {
  fontSize: 12,
  borderRadius: 8,
  border: "1px solid var(--color-border)",
  background: "var(--color-card)",
} as const

/**
 * What-if simulator: pick (or describe) a change and get the REAL estimated
 * impact - battery autonomy, monthly cost, resilience - computed from the
 * facility's assessed load + sized solar + Climate Outlook sun, plus a streaming
 * AI recommendation grounded in those figures.
 */
export function WhatIfSimulator({
  facilityId,
  meuSummary,
  sizingSummary,
  region,
}: {
  facilityId?: string
  meuSummary?: MeuSummary | null
  sizingSummary?: SizingSummary | null
  region?: string | null
}) {
  const { locale } = useFacilityPreferences()
  const [scenario, setScenario] = useState<WhatIfScenarioId>("add-battery")
  const [customText, setCustomText] = useState("")
  const [comp, setComp] = useState<WhatIfComputation | null>(null)
  const [ran, setRan] = useState(false)
  const stream = useStreamingAssistant()
  const speech = useSpeech()

  // Real facility profile + climate sun (same pipeline as the Power page).
  const coords = useMemo(() => resolveCoords({ facilityId, region }), [facilityId, region])
  const range = useMemo(() => rangeForPreset("1y"), [])
  const climate = useNasaPower({
    lat: coords.lat,
    lon: coords.lon,
    temporal: range.temporal,
    start: range.start,
    end: range.end,
    parameters: SOLAR_PARAMETERS,
  })
  const solar = useMemo(() => (climate.data ? toSolarResource(climate.data) : null), [climate.data])
  const profile = deriveEnergyProfile(meuSummary, sizingSummary) ?? DEFAULT_ENERGY_PROFILE
  const inputs: PowerInputs = {
    ...profile,
    peakSunHours: solar?.peakSunHours ?? 4.2,
    sky: solar?.sky ?? "partly",
  }

  const facilityContext =
    `Facility energy profile: sized solar ${inputs.solarCapacityKw} kW, daily load ${(inputs.avgLoadKw * 24).toFixed(1)} kWh, ` +
    `usable battery ${inputs.batteryCapacityKwh} kWh, critical load ${inputs.criticalLoadKw} kW, ` +
    `peak sun hours ${inputs.peakSunHours} (${inputs.sky}).`

  function simulate() {
    const isCustom = scenario === "custom"
    if (isCustom && !customText.trim()) return
    const c = isCustom ? null : computeWhatIf(scenario, inputs)
    setComp(c)
    setRan(true)

    const label = WHATIF_SCENARIOS.find((s) => s.id === scenario)?.label ?? scenario
    const context = isCustom
      ? `${facilityContext}\nProposed change (free text): "${customText.trim()}".`
      : `${facilityContext}\nScenario: ${label}.\n${c?.contextLines ?? ""}`
    stream.run({
      messages: [
        {
          role: "user",
          content: isCustom
            ? `Analyze this change for my facility and recommend what to do: ${customText.trim()}`
            : `Explain the impact of this change and recommend what to do: ${label}`,
        },
      ],
      context,
      mode: "interpret",
    })
  }

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <FlaskConical className="size-5 text-primary" aria-hidden /> What-if simulator
          </CardTitle>
          <span className="inline-flex items-center gap-1 rounded-md border border-success/30 bg-success/10 px-2 py-0.5 text-[11px] font-medium text-success">
            <Satellite className="size-3" aria-hidden /> Based on your assessment + Climate Outlook
          </span>
        </div>
        <p className="text-xs text-muted-foreground">See the likely effect of a change before you make it.</p>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4">
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-48 flex-1 space-y-1">
            <label className="text-xs text-muted-foreground" htmlFor="scenario">
              Scenario
            </label>
            <Select value={scenario} onValueChange={(v) => setScenario(v as WhatIfScenarioId)}>
              <SelectTrigger id="scenario">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {WHATIF_SCENARIOS.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            className="min-h-10"
            onClick={simulate}
            disabled={stream.isStreaming || (scenario === "custom" && !customText.trim())}
          >
            <Play className="size-4" aria-hidden /> {stream.isStreaming ? "Analyzing..." : "Simulate"}
          </Button>
        </div>

        {scenario === "custom" ? (
          <Textarea
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            placeholder="Describe the change, e.g. add a 2 kW X-ray machine, or run the theatre 4 more hours a day."
            className="min-h-20 text-sm"
            aria-label="Describe your change"
          />
        ) : null}

        {ran ? (
          <div className="space-y-3">
            {comp ? (
              <>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Delta
                    label="Battery autonomy"
                    value={`${comp.deltaServiceHours > 0 ? "+" : ""}${comp.deltaServiceHours} h`}
                    good={comp.deltaServiceHours >= 0}
                  />
                  <Delta
                    label="Monthly cost"
                    value={`${comp.deltaMonthlyCostTzs <= 0 ? "-" : "+"}${formatCurrency(Math.abs(comp.deltaMonthlyCostTzs))}`}
                    good={comp.deltaMonthlyCostTzs <= 0}
                  />
                  <Delta
                    label="Resilience"
                    value={`${comp.deltaResiliencePoints > 0 ? "+" : ""}${comp.deltaResiliencePoints} pts`}
                    good={comp.deltaResiliencePoints >= 0}
                  />
                </div>

                {/* Before vs after comparison chart */}
                <div className="rounded-xl border border-border p-3">
                  <p className="mb-2 text-xs font-medium text-foreground">Before vs after</p>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={comp.comparison} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                      <XAxis dataKey="metric" tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
                      <YAxis tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
                      <Tooltip contentStyle={TOOLTIP_STYLE} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Bar dataKey="before" name="Before" fill="var(--color-chart-3)" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="after" name="After" fill="var(--color-primary)" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </>
            ) : null}

            <div className="rounded-lg bg-muted/50 p-3 text-sm text-foreground">
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-primary">
                  <Sparkles className="size-3.5" aria-hidden /> AI recommendation
                  {comp ? (
                    <span
                      className={cn(
                        "ml-1 rounded-full border px-1.5 py-0.5 text-[10px] font-semibold",
                        VERDICT_META[comp.verdict].className,
                      )}
                    >
                      {VERDICT_META[comp.verdict].label}
                    </span>
                  ) : null}
                </span>
                {stream.text && !stream.isStreaming && speech.supported ? (
                  <button
                    type="button"
                    onClick={() =>
                      speech.speaking ? speech.stop() : speech.speak(stream.text, locale === "sw" ? "sw-TZ" : "en-US")
                    }
                    aria-label={speech.speaking ? "Stop" : "Read aloud"}
                    className={cn("text-muted-foreground", FOCUS_RING)}
                  >
                    {speech.speaking ? <Square className="size-3.5" aria-hidden /> : <Volume2 className="size-3.5" aria-hidden />}
                  </button>
                ) : null}
              </div>
              {stream.isError ? (
                <p className="text-xs text-muted-foreground" role="status">
                  The AI explanation is unavailable right now. The estimated numbers above still apply.
                </p>
              ) : (
                <p aria-live="polite">
                  {stream.text}
                  {stream.isStreaming ? <TypingCursor /> : null}
                </p>
              )}
            </div>
          </div>
        ) : (
          <p className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Choose or describe a scenario and tap Simulate to see the estimated impact.
          </p>
        )}
      </CardContent>
    </Card>
  )
}

function Delta({ label, value, good }: { label: string; value: string; good: boolean }) {
  const Icon = good ? ArrowUp : ArrowDown
  return (
    <div className="rounded-lg border border-border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("flex items-center gap-1 text-lg font-bold", good ? "text-success" : "text-destructive")}>
        <Icon className="size-4" aria-hidden />
        {value}
      </p>
    </div>
  )
}
