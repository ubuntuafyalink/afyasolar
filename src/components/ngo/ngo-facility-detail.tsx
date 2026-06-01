"use client"

import { X, ShieldCheck, TriangleAlert, OctagonAlert, type LucideIcon } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { FOCUS_RING, scoreBarColor } from "@/lib/dashboard/facility-ui"
import { getChildServicesAtRisk, type ChildServiceStatus } from "@/lib/dashboard/facility-demo-data"
import type { PortfolioRow } from "@/lib/dashboard/ngo-portfolio-data"
import { useFacilityPreferences } from "@/components/dashboard/facility/facility-preferences-provider"

const STATUS: Record<ChildServiceStatus, { icon: LucideIcon; badge: "success" | "warning" | "destructive" }> = {
  ok: { icon: ShieldCheck, badge: "success" },
  "at-risk": { icon: TriangleAlert, badge: "warning" },
  failing: { icon: OctagonAlert, badge: "destructive" },
}

/** Drill-down detail for one facility, reusing the per-facility child-service seed. */
export function NgoFacilityDetail({
  facility,
  onClose,
}: {
  facility: PortfolioRow
  onClose: () => void
}) {
  const { t } = useFacilityPreferences()
  const services = getChildServicesAtRisk(facility.id)

  return (
    <Card className="border-primary/30">
      <CardHeader className="flex flex-row items-start justify-between gap-2 pb-3">
        <div className="min-w-0">
          <CardTitle className="text-base">{facility.name}</CardTitle>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {facility.district}, {facility.region} · {t(`ngo.detail.network`)}: {facility.network}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          aria-label={t("ngo.detail.close")}
          className={cn("size-8 shrink-0", FOCUS_RING)}
        >
          <X className="size-4" aria-hidden />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Badge variant="outline">{facility.type}</Badge>
          {facility.womenLed && <Badge variant="secondary">{t("ngo.womenLedBadge")}</Badge>}
        </div>

        {/* RCS */}
        <div>
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{t("ngo.ranking.rcs")}</span>
            <span className="font-semibold tabular-nums text-foreground">
              {facility.rcs}/100 · {t(`ngo.tier.${facility.tier}`)}
            </span>
          </div>
          <div
            className="h-2 w-full overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-valuenow={facility.rcs}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${facility.name} ${t("ngo.ranking.rcs")}`}
          >
            <div
              className={cn("h-full rounded-full", scoreBarColor(facility.rcs))}
              style={{ width: `${facility.rcs}%` }}
            />
          </div>
        </div>

        {/* Child services */}
        <div>
          <p className="mb-2 text-sm font-medium text-foreground">{t("ngo.detail.childServices")}</p>
          <ul className="grid gap-2 sm:grid-cols-2">
            {services.map((s) => {
              const st = STATUS[s.status]
              const Icon = st.icon
              return (
                <li
                  key={s.key}
                  className="flex items-center justify-between gap-2 rounded-lg border border-border p-2 text-sm"
                >
                  <span className="truncate text-foreground">{t(`service.${s.key}`)}</span>
                  <Badge variant={st.badge} className="shrink-0 gap-1">
                    <Icon className="size-3" aria-hidden />
                    {t(`childServices.status.${s.status}`)}
                  </Badge>
                </li>
              )
            })}
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
