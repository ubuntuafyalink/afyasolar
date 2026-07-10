"use client"

import { useMemo } from "react"
import {
  Gauge,
  ShieldCheck,
  TrendingUp,
  Lightbulb,
  ArrowRight,
  Sigma,
  Satellite,
  BadgeCheck,
  ClipboardList,
  AlertTriangle,
} from "lucide-react"
import { m } from "framer-motion"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { FOCUS_RING, scoreBarColor } from "@/lib/dashboard/facility-ui"
import { LazyMotionProvider } from "@/components/motion/lazy-motion-provider"
import {
  getRcsExplainerFromSummary,
  type Bilingual,
  type RcsDimensionInsight,
  type RcsDimensionSource,
  type RcsSummaryCapacities,
} from "@/lib/dashboard/facility-demo-data"
import {
  resolveCoords,
  climatologyRange,
  toCvi,
  NASA_POWER_PARAMETERS,
} from "@/lib/climate/nasa-power"
import { useNasaPower } from "@/hooks/use-nasa-power"
import { useFacilityRcsSummary } from "@/hooks/use-facility-rcs-summary"
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

const SOURCE_STYLE: Record<RcsDimensionSource, string> = {
  measured: "border-success/30 bg-success/10 text-success",
  assessed: "border-primary/30 bg-primary/10 text-primary",
  estimated: "border-warning/30 bg-warning/15 text-warning-foreground",
}

/**
 * "Why this score" a read-only, transparent breakdown of the Resilience
 * Capacity Score. Reads the facility's REAL persisted CRiPHC assessment
 * (climate_score_summaries) when one exists so the headline reflects the real
 * score; the Hazard Exposure dimension is refreshed from live NASA POWER climate.
 * When the facility has never been assessed it shows an honest "not yet assessed"
 * state (with the real Hazard Exposure reading, if available) and a call to
 * complete the assessment never a fabricated score. Bilingual + accessible.
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

  // Real Hazard Exposure: fetch the facility's NASA POWER climate (same pipeline
  // as Climate Outlook) and derive the HES capacity as the inverse of the
  // measured Climate Vulnerability Index composite (higher exposure -> lower
  // capacity). Used both to refresh HES on a real score and to give the honest
  // "not yet assessed" state a genuine measurement to show.
  const coords = useMemo(() => resolveCoords({ facilityId, region }), [facilityId, region])
  const range = useMemo(() => climatologyRange(), [])
  const climate = useNasaPower({
    lat: coords.lat,
    lon: coords.lon,
    temporal: range.temporal,
    start: range.start,
    end: range.end,
    parameters: NASA_POWER_PARAMETERS,
  })
  const realCvi = useMemo(() => (climate.data ? toCvi(climate.data) : null), [climate.data])
  const hesScore =
    realCvi ? Math.max(0, Math.min(100, Math.round(100 - realCvi.composite))) : undefined

  // The facility's most recent PERSISTED assessment score (the real RCS).
  const summaryQuery = useFacilityRcsSummary(facilityId)
  const summary = summaryQuery.data

  const model = useMemo(() => {
    if (!summary) return null
    const caps: RcsSummaryCapacities = {
      hes: summary.hes,
      csf: summary.csf,
      ecpq: summary.ecpq,
      edc: summary.edc,
      rrc: summary.rrc,
      rcs: summary.rcs,
      hesFromClimate: summary.hesFromClimate,
    }
    return getRcsExplainerFromSummary(caps, hesScore)
  }, [summary, hesScore])

  const mode: "loading" | "assessed" | "hes-only" | "none" = summaryQuery.isLoading
    ? "loading"
    : model
      ? "assessed"
      : hesScore != null
        ? "hes-only"
        : "none"

  const assessedAt = summary?.assessedAt
  const assessedOn = useMemo(() => {
    if (!assessedAt) return null
    const d = new Date(assessedAt)
    return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString(locale === "sw" ? "sw-TZ" : "en-GB")
  }, [assessedAt, locale])

  const opportunities = useMemo(
    () => (model ? [...model.dimensions].sort((a, b) => b.gapPoints - a.gapPoints) : []),
    [model],
  )
  const maxGap = Math.max(1, ...opportunities.map((d) => d.gapPoints))

  const goToAssessment = () => onNavigate?.("climate-outlook")

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
            {model ? (
              <>
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
                      source: d.source,
                      contribution: d.contribution,
                      recoverable: d.gapPoints,
                    }))
                  }
                />
              </>
            ) : null}
            <ResilienceReportButton
              facilityId={facilityId}
              facilityName={facilityName}
              region={region}
            />
            <OfflineReadyBadge />
            {mode === "assessed" ? (
              <span className="inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                <BadgeCheck className="size-3" aria-hidden />
                {assessedOn ? t("rcs.assessedOn", { date: assessedOn }) : t("rcs.assessedBadge")}
              </span>
            ) : mode === "hes-only" ? (
              <span className="inline-flex items-center gap-1 rounded-md border border-warning/30 bg-warning/15 px-2 py-0.5 text-[11px] font-medium text-warning-foreground">
                <ClipboardList className="size-3" aria-hidden />
                {t("rcs.assessmentPending")}
              </span>
            ) : null}
          </div>
        </div>

        {mode === "loading" ? (
          <Card>
            <CardContent className="py-10">
              <div className="mx-auto h-4 w-40 animate-pulse rounded bg-muted" />
              <p className="mt-3 text-center text-sm text-muted-foreground">{t("rcs.loading")}</p>
            </CardContent>
          </Card>
        ) : mode !== "assessed" ? (
          /* Honest "not yet assessed" state never a fabricated RCS. */
          <NotAssessedState
            t={t}
            hesScore={hesScore}
            cviComposite={realCvi?.composite}
            onStart={onNavigate ? goToAssessment : undefined}
          />
        ) : model ? (
          <>
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
                  {summary?.criticalAttention ? (
                    <span className="inline-flex items-center gap-1 rounded-md border border-destructive/30 bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
                      <AlertTriangle className="size-3.5" aria-hidden />
                      {t("rcs.criticalAttention")}
                    </span>
                  ) : null}
                </div>

                {/* Relationship to Climate Outlook: HES is driven by the measured CVI. */}
                {hesScore != null && realCvi ? (
                  <p className="flex flex-wrap items-center gap-1.5 rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-xs text-foreground">
                    <Satellite className="size-3.5 shrink-0" aria-hidden />
                    <span>
                      {t("rcs.hazardFromClimate")}{" "}
                      {t("rcs.measuredExposure", { value: realCvi.composite })}
                    </span>
                    {onNavigate ? (
                      <button
                        type="button"
                        onClick={() => onNavigate("climate-outlook")}
                        className={cn("font-medium underline", FOCUS_RING)}
                      >
                        {t("rcs.openClimateOutlook")}
                      </button>
                    ) : null}
                  </p>
                ) : null}

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
            <DimensionGroup title={t("rcs.coreFive")} dims={model.dimensions} pick={pick} t={t} />

            {/* Resilience analytics: interactive what-if, trend history, benchmark */}
            <RcsWhatIf facilityId={facilityId} hesScore={hesScore} />
            <div className="grid gap-4 lg:grid-cols-2">
              <RcsTrend facilityId={facilityId} hesScore={hesScore} />
              <RcsBenchmark facilityId={facilityId} hesScore={hesScore} />
            </div>

            {/* Action */}
            {onNavigate && (
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  onClick={() => onNavigate("climate-outlook")}
                  className={cn("gap-1.5", FOCUS_RING)}
                >
                  <Lightbulb className="size-4" aria-hidden />
                  {t("rcs.viewPlan")}
                  <ArrowRight className="size-4" aria-hidden />
                </Button>
              </div>
            )}
          </>
        ) : null}
      </section>
    </LazyMotionProvider>
  )
}

