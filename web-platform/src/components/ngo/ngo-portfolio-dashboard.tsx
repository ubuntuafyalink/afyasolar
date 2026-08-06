"use client"

import { useMemo, useState } from "react"
import {
  Building2,
  MapPin,
  Network,
  Gauge,
  Users,
  OctagonAlert,
  ChevronRight,
} from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { FOCUS_RING, scoreBarColor } from "@/lib/dashboard/facility-ui"
import { DemoDataBadge } from "@/components/ui/demo-data-badge"
import { LazyMotionProvider } from "@/components/motion/lazy-motion-provider"
import { FacilityToolbar } from "@/components/dashboard/facility/facility-toolbar"
import { OfflineReadyBadge } from "@/components/dashboard/facility/offline-ready-badge"
import { OfflineBanner } from "@/components/dashboard/facility/offline-banner"
import { useFacilityPreferences } from "@/components/dashboard/facility/facility-preferences-provider"
import {
  getPortfolioRows,
  getPortfolioSummary,
  getPortfolioChildServiceRollup,
  getPortfolioByRegion,
  type PortfolioRow,
  type ResilienceTier,
} from "@/lib/dashboard/ngo-portfolio-data"
import { NgoFacilityDetail } from "./ngo-facility-detail"

const TIER_ORDER: ResilienceTier[] = ["Resilient", "Developing", "At risk", "Critical"]
const TIER_BAR: Record<ResilienceTier, string> = {
  Resilient: "bg-success",
  Developing: "bg-primary",
  "At risk": "bg-warning",
  Critical: "bg-destructive",
}
const TIER_BADGE: Record<string, string> = {
  Resilient: "bg-success/10 text-success",
  Developing: "bg-primary/10 text-primary",
  "At risk": "bg-warning/15 text-warning-foreground",
  Critical: "bg-destructive/10 text-destructive",
}

/**
 * NGO / faith-based PORTFOLIO dashboard. Rolls up every facility in the network:
 * portfolio KPIs, resilience-tier mix, facilities ranked by RCS (most at-risk
 * first), child-services-at-risk across all sites, and a by-region breakdown 
 * with a per-facility drill-down. Bilingual + accessible; data is simulated.
 */
