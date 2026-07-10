"use client"

import { Banknote, BadgeCheck, DollarSign, Gauge } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { StatCard } from "@/components/ui/stat-card"
import { DemoDataBadge } from "@/components/ui/demo-data-badge"
import { formatCurrency } from "@/lib/utils"
import { getFinancingOverview } from "@/lib/dashboard/admin-portfolio-data"

/**
 * Operator view of the Medical Credit Fund financing snapshot: KPI cards plus a
 * by-network breakdown of deployments and financed amounts. Read-only, demo
 * data only.
 */
export function AdminFinancingOverview() {
  const fin = getFinancingOverview()

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2">
            <Banknote aria-hidden className="size-5 text-primary" />
            Financing overview
          </CardTitle>
          <DemoDataBadge />
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Deployments"
            value={fin.deployments}
            icon={<Gauge />}
            accent="primary"
            meta="Sites financed"
          />
          <StatCard
            title="On-time payments"
            value={`${fin.onTimePaymentPct}%`}
            icon={<BadgeCheck />}
            accent="success"
            meta="Repayment performance"
            progress={fin.onTimePaymentPct}
            progressLabel="On-time payments"
          />
          <StatCard
            title="Defaults"
            value={fin.defaults}
            icon={<DollarSign />}
            accent={fin.defaults === 0 ? "success" : "destructive"}
            meta={fin.defaults === 0 ? "No defaults" : "Needs attention"}
          />
          <StatCard
            title="Financed total"
            value={formatCurrency(fin.financedTotalTsh)}
            icon={<Banknote />}
            accent="solar"
            meta="Across the portfolio"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <caption className="sr-only">Financing by network</caption>
            <thead>
              <tr className="border-b border-border text-left text-xs font-medium text-muted-foreground">
                <th scope="col" className="py-2 pr-4">
                  Network
                </th>
                <th scope="col" className="py-2 pr-4 text-right">
                  Deployments
                </th>
                <th scope="col" className="py-2 text-right">
                  Financed
                </th>
              </tr>
            </thead>
            <tbody>
              {fin.byNetwork.map((n) => (
                <tr key={n.network} className="border-b border-border/60 last:border-0">
                  <th scope="row" className="py-2 pr-4 text-left font-medium text-foreground">
                    {n.network}
                  </th>
                  <td className="py-2 pr-4 text-right tabular-nums text-muted-foreground">
                    {n.deployments}
                  </td>
                  <td className="py-2 text-right tabular-nums text-foreground">
                    {formatCurrency(n.financedTsh)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
