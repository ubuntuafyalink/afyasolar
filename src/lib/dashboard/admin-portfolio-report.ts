/**
 * Client-side portfolio PDF generator for the admin "Resilience Intelligence"
 * surface. Mirrors receipt-pdf.ts: programmatic jsPDF, dynamically imported on
 * use so the library never ships in the main bundle. No backend, no new deps.
 *
 * Note: this file intentionally avoids the unicode em/en dash anywhere in its
 * output strings (only plain hyphens / colons are used).
 */
import {
  getAdminPortfolioSummary,
  getImpactSummary,
  getFinancingOverview,
} from "@/lib/dashboard/admin-portfolio-data"
import { formatCurrency } from "@/lib/utils"

export async function downloadPortfolioReportPdf(now?: Date): Promise<void> {
  const { jsPDF } = await import("jspdf")
  const doc = new jsPDF({ unit: "pt", format: "a4" })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const M = 48
  let y = M

  const summary = getAdminPortfolioSummary()
  const impact = getImpactSummary()
  const financing = getFinancingOverview()

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
  kv("Facilities assessed", String(summary.facilities))
  kv("Regions / networks", `${summary.regions} regions, ${summary.networks} networks`)
  kv("Portfolio average RCS", `${summary.avgRcs} / 100`)
  kv(
    "Resilience tiers",
    `Resilient ${summary.tierCounts.Resilient}, Developing ${summary.tierCounts.Developing}, At risk ${summary.tierCounts["At risk"]}, Critical ${summary.tierCounts.Critical}`,
  )
  kv("Failing sites", String(summary.failingSites))
  kv("At-risk sites", String(summary.atRiskSites))
  kv("Women-led facilities", `${summary.womenLedPct}%`)
  y += 10

  // Impact
  sectionHeading("Impact")
  kv("Facilities assessed", String(impact.facilitiesAssessed))
  kv("Critical services protected", String(impact.servicesProtected))
  kv("Resilience points gained", String(impact.resiliencePointsGained))
  kv("CO2 avoided (tons)", String(impact.co2AvoidedTons))
  y += 10

  // Financing
  sectionHeading("Financing")
  kv("Deployments", String(financing.deployments))
  kv("On-time payments", `${financing.onTimePaymentPct}%`)
  kv("Defaults", String(financing.defaults))
  kv("Financed total", formatCurrency(financing.financedTotalTsh))
  y += 4
  doc.setFont("helvetica", "bold")
  doc.setFontSize(11)
  doc.setTextColor(26, 32, 28)
  ensureSpace(40)
  doc.text("By network", M, y)
  y += 16
  for (const n of financing.byNetwork) {
    kv(n.network, `${n.deployments} deployments, ${formatCurrency(n.financedTsh)}`)
  }

  // Footer on every page
  const pageCount = doc.getNumberOfPages()
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p)
    doc.setFont("helvetica", "normal")
    doc.setFontSize(8)
    doc.setTextColor(107, 114, 128)
    doc.text(
      "Demo data - sample values, not yet wired to a live source.",
      M,
      pageH - 28,
    )
  }

  doc.save("afyasolar-portfolio-report.pdf")
}
