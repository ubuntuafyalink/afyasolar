"use client"

import {
  CircleCheck,
  ClipboardList,
  Droplets,
  ShieldCheck,
  Thermometer,
  Waves,
  Wind,
} from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AiLoadingIndicator } from "@/components/ui/ai-loading"
import { BAND_COLOR, type BandKey, type Locale } from "@/lib/dashboard/explainer-copy"
import type { AiOutlookReport, OutlookReportItem } from "@/lib/ai/outlook-report-service"

const L: Record<string, Record<Locale, string>> = {
  title: { en: "Climate Outlook Report", sw: "Ripoti ya Mwelekeo wa Tabianchi" },
  subtitle: {
    en: "What the forecast means for this system — and what to do about it.",
    sw: "Utabiri unamaanisha nini kwa mfumo huu — na hatua za kuchukua.",
  },
  portfolioSubtitle: {
    en: "What the portfolio forecast means — and what to prioritise.",
    sw: "Utabiri wa vituo vyote unamaanisha nini — na kipi cha kupewa kipaumbele.",
  },
  safeHeadline: {
    en: "Safe outlook — no high climate hazards forecast",
    sw: "Mwelekeo salama — hakuna hatari kubwa za tabianchi zilizotabiriwa",
  },
  actionsHeadline: { en: "Recommended actions", sw: "Hatua zinazopendekezwa" },
  watchLabel: { en: "Keep an eye on", sw: "Endelea kufuatilia" },
  generating: { en: "Preparing the outlook report…", sw: "Inaandaa ripoti ya mwelekeo…" },
  unavailable: {
    en: "Report unavailable. Ensure the AI service is running.",
    sw: "Ripoti haipatikani. Hakikisha huduma ya AI inafanya kazi.",
  },
  footer: {
    en: "Derived from the AI climate forecast above. A decision aid, not a substitute for on-site inspection.",
    sw: "Imetokana na utabiri wa tabianchi wa AI hapo juu. Ni msaada wa maamuzi, si mbadala wa ukaguzi wa ana kwa ana.",
  },
}

const HAZARD_ICON: Record<OutlookReportItem["hazard"], typeof Thermometer> = {
  heat: Thermometer,
  flood: Waves,
  storm: Wind,
  drought: Droplets,
}

function BandChip({ band, label }: { band: BandKey; label: string }) {
  const color = BAND_COLOR[band] ?? "var(--color-muted-foreground)"
  return (
    <span
      className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
      style={{ color, backgroundColor: `color-mix(in oklch, ${color} 15%, transparent)` }}
    >
      {label}
    </span>
  )
}

/**
 * Presentational climate outlook report: per-hazard recommended actions when any
 * hazard is high, or an explicit green safe-outlook banner when none is. Shared
 * by the facility (bilingual) and admin portfolio (English) wrappers, which own
 * the data fetching.
 */
export function OutlookReportView({
  report,
  isLoading,
  isError,
  locale,
}: {
  report?: AiOutlookReport
  isLoading: boolean
  isError: boolean
  locale: Locale
}) {
  const t = (k: string) => L[k][locale]
  const isLlm = report?.source === "llm"
  const subtitle = report?.scope === "portfolio" ? t("portfolioSubtitle") : t("subtitle")

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex flex-wrap items-center gap-2 text-base">
          <ClipboardList className="size-4 text-primary" aria-hidden />
          {t("title")}
          {report ? (
            <span
              className="ml-auto rounded-full border px-2 py-0.5 text-[10px] font-medium"
              style={
                isLlm
                  ? { borderColor: "color-mix(in oklch, var(--color-primary) 30%, transparent)", backgroundColor: "color-mix(in oklch, var(--color-primary) 10%, transparent)", color: "var(--color-primary)" }
                  : { borderColor: "var(--color-border)", color: "var(--color-muted-foreground)" }
              }
            >
              {isLlm ? `AI · ${report.model ?? "LLM"}` : "AI · rule-based"}
            </span>
          ) : null}
        </CardTitle>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="space-y-3">
            <AiLoadingIndicator label={t("generating")} />
            <div className="space-y-2" aria-hidden>
              <div className="h-4 w-full animate-pulse rounded bg-muted" />
              <div className="h-4 w-4/5 animate-pulse rounded bg-muted" />
            </div>
          </div>
        ) : isError || !report ? (
          <p className="text-sm text-muted-foreground">{t("unavailable")}</p>
        ) : report.status === "all_clear" ? (
          <div className="rounded-lg border border-success/30 bg-success/10 p-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-5 shrink-0" style={{ color: "var(--color-success)" }} aria-hidden />
              <p className="text-sm font-semibold text-foreground">{t("safeHeadline")}</p>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-foreground">{report.summary}</p>
            {report.watch.length > 0 ? (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="text-xs text-muted-foreground">{t("watchLabel")}:</span>
                {report.watch.map((w) => (
                  <span key={w.hazard} className="inline-flex items-center gap-1.5">
                    <span className="text-xs font-medium text-foreground">{w.name} {w.score}/100</span>
                    <BandChip band={w.band} label={w.band_label} />
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        ) : (
          <>
            <p className="text-sm leading-relaxed text-foreground">{report.summary}</p>
            <div className="space-y-4">
              {report.triggered.map((item) => {
                const Icon = HAZARD_ICON[item.hazard]
                return (
                  <div key={item.hazard} className="rounded-lg border border-border p-3">
                    <div className="flex items-center gap-2">
                      <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                      <span className="text-sm font-semibold text-foreground">
                        {item.name} · {item.score}/100
                      </span>
                      <BandChip band={item.band} label={item.band_label} />
                    </div>
                    <p className="mt-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {t("actionsHeadline")}
                    </p>
                    <ul className="mt-1.5 space-y-2">
                      {(item.actions ?? []).map((action) => (
                        <li key={action} className="flex items-start gap-2 text-sm text-foreground">
                          <CircleCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                          {action}
                        </li>
                      ))}
                    </ul>
                  </div>
                )
              })}
            </div>
            {report.watch.length > 0 ? (
              <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
                <span className="text-xs text-muted-foreground">{t("watchLabel")}:</span>
                {report.watch.map((w) => (
                  <span key={w.hazard} className="inline-flex items-center gap-1.5">
                    <span className="text-xs font-medium text-foreground">{w.name} {w.score}/100</span>
                    <BandChip band={w.band} label={w.band_label} />
                  </span>
                ))}
              </div>
            ) : null}
          </>
        )}
        <p className="text-[11px] text-muted-foreground">{t("footer")}</p>
      </CardContent>
    </Card>
  )
}
