"use client"

import { CalendarCheck, Handshake, PiggyBank, Wallet } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/utils"
import { getEaasContract } from "@/lib/dashboard/facility-demo-data"

/**
 * Spec 13.213.4: the Energy-as-a-Service contract as the facility manager sees
 * it this system, this installation cost, this monthly fee, this monthly
 * saving versus current spend, this break-even, this asset-transfer date. She
 * sees the result, not the calculation.
 */
export function EaasContractView({ facilityId }: { facilityId?: string }) {
  const c = getEaasContract(facilityId)

  const rows = [
    { label: "System (capex)", value: formatCurrency(c.systemCapexTsh) },
    { label: "Installation upfront (20%)", value: formatCurrency(c.installCostTsh) },
    { label: "Financed over 7 years", value: formatCurrency(c.financedTsh) },
    { label: "Current monthly spend", value: formatCurrency(c.currentSpendTsh) },
  ]

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Handshake className="size-5 text-primary" aria-hidden /> Energy-as-a-Service contract
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          A fixed monthly fee, structured to be below your current energy spend from month one.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border-2 border-primary/20 bg-primary/5 p-3">
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <Wallet className="size-3.5" aria-hidden /> Monthly fee
            </p>
            <p className="text-xl font-bold text-foreground">{formatCurrency(c.monthlyFeeTsh)}</p>
          </div>
          <div className="rounded-lg border-2 border-success/30 bg-success/5 p-3">
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <PiggyBank className="size-3.5" aria-hidden /> Saving / month
            </p>
            <p className="text-xl font-bold text-success">{formatCurrency(c.monthlySavingTsh)}</p>
          </div>
          <div className="rounded-lg border-2 border-border p-3">
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <CalendarCheck className="size-3.5" aria-hidden /> Break-even
            </p>
            <p className="text-xl font-bold text-foreground">{c.breakEvenMonths} mo</p>
          </div>
        </div>

        <dl className="divide-y divide-border rounded-lg border border-border">
          {rows.map((r) => (
            <div key={r.label} className="flex items-center justify-between gap-3 p-2.5">
              <dt className="text-sm text-muted-foreground">{r.label}</dt>
              <dd className="text-sm font-medium text-foreground">{r.value}</dd>
            </div>
          ))}
        </dl>

        <div className="flex items-start gap-2 rounded-lg bg-muted/50 p-3">
          <Handshake className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
          <p className="text-xs text-muted-foreground">
            Total over 7 years: <span className="font-medium text-foreground">{formatCurrency(c.total7yrTsh)}</span>.
            The solar asset transfers to your facility at zero cost in{" "}
            <span className="font-medium text-foreground">{c.assetTransferYear}</span>.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