export function NgoPortfolioDashboard() {
  const { t } = useFacilityPreferences()
  const rows = useMemo(() => [...getPortfolioRows()].sort((a, b) => a.rcs - b.rcs), [])
  const summary = useMemo(() => getPortfolioSummary(), [])
  const rollup = useMemo(() => getPortfolioChildServiceRollup(), [])
  const regions = useMemo(() => getPortfolioByRegion(), [])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = rows.find((r) => r.id === selectedId) ?? null

  return (
    <LazyMotionProvider>
      <div className="min-h-screen bg-muted/30">
        <OfflineBanner />
        {/* Header */}
        <header className="sticky top-0 z-30 border-b border-border bg-card shadow-sm">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-2 min-w-0">
              <Network className="size-6 text-primary" aria-hidden />
              <div className="min-w-0">
                <h1 className="truncate text-xl font-semibold text-foreground sm:text-2xl">
                  {t("ngo.title")}
                </h1>
              </div>
            </div>
            <FacilityToolbar />
          </div>
        </header>

        <main id="ngo-main" className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <p className="max-w-2xl text-sm text-muted-foreground">{t("ngo.subtitle")}</p>
            <div className="flex items-center gap-2">
              <OfflineReadyBadge />
              <DemoDataBadge />
            </div>
          </div>

          {/* KPI cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <Kpi icon={<Building2 className="size-4" aria-hidden />} value={summary.facilities} label={t("ngo.kpi.facilities")} />
            <Kpi icon={<MapPin className="size-4" aria-hidden />} value={summary.regions} label={t("ngo.kpi.regions")} />
            <Kpi icon={<Network className="size-4" aria-hidden />} value={summary.networks} label={t("ngo.kpi.networks")} />
            <Kpi icon={<Gauge className="size-4" aria-hidden />} value={summary.avgRcs} label={t("ngo.kpi.avgRcs")} />
            <Kpi icon={<Users className="size-4" aria-hidden />} value={`${summary.womenLedPct}%`} label={t("ngo.kpi.womenLed")} />
            <Kpi icon={<OctagonAlert className="size-4" aria-hidden />} value={summary.failingSites} label={t("ngo.kpi.failingSites")} tone="destructive" />
          </div>

          {/* Tier distribution */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{t("ngo.tiers")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className="flex h-4 w-full overflow-hidden rounded-full bg-muted"
                role="img"
                aria-label={TIER_ORDER.map((tier) => `${t(`ngo.tier.${tier}`)}: ${summary.tierCounts[tier]}`).join(", ")}
              >
                {TIER_ORDER.map((tier) => {
                  const pct = (summary.tierCounts[tier] / summary.facilities) * 100
                  return pct > 0 ? (
                    <div key={tier} className={cn("h-full", TIER_BAR[tier])} style={{ width: `${pct}%` }} />
                  ) : null
                })}
              </div>
              <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
                {TIER_ORDER.map((tier) => (
                  <li key={tier} className="flex items-center gap-1.5 text-xs">
                    <span className={cn("size-3 rounded-sm", TIER_BAR[tier])} aria-hidden />
                    <span className="text-foreground">{t(`ngo.tier.${tier}`)}</span>
                    <span className="font-semibold tabular-nums text-muted-foreground">
                      {summary.tierCounts[tier]}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Facility detail (drill-down) */}
          {selected && <NgoFacilityDetail facility={selected} onClose={() => setSelectedId(null)} />}

          {/* Ranking */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{t("ngo.ranking.title")}</CardTitle>
              <p className="text-xs text-muted-foreground">{t("ngo.ranking.hint")}</p>
            </CardHeader>
            <CardContent className="p-0">
              <FacilityRanking rows={rows} onSelect={setSelectedId} selectedId={selectedId} />
            </CardContent>
          </Card>

          {/* Child-services rollup + region breakdown */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{t("ngo.rollup.title")}</CardTitle>
                <p className="text-xs text-muted-foreground">{t("ngo.rollup.hint")}</p>
              </CardHeader>
              <CardContent className="space-y-3">
                {rollup.map((r) => {
                  const total = r.failing + r.atRisk + r.ok
                  return (
                    <div key={r.key}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="text-foreground">{t(`service.${r.key}`)}</span>
                        <span className="text-xs text-muted-foreground">
                          {t("ngo.rollup.sitesFailing", { n: r.failing })} ·{" "}
                          {t("ngo.rollup.sitesAtRisk", { n: r.atRisk })}
                        </span>
                      </div>
                      <div
                        className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted"
                        role="img"
                        aria-label={`${t(`service.${r.key}`)}: ${t("ngo.rollup.sitesFailing", { n: r.failing })}, ${t("ngo.rollup.sitesAtRisk", { n: r.atRisk })}, ${t("ngo.rollup.sitesOk", { n: r.ok })}`}
                      >
                        <div className="h-full bg-destructive" style={{ width: `${(r.failing / total) * 100}%` }} />
                        <div className="h-full bg-warning" style={{ width: `${(r.atRisk / total) * 100}%` }} />
                        <div className="h-full bg-success" style={{ width: `${(r.ok / total) * 100}%` }} />
                      </div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{t("ngo.region.title")}</CardTitle>
                <p className="text-xs text-muted-foreground">{t("ngo.region.hint")}</p>
              </CardHeader>
              <CardContent className="space-y-3">
                {regions.map((g) => (
                  <div key={g.region} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-foreground">{g.region}</span>
                      <span className="text-xs text-muted-foreground">
                        {t("ngo.region.facilities", { n: g.facilities })} ·{" "}
                        {t("ngo.region.atRiskSites", { n: g.atRiskSites })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div
                        className="h-2 flex-1 overflow-hidden rounded-full bg-muted"
                        role="progressbar"
                        aria-valuenow={g.avgRcs}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`${g.region} ${t("ngo.kpi.avgRcs")}`}
                      >
                        <div className={cn("h-full rounded-full", scoreBarColor(g.avgRcs))} style={{ width: `${g.avgRcs}%` }} />
                      </div>
                      <span className="w-10 shrink-0 text-right text-xs font-semibold tabular-nums text-foreground">
                        {g.avgRcs}
                      </span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </LazyMotionProvider>
  )
}

function Kpi({
  icon,
  value,
  label,
  tone,
}: {
  icon: React.ReactNode
  value: React.ReactNode
  label: string
  tone?: "destructive"
}) {
  return (
    <Card className={cn(tone === "destructive" && summaryAlert(value))}>
      <CardContent className="flex flex-col gap-1 p-3">
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {icon}
          <span className="truncate">{label}</span>
        </span>
        <span className="text-2xl font-bold tabular-nums text-foreground">{value}</span>
      </CardContent>
    </Card>
  )
}

/** Tint the failing-sites KPI only when there is at least one. */
function summaryAlert(value: React.ReactNode): string {
  const n = typeof value === "number" ? value : Number(value)
  return n > 0 ? "border-destructive/30 bg-destructive/5" : ""
}

function FacilityRanking({
  rows,
  onSelect,
  selectedId,
}: {
  rows: PortfolioRow[]
  onSelect: (id: string) => void
  selectedId: string | null
}) {
  const { t } = useFacilityPreferences()
  return (
    <div className="divide-y divide-border">
      {/* Column headers (desktop) */}
      <div className="hidden grid-cols-12 gap-2 px-4 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground sm:grid">
        <span className="col-span-5">{t("ngo.ranking.facility")}</span>
        <span className="col-span-2">{t("ngo.ranking.rcs")}</span>
        <span className="col-span-3">{t("ngo.ranking.childAtRisk")}</span>
        <span className="col-span-2">{t("ngo.ranking.topHazard")}</span>
      </div>
      {rows.map((r) => {
        const atRisk = r.childFailing + r.childAtRisk
        return (
          <button
            key={r.id}
            type="button"
            onClick={() => onSelect(r.id)}
            aria-pressed={selectedId === r.id}
            className={cn(
              "grid w-full grid-cols-1 items-center gap-1 px-4 py-3 text-left sm:grid-cols-12 sm:gap-2",
              "hover:bg-muted/50",
              FOCUS_RING,
              selectedId === r.id && "bg-primary/5",
            )}
          >
            <div className="min-w-0 sm:col-span-5">
              <div className="flex items-center gap-2">
                <span className="truncate font-medium text-foreground">{r.name}</span>
                {r.womenLed && (
                  <Badge variant="secondary" className="hidden text-[10px] sm:inline-flex">
                    {t("ngo.womenLedBadge")}
                  </Badge>
                )}
              </div>
              <span className="text-xs text-muted-foreground">
                {r.district}, {r.region}
              </span>
            </div>
            <div className="flex items-center gap-2 sm:col-span-2">
              <span className="w-8 text-sm font-semibold tabular-nums text-foreground">{r.rcs}</span>
              <Badge className={cn("text-[10px]", TIER_BADGE[r.tier])} variant="secondary">
                {t(`ngo.tier.${r.tier}`)}
              </Badge>
            </div>
            <div className="text-sm sm:col-span-3">
              {atRisk > 0 ? (
                <span className={cn(r.childFailing > 0 ? "text-destructive" : "text-warning-foreground")}>
                  {r.childFailing > 0
                    ? t("ngo.rollup.sitesFailing", { n: r.childFailing })
                    : t("ngo.rollup.sitesAtRisk", { n: r.childAtRisk })}
                </span>
              ) : (
                <span className="text-muted-foreground"></span>
              )}
            </div>
            <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground sm:col-span-2">
              <span className="truncate">
                {r.topHazard.type} · {r.topHazard.score}
              </span>
              <ChevronRight className="hidden size-4 shrink-0 sm:block" aria-hidden />
            </div>
          </button>
        )
      })}
    </div>
  )
}
