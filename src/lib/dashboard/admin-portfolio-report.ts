/**
 * Client-side portfolio PDF generator for the admin "Resilience Intelligence"
 * surface. Mirrors receipt-pdf.ts: programmatic jsPDF, dynamically imported on
 * use so the library never ships in the main bundle. No backend, no new deps.
 *
 * Takes already-fetched REAL data as an argument (assembled by the caller from
 * the React Query caches) so this module has no dependency on the demo seed.
 *
 * Note: this file intentionally avoids the unicode em/en dash anywhere in its
 * output strings (only plain hyphens / colons are used).
 */
import { formatCurrency } from "@/lib/utils"
import type { ResilienceTier } from "@/lib/dashboard/admin-portfolio-types"

export type PortfolioReportData = {
  summary: {
    facilities: number
    assessed: number
    regions: number
    categories: number
    avgRcs: number | null
    tierCounts: Record<ResilienceTier, number>
    criticalCount: number
  }
  impact: {
    servicesProtected: number
    adaptationsImplemented: number
    co2AvoidedTons: number | null
  }
  financing: {
    activeContracts: number
    totalContracts: number
    onTimePct: number | null
    defaults: number
    financedTotalTsh: number
    outstandingTsh: number
    byRegion: { region: string; contracts: number; financedTsh: number }[]
  }
}

export async function downloadPortfolioReportPdf(data: PortfolioReportData, now?: Date): Promise<void> {
  const { jsPDF } = await import("jspdf")
  const doc = new jsPDF({ unit: "pt", format: "a4" })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const M = 48
  let y = M

  const { summary, impact, financing } = data

  const ensureSpace = (needed: number) => {
    if (y > pageH - needed) {
      doc.addPage()
      y = M
    }
  }

  const sectionHeading = (text: string) => {
    ensureSpace(60)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(13)
    doc.setTextColor(26, 32, 28)
    doc.text(text, M, y)
    y += 8
    doc.setDrawColor(229, 231, 235)
    doc.line(M, y, pageW - M, y)
    y += 16
  }

  const kv = (label: string, value: string) => {
    ensureSpace(40)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(11)
    doc.setTextColor(26, 32, 28)
    doc.text(label, M, y)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(60, 66, 62)
    const wrapped = doc.splitTextToSize(value, pageW - M * 2 - 220)
    doc.text(wrapped, M + 220, y)
    y += Math.max(18, wrapped.length * 14)
  }

  // Header
  doc.setFont("helvetica", "bold")
  doc.setFontSize(11)
  doc.setTextColor(22, 120, 75)
  doc.text("AfyaSolar", M, y)
  y += 22
  doc.setFontSize(18)
  doc.setTextColor(26, 32, 28)
  doc.text("AfyaSolar Intelligence: Portfolio Report", M, y)
  y += 16
  doc.setFont("helvetica", "normal")
  doc.setFontSize(10)
  doc.setTextColor(107, 114, 128)
  const date = (now ?? new Date()).toLocaleDateString("en-GB", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
  doc.text(`Generated: ${date}`, M, y)
  y += 18
  doc.setDrawColor(229, 231, 235)
  doc.line(M, y, pageW - M, y)
  y += 24

  // Portfolio summary
  sectionHeading("Portfolio summary")
  kv("Facilities", String(summary.facilities))
  kv("Facilities assessed", `${summary.assessed} of ${summary.facilities}`)
  kv("Regions / categories", `${summary.regions} regions, ${summary.categories} categories`)
  kv("Portfolio average RCS", summary.avgRcs != null ? `${summary.avgRcs} / 100` : "Not assessed yet")
  kv(
    "Resilience tiers",
    `Resilient ${summary.tierCounts.Resilient}, Developing ${summary.tierCounts.Developing}, At risk ${summary.tierCounts["At risk"]}, Critical ${summary.tierCounts.Critical}`,
  )
  kv("Critical sites", String(summary.criticalCount))
  y += 10

  // Impact
  sectionHeading("Impact")
  kv("Facilities assessed", `${summary.assessed} of ${summary.facilities}`)
  kv("Services protected", String(impact.servicesProtected))
  kv("Adaptations implemented", String(impact.adaptationsImplemented))
  kv("CO2 avoided (tons)", impact.co2AvoidedTons != null ? String(impact.co2AvoidedTons) : "N/A")
  y += 10

  // Financing
  sectionHeading("Financing")
  kv("Active contracts", `${financing.activeContracts} of ${financing.totalContracts}`)
  kv("On-time payments", financing.onTimePct != null ? `${financing.onTimePct}%` : "N/A")
  kv("Defaults", String(financing.defaults))
  kv("Financed total", formatCurrency(financing.financedTotalTsh))
  kv("Outstanding", formatCurrency(financing.outstandingTsh))
  if (financing.byRegion.length > 0) {
    y += 4
    doc.setFont("helvetica", "bold")
    doc.setFontSize(11)
    doc.setTextColor(26, 32, 28)
    ensureSpace(40)
    doc.text("By region", M, y)
    y += 16
    for (const n of financing.byRegion) {
      kv(n.region, `${n.contracts} contracts, ${formatCurrency(n.financedTsh)}`)
    }
  }

  doc.save("afyasolar-portfolio-report.pdf")
}
