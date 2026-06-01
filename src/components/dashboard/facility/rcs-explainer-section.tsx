"use client"

import { useMemo } from "react"
import { Gauge, ShieldCheck, TrendingUp, Lightbulb, ArrowRight, Sigma } from "lucide-react"
import { m } from "framer-motion"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { FOCUS_RING, scoreBarColor } from "@/lib/dashboard/facility-ui"
import { DemoDataBadge } from "@/components/ui/demo-data-badge"
import { LazyMotionProvider } from "@/components/motion/lazy-motion-provider"
import {
  getRcsExplainer,
  type Bilingual,
  type RcsDimensionInsight,
} from "@/lib/dashboard/facility-demo-data"
import type { NavSection } from "@/lib/dashboard/facility-nav"
import { useFacilityPreferences } from "./facility-preferences-provider"
import { OfflineReadyBadge } from "./offline-ready-badge"
import { ResilienceReportButton } from "./resilience-report-button"
import { RcsWhatIf } from "./rcs-what-if"
import { RcsTrend } from "./rcs-trend"
import { RcsBenchmark } from "./rcs-benchmark"
import { ReadAloudButton } from "./read-aloud-button"
import { ExportButton } from "./export-button"

const TIER_STYLE: Record<string, string> = {
  Resilient: "bg-success/10 text-success",
  Developing: "bg-primary/10 text-primary",
  "At risk": "bg-warning/15 text-warning-foreground",
  Critical: "bg-destructive/10 text-destructive",
}

/** Distinct (non-status) palette for the contribution segments one per dimension. */
const SEGMENT_COLORS = [
  "bg-chart-1",
  "bg-chart-2",
  "bg-chart-3",
  "bg-chart-4",
  "bg-chart-5",
  "bg-primary",
  "bg-solar",
]

/**
 * "Why this score" a read-only, transparent breakdown of the Resilience
 * Capacity Score. Reuses the same CRiPHC math as the interactive widget, then
 * shows each dimension's contribution to the RCS, the recoverable points, and
 * plain-language what-it-measures / how-to-improve copy. Bilingual + accessible.
 */
