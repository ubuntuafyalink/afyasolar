"use client"

import { useMemo } from "react"
import { Banknote, BadgeCheck, DollarSign, Gauge } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { StatCard } from "@/components/ui/stat-card"
import { formatCurrency } from "@/lib/utils"
import { useAdminPaygFinancing } from "@/hooks/use-admin-payg-financing"
import { useAdminPortfolio } from "@/hooks/use-admin-portfolio"

const UNGROUPED = "Unspecified"

/**
 * Operator view of the PAYG / financing portfolio: KPI cards plus a by-region
 * breakdown of contracts and financed amounts. Real data from the accounting
 * financing contracts.
 */
export function AdminFinancingOverview() {
  const { data, isLoading, isError } = useAdminPaygFinancing()
  const { facilities } = useAdminPortfolio()

  const regionById = useMemo(() => {
    const map = new Map<string, string>()
    for (const f of facilities) map.set(f.id, f.region || UNGROUPED)
    return map
  }, [facilities])

  const kpis = data?.kpis
  const onTimePct =
    kpis && kpis.totalContracts > 0
      ? Math.round((1 - kpis.overdueCount / kpis.totalContracts) * 100)
      : null

  const byRegion = useMemo(() => {
    const map = new Map<string, { contracts: number; financedTsh: number; outstandingTsh: number }>()
    for (const c of data?.contracts ?? []) {
      const region = regionById.get(c.customerId) ?? UNGROUPED
      const cur = map.get(region) ?? { contracts: 0, financedTsh: 0, outstandingTsh: 0 }
      cur.contracts += 1
      cur.financedTsh += Number(c.principalIssued) || 0
      cur.outstandingTsh += Number(c.outstandingBalance) || 0
      map.set(region, cur)
    }
    return [...map.entries()]
      .map(([region, v]) => ({ region, ...v }))
      .sort((a, b) => b.financedTsh - a.financedTsh)
  }, [data, regionById])

  if (isLoading) {
    return <div className="h-64 animate-pulse rounded-lg bg-muted" />
  }
  if (isError || !kpis) {
    return <p className="text-sm text-destructive">Could not load financing data. Please retry.</p>
  }

  const financedTotal = (data?.contracts ?? []).reduce((s, c) => s + (Number(c.principalIssued) || 0), 0)

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2">
            <Banknote aria-hidden className="size-5 text-primary" />
            Financing overview
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Active contracts"
            value={kpis.activeContracts}
            icon={<Gauge />}
            accent="primary"
            meta={`${kpis.totalContracts} total`}
          />
          <StatCard
            title="On-time payments"
            value={onTimePct != null ? `${onTimePct}%` : "N/A"}
            icon={<BadgeCheck />}
            accent="success"
            meta={`${kpis.overdueCount} overdue`}
            progress={onTimePct ?? 0}
            progressLabel="On-time payments"
          />
          <StatCard
            title="Defaults"
            value={kpis.defaultedContracts}
            icon={<DollarSign />}
            accent={kpis.defaultedContracts === 0 ? "success" : "destructive"}
            meta={kpis.defaultedContracts === 0 ? "No defaults" : "Needs attention"}
          />
          <StatCard
            title="Outstanding"
            value={formatCurrency(kpis.totalOutstanding)}
            icon={<Banknote />}
            accent="solar"
            meta={`${formatCurrency(financedTotal)} financed`}
          />
        </div>

        {byRegion.length === 0 ? (
          <p className="text-sm text-muted-foreground">No financing contracts recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <caption className="sr-only">Financing by region</caption>
              <thead>
                <tr className="border-b border-border text-left text-xs font-medium text-muted-foreground">
                  <th scope="col" className="py-2 pr-4">Region</th>
                  <th scope="col" className="py-2 pr-4 text-right">Contracts</th>
                  <th scope="col" className="py-2 pr-4 text-right">Financed</th>
                  <th scope="col" className="py-2 text-right">Outstanding</th>
                </tr>
              </thead>
              <tbody>
                {byRegion.map((n) => (
                  <tr key={n.region} className="border-b border-border/60 last:border-0">
                    <th scope="row" className="py-2 pr-4 text-left font-medium text-foreground">
                      {n.region}
                    </th>
                    <td className="py-2 pr-4 text-right tabular-nums text-muted-foreground">{n.contracts}</td>
                    <td className="py-2 pr-4 text-right tabular-nums text-foreground">
                      {formatCurrency(n.financedTsh)}
                    </td>
                    <td className="py-2 text-right tabular-nums text-foreground">
                      {formatCurrency(n.outstandingTsh)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
