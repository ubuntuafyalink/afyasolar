"use client"

import { useMemo, useState } from "react"
import { toast } from "sonner"
import { FileDown, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  downloadPortfolioReportPdf,
  type PortfolioReportData,
} from "@/lib/dashboard/admin-portfolio-report"
import { getErrorMessage } from "@/lib/get-error-message"
import { useAdminPortfolio } from "@/hooks/use-admin-portfolio"
import { useAdminAdaptationsRollup } from "@/hooks/use-admin-adaptations-rollup"
import { useAdminCarbonCredits } from "@/hooks/use-admin-carbon-credits"
import { useAdminPaygFinancing } from "@/hooks/use-admin-payg-financing"
import { summarize, childServiceRollup } from "@/lib/dashboard/admin-portfolio-real"

const UNGROUPED = "Unspecified"

function isImplemented(status: string): boolean {
  const s = status.toLowerCase()
  return s.includes("implement") || s.includes("complete") || s.includes("done")
}

/**
 * Outline button that generates and downloads the portfolio PDF report from the
 * REAL data already in the React Query caches. Shows a spinner while jsPDF is
 * dynamically loaded + the document is built, and toasts the outcome.
 */
export function AdminReportButton() {
  const [busy, setBusy] = useState(false)
  const { facilities } = useAdminPortfolio()
  const adaptations = useAdminAdaptationsRollup()
  const carbon = useAdminCarbonCredits()
  const financing = useAdminPaygFinancing()

  const regionById = useMemo(() => {
    const map = new Map<string, string>()
    for (const f of facilities) map.set(f.id, f.region || UNGROUPED)
    return map
  }, [facilities])

  const buildData = (): PortfolioReportData => {
    const summary = summarize(facilities)
    const roll = childServiceRollup(facilities)
    const servicesProtected = roll
      .filter((r) => r.key === "cold-chain" || r.key === "water-pumping")
      .reduce((s, r) => s + r.ok, 0)
    const adaptationsImplemented = (adaptations.data?.items ?? []).filter((i) => isImplemented(i.status)).length
    const co2AvoidedTons = carbon.data ? Math.round(carbon.data.creditsEarnedTons) : null

    const kpis = financing.data?.kpis
    const contracts = financing.data?.contracts ?? []
    const onTimePct =
      kpis && kpis.totalContracts > 0 ? Math.round((1 - kpis.overdueCount / kpis.totalContracts) * 100) : null
    const financedTotalTsh = contracts.reduce((s, c) => s + (Number(c.principalIssued) || 0), 0)
    const byRegionMap = new Map<string, { contracts: number; financedTsh: number }>()
    for (const c of contracts) {
      const region = regionById.get(c.customerId) ?? UNGROUPED
      const cur = byRegionMap.get(region) ?? { contracts: 0, financedTsh: 0 }
      cur.contracts += 1
      cur.financedTsh += Number(c.principalIssued) || 0
      byRegionMap.set(region, cur)
    }
    const byRegion = [...byRegionMap.entries()]
      .map(([region, v]) => ({ region, ...v }))
      .sort((a, b) => b.financedTsh - a.financedTsh)

    return {
      summary: {
        facilities: summary.facilities,
        assessed: summary.assessed,
        regions: summary.regions,
        categories: summary.categories,
        avgRcs: summary.avgRcs,
        tierCounts: summary.tierCounts,
        criticalCount: summary.criticalCount,
      },
      impact: { servicesProtected, adaptationsImplemented, co2AvoidedTons },
      financing: {
        activeContracts: kpis?.activeContracts ?? 0,
        totalContracts: kpis?.totalContracts ?? 0,
        onTimePct,
        defaults: kpis?.defaultedContracts ?? 0,
        financedTotalTsh,
        outstandingTsh: kpis?.totalOutstanding ?? 0,
        byRegion,
      },
    }
  }

  const handleClick = async () => {
    if (busy) return
    setBusy(true)
    try {
      await downloadPortfolioReportPdf(buildData())
      toast.success("Downloaded")
    } catch (error) {
      toast.error(getErrorMessage(error, "Download failed"))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Button variant="outline" onClick={handleClick} disabled={busy}>
      {busy ? (
        <Loader2 aria-hidden className="size-4 animate-spin" />
      ) : (
        <FileDown aria-hidden className="size-4" />
      )}
      Download portfolio report
    </Button>
  )
}
