"use client"

import { useMemo } from "react"
import { ShieldCheck, TriangleAlert, OctagonAlert, Baby } from "lucide-react"

import { cn } from "@/lib/utils"
import { DemoDataBadge } from "@/components/ui/demo-data-badge"
import { LazyMotionProvider } from "@/components/motion/lazy-motion-provider"
import {
  getChildServicesAtRisk,
  getChildServicesSummary,
  type ChildServiceStatus,
} from "@/lib/dashboard/facility-demo-data"
import type { NavSection } from "@/lib/dashboard/facility-nav"
import { useFacilityPreferences } from "./facility-preferences-provider"
import { OfflineReadyBadge } from "./offline-ready-badge"
import { ChildServiceCard } from "./child-service-card"
import { ExportButton } from "./export-button"

/** Sort order: most urgent first. */
const STATUS_RANK: Record<ChildServiceStatus, number> = { failing: 0, "at-risk": 1, ok: 2 }

/**
 * "Child Services at Risk" board the platform's headline view. Surfaces the
 * five child-critical services (cold-chain, maternity, neonatal, diagnostics,
 * water pumping) with status, resilience headroom, an about-to-fail prediction,
 * and the CRiPHC dimension each maps to. Bilingual + accessible; data is
 * simulated for now (DemoDataBadge), cached for offline use.
 */
export function ChildServicesSection({
  facilityId,
  onNavigate,
}: {
  facilityId?: string
  onNavigate?: (section: NavSection) => void
}) {
  const { t } = useFacilityPreferences()
  const services = useMemo(() => {
    return [...getChildServicesAtRisk(facilityId)].sort(
      (a, b) => STATUS_RANK[a.status] - STATUS_RANK[b.status],
    )
  }, [facilityId])
  const summary = useMemo(() => getChildServicesSummary(facilityId), [facilityId])

  return (
    <LazyMotionProvider>
      <section className="space-y-4" aria-labelledby="child-services-title">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Baby className="size-5 text-primary" aria-hidden />
              <h2 id="child-services-title" className="text-xl font-semibold text-foreground">
                {t("childServices.title")}
              </h2>
            </div>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              {t("childServices.subtitle")}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ExportButton
              filename="child-services-at-risk"
              getRows={() =>
                services.map((s) => ({
                  service: t(`service.${s.key}`),
                  status: t(`childServices.status.${s.status}`),
                  headroomPct: s.headroomPct,
                  linkedDimension: s.linkedDimension,
                  predictionDays: s.prediction
                    ? `${s.prediction.etaDaysMin}-${s.prediction.etaDaysMax}`
                    : "",
                }))
              }
            />
            <OfflineReadyBadge />
            <DemoDataBadge />
          </div>
        </div>

        {/* Summary chips */}
        <div className="grid grid-cols-3 gap-2 sm:max-w-xl">
          <SummaryChip
            icon={<OctagonAlert className="size-4" aria-hidden />}
            count={summary.failing}
            label={t("childServices.summary.failing")}
            tone="destructive"
          />
          <SummaryChip
            icon={<TriangleAlert className="size-4" aria-hidden />}
            count={summary.atRisk}
            label={t("childServices.summary.atRisk")}
            tone="warning"
          />
          <SummaryChip
            icon={<ShieldCheck className="size-4" aria-hidden />}
            count={summary.ok}
            label={t("childServices.summary.protected")}
            tone="success"
          />
        </div>

        {summary.failing === 0 && summary.atRisk === 0 && (
          <p className="rounded-lg border border-success/30 bg-success/5 px-3 py-2 text-sm text-success">
            {t("childServices.allClear")}
          </p>
        )}

        {/* Service cards */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {services.map((service) => (
            <ChildServiceCard
              key={service.key}
              service={service}
              onViewPlan={onNavigate ? () => onNavigate("climate-resilience") : undefined}
              onViewScore={onNavigate ? () => onNavigate("rcs") : undefined}
            />
          ))}
        </div>
      </section>
    </LazyMotionProvider>
  )
}

function SummaryChip({
  icon,
  count,
  label,
  tone,
}: {
  icon: React.ReactNode
  count: number
  label: string
  tone: "destructive" | "warning" | "success"
}) {
  const toneClass = {
    destructive: "border-destructive/30 bg-destructive/5 text-destructive",
    warning: "border-warning/40 bg-warning/10 text-warning-foreground",
    success: "border-success/30 bg-success/5 text-success",
  }[tone]

  return (
    <div className={cn("flex items-center gap-2 rounded-lg border px-3 py-2", toneClass)}>
      {icon}
      <span className="text-2xl font-bold tabular-nums leading-none">{count}</span>
      <span className="text-xs font-medium leading-tight">{label}</span>
    </div>
  )
}
