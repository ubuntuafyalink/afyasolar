"use client"

import { useMemo } from "react"
import { m } from "framer-motion"
import { ShieldAlert, Info, ArrowUpRight, ArrowDownRight } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { LazyMotionProvider } from "@/components/motion/lazy-motion-provider"
import {
  resolveCoords,
  climatologyRange,
  toCvi,
  NASA_POWER_PARAMETERS,
} from "@/lib/climate/nasa-power"
import { useNasaPower } from "@/hooks/use-nasa-power"
import { useFacilityRcsSummary } from "@/hooks/use-facility-rcs-summary"
import { deriveEnergyProfile } from "@/lib/dashboard/power-model"
import { featuresFromFacilityData } from "@/lib/intelligence/risk-features"
import { assessRisk, type RiskTier } from "@/lib/intelligence/risk-model"
import type { MeuSummary, SizingSummary } from "@/components/solar/afya-solar-sizing-tool"
import { useFacilityPreferences } from "./facility-preferences-provider"

const TIER_STYLE: Record<RiskTier, string> = {
  Low: "bg-success/10 text-success",
  Elevated: "bg-primary/10 text-primary",
  High: "bg-warning/15 text-warning-foreground",
  Severe: "bg-destructive/10 text-destructive",
}

/**
 * "Disruption risk (modelled)" — a transparent, explainable risk PRIOR for a
 * power-loss / cold-chain failure in the coming weeks. Leads with the tier + the
 * top contributing drivers; shows the modelled probability only as a small,
 * caveated secondary figure (it is a calibrated prior, not a validated forecast).
 * Reuses the same real RCS + NASA hazard + energy data as the RCS explainer.
 */
export function DisruptionRiskCard({
  facilityId,
  region,
  meuSummary,
  sizingSummary,
}: {
  facilityId?: string
  region?: string | null
  meuSummary?: MeuSummary | null
  sizingSummary?: SizingSummary | null
}) {
  const { t, locale } = useFacilityPreferences()
  const pick = (b: { en: string; sw: string }) => (locale === "sw" ? b.sw : b.en)

  const coords = useMemo(() => resolveCoords({ facilityId, region }), [facilityId, region])
  const range = useMemo(() => climatologyRange(), [])
  const hazards = useNasaPower({
    lat: coords.lat,
    lon: coords.lon,
    temporal: range.temporal,
    start: range.start,
    end: range.end,
    parameters: NASA_POWER_PARAMETERS,
  })
  const rcs = useFacilityRcsSummary(facilityId)

  const result = useMemo(() => {
    const cvi = hazards.data ? toCvi(hazards.data) : null
    const energy = deriveEnergyProfile(meuSummary, sizingSummary)
    const { features, completeness, dataGaps } = featuresFromFacilityData({
      rcs: rcs.data
        ? { csf: rcs.data.csf, ecpq: rcs.data.ecpq, rrc: rcs.data.rrc, criticalAttention: rcs.data.criticalAttention }
        : null,
      cvi: cvi ? { composite: cvi.composite, byHazard: { heat: cvi.byHazard.heat } } : null,
      energy: energy ? { batteryCapacityKwh: energy.batteryCapacityKwh, criticalLoadKw: energy.criticalLoadKw } : null,
    })
    return assessRisk(features, completeness, dataGaps)
  }, [hazards.data, rcs.data, meuSummary, sizingSummary])

  const topDrivers = result.drivers.slice(0, 3)

  return (
    <LazyMotionProvider>
      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldAlert className="size-5 text-primary" aria-hidden />
              {t("risk.title")}
            </CardTitle>
            {result.sufficientData ? (
              <Badge variant="secondary" className={cn("text-sm", TIER_STYLE[result.tier])}>
                {t(`risk.tier.${result.tier}`)}
              </Badge>
            ) : (
              <Badge variant="outline" className="text-sm text-muted-foreground">
                {t("risk.insufficient")}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{t("risk.subtitle")}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {!result.sufficientData ? (
            <p className="text-sm text-muted-foreground">{t("risk.insufficientBody")}</p>
          ) : (
          /* Drivers lead; probability is a small, caveated secondary figure. */
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs text-muted-foreground">{t("risk.topDrivers")}</p>
              <ul className="mt-1 space-y-1">
                {topDrivers.length === 0 ? (
                  <li className="text-sm text-muted-foreground">{t("risk.noDrivers")}</li>
                ) : (
                  topDrivers.map((d) => {
                    const Icon = d.direction === "reduces" ? ArrowDownRight : ArrowUpRight
                    return (
                      <li key={d.key} className="flex items-center gap-2 text-sm">
                        <Icon
                          className={cn("size-3.5", d.direction === "reduces" ? "text-success" : "text-warning")}
                          aria-hidden
                        />
                        <span className="text-foreground">{pick(d.label)}</span>
                        <span className="text-xs text-muted-foreground">{d.sharePct}%</span>
                      </li>
                    )
                  })
                )}
              </ul>
            </div>
            <div className="text-right">
              <p className="text-[11px] text-muted-foreground">{t("risk.modelledLabel")}</p>
              <p className="text-2xl font-bold tabular-nums text-muted-foreground">
                {Math.round(result.probability * 100)}%
              </p>
              <p className="text-[11px] text-muted-foreground">
                {t(`risk.confidence.${result.confidence}`)}
              </p>
            </div>
          </div>
          )}

          <m.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-start gap-1.5 rounded-lg border border-border bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground"
          >
            <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            <span>
              {t("risk.caveat")}
              {result.dataGaps.length ? ` ${t("risk.missing")} ${result.dataGaps.join(", ")}.` : ""}
            </span>
          </m.p>
        </CardContent>
      </Card>
    </LazyMotionProvider>
  )
}
