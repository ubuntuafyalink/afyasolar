"use client"

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { Split } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DemoDataBadge } from "@/components/ui/demo-data-badge"
import { formatCurrency } from "@/lib/utils"
import { getSmartSplitter } from "@/lib/dashboard/facility-demo-data"

/**
 * Spec 13.5: the Revenue-Linked Smart-Splitter Gateway. The monthly fee is bound
 * to the clinic's daily digital revenue: a small percentage is routed on each
 * payment until the monthly cap is reached, then 100% stays with the clinic.
 *
 * [data] — fed by the local demo module. TODO: wire the real Tigo Lipa gateway +
 * contract ledger per spec 13.5.
 */
export function SmartSplitterView({ facilityId }: { facilityId?: string }) {
  const s = getSmartSplitter(facilityId)
  const capReachedPct = Math.min(100, Math.round((s.cumulativePaidTsh / s.monthlyCapTsh) * 100))

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Split className="size-5 text-primary" aria-hidden /> Revenue-linked payments
          </CardTitle>
          <DemoDataBadge />
        </div>
        <p className="text-xs text-muted-foreground">
          {s.alphaPct}% of daily digital revenue goes to your solar fee, up to a monthly cap — then it stops.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <Stat label="Today's revenue" value={formatCurrency(s.todayRevenueTsh)} />
          <Stat label={`Today's split (${s.alphaPct}%)`} value={formatCurrency(s.todayPaymentTsh)} />
          <Stat label="Paid this month" value={formatCurrency(s.cumulativePaidTsh)} />
        </div>

        {/* Cap progress */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Monthly cap progress</span>
            <span>
              {formatCurrency(s.cumulativePaidTsh)} / {formatCurrency(s.monthlyCapTsh)}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary" style={{ width: `${capReachedPct}%` }} />
          </div>
        </div>

        {/* Last 10 days */}
        <div className="h-40 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={s.recentDays} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="var(--color-muted-foreground)" />
              <YAxis tick={{ fontSize: 10 }} stroke="var(--color-muted-foreground)" />
              <Tooltip
                formatter={(value: number | string, name) => [formatCurrency(Number(value)), name === "paymentTsh" ? "Split" : "Revenue"]}
                contentStyle={{ borderRadius: 8, border: "1px solid var(--color-border)", fontSize: 12 }}
              />
              <Bar dataKey="revenueTsh" radius={[4, 4, 0, 0]}>
                {s.recentDays.map((_, i) => (
                  <Cell key={i} fill="var(--color-chart-2)" />
                ))}
              </Bar>
              <Bar dataKey="paymentTsh" radius={[4, 4, 0, 0]}>
                {s.recentDays.map((_, i) => (
                  <Cell key={i} fill="var(--color-primary)" />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/50 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-bold text-foreground">{value}</p>
    </div>
  )
}
