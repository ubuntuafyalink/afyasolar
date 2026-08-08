"use client"

import { Sparkles, RefreshCw, CloudSun, Zap, HeartPulse, ShieldCheck } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AiLoadingIndicator } from "@/components/ui/ai-loading"
import { resolveCoords } from "@/lib/climate/nasa-power"
import { useAiAdvisory } from "@/hooks/use-ai-advisory"
import type { AiAdvisoryMedical } from "@/lib/ai/advisory-service"
import { useFacilityPreferences } from "./facility-preferences-provider"

type Locale = "en" | "sw"

const L: Record<string, Record<Locale, string>> = {
  title: { en: "Facility Advisory", sw: "Ushauri wa Kituo" },
  subtitle: {
    en: "Your system's power, climate, medical loads & health — with recommended actions.",
    sw: "Nishati, tabianchi, mzigo wa tiba na afya ya mfumo wako — pamoja na hatua za kuchukua.",
  },
  recommendation: { en: "Recommendation", sw: "Ushauri" },
  generating: { en: "Generating your facility advisory…", sw: "Inatengeneza ushauri wa kituo chako…" },
  regenerate: { en: "Regenerate", sw: "Zalisha upya" },
  warming: { en: "The advisory engine is warming up — try again shortly.", sw: "Injini ya ushauri inaanza — jaribu tena baada ya muda mfupi." },
  unavailable: { en: "Advisory unavailable. Ensure the AI service is running.", sw: "Ushauri haupatikani. Hakikisha huduma ya AI inafanya kazi." },
  power: { en: "Power", sw: "Nishati" },
  climate: { en: "Climate", sw: "Tabianchi" },
  medical: { en: "Medical", sw: "Tiba" },
  system: { en: "System", sw: "Mfumo" },
  critical: { en: "critical", sw: "muhimu" },
  anomalies: { en: "anomalies", sw: "hitilafu" },
  footer: {
    en: "Generated from this facility's own AI models. A decision aid, not a substitute for on-site inspection.",
    sw: "Imetokana na modeli za AI za kituo hiki. Ni msaada wa maamuzi, si mbadala wa ukaguzi wa ana kwa ana.",
  },
}

function Pillar({ icon: Icon, label, value }: { icon: typeof Zap; label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
      <Icon className="size-3.5 shrink-0" aria-hidden />
      <span className="font-medium text-foreground">{label}</span>
      {value}
    </span>
  )
}

/**
 * Facility Advisory: a single-facility operations advisory (power · climate ·
 * medical equipment · system health & energy security). Fuses this facility's own
 * solar yield, climate hazards, battery health, and medical-equipment load — never
 * other facilities. Bilingual (en/sw); LLM with a keyless rule-based fallback.
 * The network/fleet briefing is a separate, admin-only feature.
 */
export function AiAdvisoryCard({
  facilityId,
  region,
  ageDays,
  systemKw,
  batteryLevel,
  medical,
}: {
  facilityId?: string
  region?: string | null
  ageDays?: number
  systemKw?: number
  batteryLevel?: number
  medical?: AiAdvisoryMedical
}) {
  const locale = (useFacilityPreferences().locale as Locale) ?? "en"
  const t = (k: string) => L[k][locale]

  const coords = resolveCoords({ facilityId, region })
  const { data, isLoading, isFetching, isError, error, refetch } = useAiAdvisory({
    facilityId: facilityId ?? null,
    lat: coords.lat,
    lon: coords.lon,
    ageDays,
    systemKw,
    batteryLevel,
    lang: locale,
    medical,
  })

  const modelNotReady = (error as Error | undefined)?.message?.toLowerCase().includes("warming")
  const inputs = data?.inputs
  const isLlm = data?.source === "llm"
  const criticalCount = inputs?.medical?.criticality?.critical

  return (
    <section className="space-y-4" aria-labelledby="ai-advisory-title">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="size-5 text-primary" aria-hidden />
            <h2 id="ai-advisory-title" className="text-xl font-semibold text-foreground">
              {t("title")}
            </h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
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
            {t("recommendation")}
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
              {t("regenerate")}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="space-y-3">
              <AiLoadingIndicator label={t("generating")} />
              <div className="space-y-2" aria-hidden>
                <div className="h-4 w-full animate-pulse rounded bg-muted" />
                <div className="h-4 w-11/12 animate-pulse rounded bg-muted" />
                <div className="h-4 w-4/5 animate-pulse rounded bg-muted" />
              </div>
            </div>
          ) : isError || !data ? (
            <p className="text-sm text-muted-foreground">
              {modelNotReady ? t("warming") : t("unavailable")}
            </p>
          ) : (
            <>
              <p className="text-sm leading-relaxed text-foreground">{data.advisory}</p>

              {/* Four pillars: what the advisory was computed from, for THIS facility. */}
              <div className="flex flex-wrap gap-2 border-t border-border pt-3">
                {inputs?.mean_daily_kwh != null || inputs?.battery_level != null ? (
                  <Pillar
                    icon={Zap}
                    label={t("power")}
                    value={[
                      inputs?.mean_daily_kwh != null ? `${inputs.mean_daily_kwh} kWh/day` : null,
                      inputs?.battery_level != null ? `${Math.round(inputs.battery_level)}%` : null,
                    ].filter(Boolean).join(" · ")}
                  />
                ) : null}
                {inputs?.hazards?.composite != null ? (
                  <Pillar icon={CloudSun} label={t("climate")} value={`${inputs.hazards.composite}/100`} />
                ) : null}
                {criticalCount != null ? (
                  <Pillar
                    icon={HeartPulse}
                    label={t("medical")}
                    value={[
                      `${criticalCount} ${t("critical")}`,
                      inputs?.medical?.peak_load_kw != null ? `${inputs.medical.peak_load_kw} kW` : null,
                    ].filter(Boolean).join(" · ")}
                  />
                ) : null}
                {inputs?.anomalies != null || inputs?.rul_days != null ? (
                  <Pillar
                    icon={ShieldCheck}
                    label={t("system")}
                    value={[
                      inputs?.rul_days != null ? `~${Math.max(0, Math.round(inputs.rul_days))} d` : null,
                      inputs?.anomalies != null ? `${inputs.anomalies} ${t("anomalies")}` : null,
                    ].filter(Boolean).join(" · ")}
                  />
                ) : null}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <p className="text-[11px] text-muted-foreground">{t("footer")}</p>
    </section>
  )
}
