"use client"

import { useMemo } from "react"
import { Users, ArrowUp, ArrowDown, Minus } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { scoreBarColor } from "@/lib/dashboard/facility-ui"
import { getRcsExplainer } from "@/lib/dashboard/facility-demo-data"
import { getPortfolioSummary } from "@/lib/dashboard/ngo-portfolio-data"
import { useFacilityPreferences } from "./facility-preferences-provider"

function BenchmarkBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold tabular-nums text-foreground">{value}</span>
      </div>
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <div className={cn("h-full rounded-full", scoreBarColor(value))} style={{ width: `${value}%` }} />
      </div>
    </div>
  )
}

/**
 * Benchmarks this facility's RCS against the network (portfolio) average,
 * reusing the NGO portfolio rollup. Difference is shown with icon + text, never
 * colour alone.
 */
export function RcsBenchmark({ facilityId }: { facilityId?: string }) {
  const { t } = useFacilityPreferences()
  const mine = useMemo(() => getRcsExplainer(facilityId).rcs, [facilityId])
  const networkAvg = useMemo(() => getPortfolioSummary().avgRcs, [])
  const diff = mine - networkAvg

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="size-5 text-primary" aria-hidden />
          {t("rcs.benchmark.title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <BenchmarkBar label={t("rcs.benchmark.yours")} value={mine} />
        <BenchmarkBar label={t("rcs.benchmark.network")} value={networkAvg} />
        <p className="flex items-center gap-1.5 text-sm">
          {diff > 0 ? (
            <ArrowUp className="size-4 text-success" aria-hidden />
          ) : diff < 0 ? (
            <ArrowDown className="size-4 text-destructive" aria-hidden />
          ) : (
            <Minus className="size-4 text-muted-foreground" aria-hidden />
          )}
          <span className="text-foreground">
            {diff > 0
              ? t("rcs.benchmark.above", { n: diff })
              : diff < 0
                ? t("rcs.benchmark.below", { n: Math.abs(diff) })
                : t("rcs.benchmark.equal")}
          </span>
        </p>
      </CardContent>
    </Card>
  )
}
