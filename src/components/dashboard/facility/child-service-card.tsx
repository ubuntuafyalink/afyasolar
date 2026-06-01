"use client"

import {
  Snowflake,
  Baby,
  HeartPulse,
  Microscope,
  Droplets,
  ShieldCheck,
  TriangleAlert,
  OctagonAlert,
  CalendarClock,
  ArrowRight,
  type LucideIcon,
} from "lucide-react"
import { m } from "framer-motion"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { FOCUS_RING } from "@/lib/dashboard/facility-ui"
import type {
  ChildServiceKey,
  ChildServiceRisk,
  ChildServiceStatus,
} from "@/lib/dashboard/facility-demo-data"
import { useFacilityPreferences } from "./facility-preferences-provider"

const SERVICE_ICON: Record<ChildServiceKey, LucideIcon> = {
  "cold-chain": Snowflake,
  maternity: Baby,
  neonatal: HeartPulse,
  diagnostics: Microscope,
  "water-pumping": Droplets,
}

/** Status → colour + icon. Colour is NEVER the only signal: icon + text too. */
const STATUS_STYLE: Record<
  ChildServiceStatus,
  { icon: LucideIcon; badge: "success" | "warning" | "destructive"; ring: string; bar: string }
> = {
  ok: {
    icon: ShieldCheck,
    badge: "success",
    ring: "border-success/30",
    bar: "bg-success",
  },
  "at-risk": {
    icon: TriangleAlert,
    badge: "warning",
    ring: "border-warning/40",
    bar: "bg-warning",
  },
  failing: {
    icon: OctagonAlert,
    badge: "destructive",
    ring: "border-destructive/40",
    bar: "bg-destructive",
  },
}

export function ChildServiceCard({
  service,
  onViewPlan,
  onViewScore,
}: {
  service: ChildServiceRisk
  onViewPlan?: () => void
  /** Navigate to the RCS explainability view for the linked dimension. */
  onViewScore?: () => void
}) {
  const { t, locale } = useFacilityPreferences()
  const ServiceIcon = SERVICE_ICON[service.key]
  const style = STATUS_STYLE[service.status]
  const StatusIcon = style.icon
  const pick = (b: { en: string; sw: string }) => (locale === "sw" ? b.sw : b.en)

  return (
    <m.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "flex flex-col gap-3 rounded-xl border-2 bg-card p-4 shadow-sm",
        style.ring,
      )}
      aria-labelledby={`svc-${service.key}-name`}
    >
      {/* Header: service identity + status */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
            <ServiceIcon className="size-5 text-foreground" aria-hidden />
          </span>
          <h3
            id={`svc-${service.key}-name`}
            className="text-sm font-semibold leading-tight text-foreground"
          >
            {t(`service.${service.key}`)}
          </h3>
        </div>
        <Badge variant={style.badge} className="shrink-0 gap-1">
          <StatusIcon className="size-3" aria-hidden />
          {t(`childServices.status.${service.status}`)}
        </Badge>
      </div>

      {/* Resilience headroom bar with numeric label (accessibility: value beside gauge) */}
      <div>
        <div className="mb-1 flex items-center justify-between text-xs">
          <span className="text-muted-foreground">{t("childServices.headroom")}</span>
          <span className="font-semibold tabular-nums text-foreground">{service.headroomPct}%</span>
        </div>
        <div
          className="h-2 w-full overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuenow={service.headroomPct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${t(`service.${service.key}`)} ${t("childServices.headroom")}`}
        >
          <div
            className={cn("h-full rounded-full", style.bar)}
            style={{ width: `${service.headroomPct}%` }}
          />
        </div>
      </div>

      {/* Depends on */}
      <p className="text-xs text-muted-foreground">
        <span className="font-medium text-foreground">{t("childServices.dependsOn")}:</span>{" "}
        {pick(service.dependsOn)}
      </p>

      {/* Drivers (why at risk) */}
      {service.drivers.length > 0 && (
        <div className="text-xs">
          <span className="font-medium text-foreground">{t("childServices.drivers")}:</span>
          <ul className="mt-1 list-disc space-y-0.5 pl-4 text-muted-foreground">
            {service.drivers.map((d, i) => (
              <li key={i}>{pick(d)}</li>
            ))}
          </ul>
        </div>
      )}

      {/* About-to-fail prediction */}
      {service.prediction && (
        <div
          className={cn(
            "rounded-lg border p-2.5 text-xs",
            service.status === "failing"
              ? "border-destructive/30 bg-destructive/5"
              : "border-warning/30 bg-warning/5",
          )}
        >
          <div className="flex items-center gap-1.5 font-medium text-foreground">
            <CalendarClock className="size-3.5" aria-hidden />
            {t("childServices.prediction")}
          </div>
          <p className="mt-1 text-muted-foreground">
            {t("childServices.predictionWindow")}:{" "}
            <span className="font-semibold text-foreground">
              {t("childServices.predictionDays", {
                min: service.prediction.etaDaysMin,
                max: service.prediction.etaDaysMax,
              })}
            </span>{" "}
            ·{" "}
            {t("childServices.confidence", { pct: service.prediction.confidencePct })}
          </p>
          <p className="mt-1 text-muted-foreground">{pick(service.prediction.signal)}</p>
        </div>
      )}

      {/* Footer: linked CRiPHC dimension + action */}
      <div className="mt-auto flex items-center justify-between gap-2 pt-1">
        {onViewScore ? (
          <button
            type="button"
            onClick={onViewScore}
            className={cn(
              "rounded text-left text-[11px] text-muted-foreground hover:text-foreground",
              FOCUS_RING,
            )}
            aria-label={`${t("childServices.linkedDimension")}: ${service.linkedDimension}`}
          >
            {t("childServices.linkedDimension")}:{" "}
            <span className="font-semibold text-foreground underline decoration-dotted underline-offset-2">
              {service.linkedDimension}
            </span>
          </button>
        ) : (
          <span className="text-[11px] text-muted-foreground">
            {t("childServices.linkedDimension")}:{" "}
            <span className="font-semibold text-foreground">{service.linkedDimension}</span>
          </span>
        )}
        {onViewPlan && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onViewPlan}
            className={cn("h-8 gap-1 px-2 text-xs", FOCUS_RING)}
          >
            {t("childServices.viewPlan")}
            <ArrowRight className="size-3.5" aria-hidden />
          </Button>
        )}
      </div>
    </m.article>
  )
}
