"use client"

import { ArrowRight, PiggyBank, Recycle, Timer } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/utils"
import { getAuditOutputs } from "@/lib/dashboard/facility-demo-data"

/**
 * Spec 7.2: the three-output audit report Waste eliminated, Monthly cash
 * saved, Cost per service-hour reduced. Each output is anchored to a specific
 * decision the facility manager needs to make.
 */
export function AuditThreeOutputs({ facilityId }: { facilityId?: string }) {
  const o = getAuditOutputs(facilityId)

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {/* Output 1 Waste eliminated */}
      <Card className="border-l-4 border-l-warning">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Recycle className="size-5 text-warning-foreground" aria-hidden /> Waste eliminated
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-xs text-muted-foreground">Total monthly energy spend</p>
            <p className="text-2xl font-bold text-foreground">{formatCurrency(o.totalMonthlySpendTsh)}</p>
          </div>
          <ul className="space-y-1 text-sm">
            {o.spendBySource.map((s) => (
              <li key={s.source} className="flex justify-between text-muted-foreground">
                <span>{s.source}</span>
                <span className="font-medium text-foreground">{formatCurrency(s.monthlyTsh)}</span>
              </li>
            ))}
          </ul>
          <div className="rounded-lg bg-warning/10 p-3">
            <p className="text-xs font-medium text-warning-foreground">
              Removable waste: {formatCurrency(o.wasteTotalTsh)} / month
            </p>
            <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
              {o.wasteItems.map((w) => (
                <li key={w.label} className="flex justify-between">
                  <span>{w.label}</span>
                  <span>{formatCurrency(w.monthlyTsh)}</span>
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Output 2 Monthly cash saved */}
      <Card className="border-l-4 border-l-success">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <PiggyBank className="size-5 text-success" aria-hidden /> Monthly cash saved
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between gap-2 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Current spend</p>
              <p className="font-semibold text-foreground">{formatCurrency(o.currentMonthlySpendTsh)}</p>
            </div>
            <ArrowRight className="size-4 text-muted-foreground" aria-hidden />
            <div className="text-right">
              <p className="text-xs text-muted-foreground">EaaS fee</p>
              <p className="font-semibold text-foreground">{formatCurrency(o.eaasFeeTsh)}</p>
            </div>
          </div>
          <div className="rounded-lg bg-success/10 p-3">
            <p className="text-xs text-muted-foreground">Saving from month 1</p>
            <p className="text-2xl font-bold text-success">{formatCurrency(o.monthlySavingTsh)}</p>
          </div>
          <p className="text-xs text-muted-foreground">
            Cumulative over 7 years: <span className="font-medium text-foreground">{formatCurrency(o.cumulative7yrSavingTsh)}</span>.
            Asset transfers to the facility at zero cost at end of term.
          </p>
        </CardContent>
      </Card>

      {/* Output 3 Cost per service-hour */}
      <Card className="border-l-4 border-l-primary">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Timer className="size-5 text-primary" aria-hidden /> Cost per service-hour
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Cost per hour of operation with cold chain functional, lighting available and critical
            equipment powered.
          </p>
          <div className="flex items-end justify-between gap-2">
            <div>
              <p className="text-xs text-muted-foreground">Today</p>
              <p className="text-xl font-bold text-foreground">
                {formatCurrency(o.costPerServiceHourBeforeTsh)}
              </p>
            </div>
            <ArrowRight className="mb-1 size-4 text-muted-foreground" aria-hidden />
            <div className="text-right">
              <p className="text-xs text-muted-foreground">After intervention</p>
              <p className="text-xl font-bold text-success">
                {formatCurrency(o.costPerServiceHourAfterTsh)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