export function RcsExplainerSection({
  facilityId,
  facilityName,
  region,
  onNavigate,
}: {
  facilityId?: string
  facilityName?: string | null
  region?: string | null
  onNavigate?: (section: NavSection) => void
}) {
  const { t, locale } = useFacilityPreferences()
  const pick = (b: Bilingual) => (locale === "sw" ? b.sw : b.en)

  const model = useMemo(() => getRcsExplainer(facilityId), [facilityId])
  const core = model.dimensions.filter((d) => !d.isNew)
  const v2 = model.dimensions.filter((d) => d.isNew)
  const opportunities = useMemo(
    () => [...model.dimensions].sort((a, b) => b.gapPoints - a.gapPoints),
    [model.dimensions],
  )
  const maxGap = Math.max(1, ...opportunities.map((d) => d.gapPoints))

  return (
    <LazyMotionProvider>
      <section className="space-y-4" aria-labelledby="rcs-title">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Gauge className="size-5 text-primary" aria-hidden />
              <h2 id="rcs-title" className="text-xl font-semibold text-foreground">
                {t("rcs.title")}
              </h2>
            </div>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{t("rcs.subtitle")}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ReadAloudButton
              text={`${t("rcs.headlineLabel")}: ${model.rcs}. ${model.tier}.`}
            />
            <ExportButton
              filename="resilience-score-breakdown"
              getRows={() =>
                model.dimensions.map((d) => ({
                  dimension: t(`rcs.dim.${d.code}`),
                  code: d.code,
                  weight: Math.round(d.weight * 100),
                  score: d.score,
                  contribution: d.contribution,
                  recoverable: d.gapPoints,
                }))
              }
            />
            <ResilienceReportButton
              facilityId={facilityId}
              facilityName={facilityName}
              region={region}
            />
            <OfflineReadyBadge />
            <DemoDataBadge />
          </div>
        </div>

        {/* RCS headline + "how the score is built" */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="size-5 text-primary" aria-hidden />
              {t("rcs.headlineLabel")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex flex-wrap items-center gap-4">
              <p className="text-5xl font-black leading-none tracking-tight text-foreground tabular-nums">
                {model.rcs}
              </p>
              <Badge className={cn("text-sm", TIER_STYLE[model.tier])} variant="secondary">
                {model.tier}
              </Badge>
            </div>

            {/* Stacked contribution bar (segments sum to the RCS out of 100) */}
            <div>
              <div className="mb-1 flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">{t("rcs.howBuilt")}</span>
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <Sigma className="size-3.5" aria-hidden />
                  {t("rcs.formula")}
                </span>
              </div>
              <div
                className="flex h-4 w-full overflow-hidden rounded-full bg-muted"
                role="progressbar"
                aria-valuenow={model.rcs}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={t("rcs.headlineLabel")}
              >
                {model.dimensions.map((d, i) => (
                  <div
                    key={d.code}
                    className={cn("h-full", SEGMENT_COLORS[i % SEGMENT_COLORS.length])}
                    style={{ width: `${d.contribution}%` }}
                    title={`${d.code}: ${d.contribution} pts`}
                  />
                ))}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{t("rcs.howBuiltHint")}</p>

              {/* Legend (text + number, never colour alone) */}
              <ul className="mt-3 grid grid-cols-1 gap-x-4 gap-y-1.5 sm:grid-cols-2">
                {model.dimensions.map((d, i) => (
                  <li key={d.code} className="flex items-center gap-2 text-xs">
                    <span
                      className={cn(
                        "size-3 shrink-0 rounded-sm",
                        SEGMENT_COLORS[i % SEGMENT_COLORS.length],
                      )}
                      aria-hidden
                    />
                    <span className="flex-1 truncate text-foreground">{t(`rcs.dim.${d.code}`)}</span>
                    <span className="font-semibold tabular-nums text-foreground">
                      {t("rcs.points", { n: d.contribution })}
                    </span>
                    <span className="text-muted-foreground">{t("rcs.ofMax", { max: d.maxContribution })}</span>
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Biggest opportunities */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="size-5 text-primary" aria-hidden />
              {t("rcs.biggestOpportunities")}
            </CardTitle>
            <p className="text-xs text-muted-foreground">{t("rcs.biggestOpportunitiesHint")}</p>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {opportunities.map((d) => (
                <li key={d.code} className="flex items-center gap-3">
                  <span className="w-10 shrink-0 text-xs font-semibold text-muted-foreground">
                    {d.code}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                    {t(`rcs.dim.${d.code}`)}
                  </span>
                  <div
                    className="hidden h-2 w-28 overflow-hidden rounded-full bg-muted sm:block"
                    role="progressbar"
                    aria-valuenow={d.gapPoints}
                    aria-valuemin={0}
                    aria-valuemax={maxGap}
                    aria-label={`${t(`rcs.dim.${d.code}`)} ${t("rcs.recoverable")}`}
                  >
                    <div
                      className="h-full rounded-full bg-warning"
                      style={{ width: `${(d.gapPoints / maxGap) * 100}%` }}
                    />
                  </div>
                  <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
                    +{t("rcs.points", { n: d.gapPoints })}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Per-dimension detail */}
        <DimensionGroup
          title={t("rcs.coreFive")}
          dims={core}
          pick={pick}
          t={t}
        />
        <DimensionGroup
          title={t("rcs.v2Dimensions")}
          dims={v2}
          pick={pick}
          t={t}
        />

        {/* Resilience analytics: interactive what-if, trend history, benchmark */}
        <RcsWhatIf facilityId={facilityId} />
        <div className="grid gap-4 lg:grid-cols-2">
          <RcsTrend facilityId={facilityId} />
          <RcsBenchmark facilityId={facilityId} />
        </div>

        {/* Action */}
        {onNavigate && (
          <div className="flex justify-end">
            <Button
              variant="outline"
              onClick={() => onNavigate("climate-resilience")}
              className={cn("gap-1.5", FOCUS_RING)}
            >
              <Lightbulb className="size-4" aria-hidden />
              {t("rcs.viewPlan")}
              <ArrowRight className="size-4" aria-hidden />
            </Button>
          </div>
        )}
      </section>
    </LazyMotionProvider>
  )
}

function DimensionGroup({
  title,
  dims,
  pick,
  t,
}: {
  title: string
  dims: RcsDimensionInsight[]
  pick: (b: Bilingual) => string
  t: (key: string, vars?: Record<string, string | number>) => string
}) {
  if (dims.length === 0) return null
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <div className="grid gap-3 lg:grid-cols-2">
        {dims.map((d) => (
          <m.article
            key={d.code}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-2.5 rounded-xl border border-border bg-card p-4"
            aria-labelledby={`rcs-${d.code}-name`}
          >
            <div className="flex items-start justify-between gap-2">
              <h4 id={`rcs-${d.code}-name`} className="text-sm font-semibold text-foreground">
                {t(`rcs.dim.${d.code}`)}
                {d.isNew && (
                  <Badge variant="outline" className="ml-2 text-[10px]">
                    {t("rcs.new")}
                  </Badge>
                )}
              </h4>
              <span className="shrink-0 text-xs text-muted-foreground">
                {t("rcs.weight")} {Math.round(d.weight * 100)}% · {t("rcs.score")} {d.score}/100
              </span>
            </div>

            <div
              className="h-2 w-full overflow-hidden rounded-full bg-muted"
              role="progressbar"
              aria-valuenow={d.score}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${t(`rcs.dim.${d.code}`)} ${t("rcs.score")}`}
            >
              <div
                className={cn("h-full rounded-full", scoreBarColor(d.score))}
                style={{ width: `${d.score}%` }}
              />
            </div>

            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
              <span className="text-muted-foreground">
                {t("rcs.contribution")}:{" "}
                <span className="font-semibold text-foreground">
                  {t("rcs.points", { n: d.contribution })}
                </span>{" "}
                {t("rcs.ofMax", { max: d.maxContribution })}
              </span>
              <span className="text-muted-foreground">
                {t("rcs.recoverable")}:{" "}
                <span className="font-semibold text-foreground">
                  +{t("rcs.points", { n: d.gapPoints })}
                </span>
              </span>
            </div>

            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{t("rcs.whatItMeasures")}:</span>{" "}
              {pick(d.whatItMeasures)}
            </p>
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{t("rcs.howToImprove")}:</span>{" "}
              {pick(d.howToImprove)}
            </p>
          </m.article>
        ))}
      </div>
    </div>
  )
}
