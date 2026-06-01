"use client"

import { Landmark } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DemoDataBadge } from "@/components/ui/demo-data-badge"
import { cn, formatCurrency } from "@/lib/utils"
import { getNhifEscrow, type NhifEscrow } from "@/lib/dashboard/facility-demo-data"

const STATUS_META: Record<NhifEscrow["status"], { label: string; className: string }> = {
  "on-track": { label: "On track", className: "bg-success/10 text-success" },
  "awaiting-payout": { label: "Awaiting payout", className: "bg-warning/15 text-warning-foreground" },
  shortfall: { label: "Shortfall", className: "bg-destructive/10 text-destructive" },
}

/**
 * Spec 13.6: the Insurance Claims Receivables Escrow. A fixed portion of NHIF
 * payouts is routed into a protected escrow up to the monthly fee, with the
 * surplus forwarded to the clinic.
 *
 * [data] — fed by the local demo module. TODO: wire the real escrow ledger
 * (receivables_assignments / escrow_* tables) per spec 13.6.4.
 */
export function NhifEscrowStatus({ facilityId }: { facilityId?: string }) {
  const e = getNhifEscrow(facilityId)
  const status = STATUS_META[e.status]
  const coverPct = Math.min(100, Math.round((e.retainedThisMonthTsh / e.monthlyFeeTsh) * 100))

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Landmark className="size-5 text-primary" aria-hidden /> NHIF receivables escrow
          </CardTitle>
          <DemoDataBadge />
        </div>
        <p className="text-xs text-muted-foreground">
          {e.assignedPct}% of NHIF payouts is assigned to your solar fee, up to the monthly amount; the
          rest is forwarded to your account.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="secondary" className={cn(status.className)}>
            {status.label}
          </Badge>
          <div className="flex-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>This month&apos;s fee covered</span>
              <span>
                {formatCurrency(e.retainedThisMonthTsh)} / {formatCurrency(e.monthlyFeeTsh)}
              </span>
            </div>
            <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary" style={{ width: `${coverPct}%` }} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-xs text-muted-foreground">Retained (escrow)</p>
            <p className="text-lg font-bold text-foreground">{formatCurrency(e.escrowBalanceTsh)}</p>
          </div>
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-xs text-muted-foreground">Forwarded to clinic</p>
            <p className="text-lg font-bold text-foreground">{formatCurrency(e.forwardedToClinicTsh)}</p>
          </div>
        </div>

        <div>
          <p className="mb-1 text-sm font-medium text-foreground">Recent NHIF inflows</p>
          <ul className="divide-y divide-border rounded-lg border border-border">
            {e.inflows.map((inflow, i) => (
              <li key={i} className="flex items-center justify-between gap-3 p-2.5 text-sm">
                <span className="text-muted-foreground">
                  {inflow.date} · {inflow.source}
                </span>
                <span className="font-medium text-foreground">{formatCurrency(inflow.amountTsh)}</span>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