/**
 * Honest state for a facility that has not completed its CRiPHC assessment. Shows
 * the one dimension we can measure without the questionnaire Hazard Exposure,
 * from real NASA climate and invites the user to complete the assessment to
 * unlock the full score. Never invents CSF/ECPQ/EDC/RRC.
 */
function NotAssessedState({
  t,
  hesScore,
  cviComposite,
  onStart,
}: {
  t: (key: string, vars?: Record<string, string | number>) => string
  hesScore?: number
  cviComposite?: number
  onStart?: () => void
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <ClipboardList className="size-5 text-primary" aria-hidden />
          {t("rcs.notAssessedTitle")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="max-w-2xl text-sm text-muted-foreground">{t("rcs.notAssessedBody")}</p>

        {hesScore != null ? (
          <div className="rounded-xl border border-success/30 bg-success/5 p-4">
            <div className="flex items-center gap-2">
              <Satellite className="size-4 text-success" aria-hidden />
              <span className="text-sm font-medium text-foreground">{t("rcs.dim.HES")}</span>
              <span className="inline-flex items-center gap-1 rounded-md border border-success/30 bg-success/10 px-1.5 py-0.5 text-[10px] font-medium text-success">
                {t("rcs.source.measured")}
              </span>
            </div>
            <div className="mt-2 flex items-end gap-3">
              <span className="text-3xl font-black tabular-nums text-foreground">{hesScore}</span>
              <span className="pb-1 text-xs text-muted-foreground">/ 100</span>
            </div>
            <div
              className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted"
              role="progressbar"
              aria-valuenow={hesScore}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={t("rcs.dim.HES")}
            >
              <div
                className={cn("h-full rounded-full", scoreBarColor(hesScore))}
                style={{ width: `${hesScore}%` }}
              />
            </div>
            {cviComposite != null ? (
              <p className="mt-2 text-xs text-muted-foreground">
                {t("rcs.measuredExposure", { value: cviComposite })}
              </p>
            ) : null}
          </div>
        ) : null}

        {onStart ? (
          <Button onClick={onStart} className={cn("gap-1.5", FOCUS_RING)}>
            <ClipboardList className="size-4" aria-hidden />
            {t("rcs.completeAssessmentCta")}
            <ArrowRight className="size-4" aria-hidden />
          </Button>
        ) : null}
      </CardContent>
    </Card>
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
              <span
                className={cn(
                  "inline-flex shrink-0 items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium",
                  SOURCE_STYLE[d.source],
                )}
              >
                {t(`rcs.source.${d.source}`)}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {t("rcs.weight")} {Math.round(d.weight * 100)}%
              </span>
              <span>
                {t("rcs.score")} {d.score}/100
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
