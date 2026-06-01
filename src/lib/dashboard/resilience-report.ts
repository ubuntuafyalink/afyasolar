/**
 * Client-side generator for the shareable Facility Resilience Report (PDF).
 *
 * Programmatic jsPDF (text + simple rects) rather than html2canvas: it produces
 * a crisp, small, offline-friendly file and avoids rasterising the DOM on
 * low-end rural devices. jsPDF is dynamically imported by the caller's click
 * handler so the (large) library never ships in the main bundle.
 *
 * Frontend-only: pulls the same deterministic seed data the dashboard renders
 * (getRcsExplainer, getChildServicesAtRisk/Summary). No network/DB/side-effects.
 */
import type { Locale } from "@/lib/i18n/dictionaries"
import {
  getRcsExplainer,
  getChildServicesAtRisk,
  getChildServicesSummary,
  type Bilingual,
} from "@/lib/dashboard/facility-demo-data"

type Translate = (key: string, vars?: Record<string, string | number>) => string

export interface ResilienceReportOptions {
  facilityId?: string
  facilityName?: string | null
  region?: string | null
  locale: Locale
  t: Translate
  /** Injectable for testing; defaults to the current date. */
  now?: Date
}

// Theme-approximate RGB (the report is standalone, so we hardcode close matches).
const C = {
  primary: [22, 120, 75] as const,
  text: [26, 32, 28] as const,
  muted: [107, 114, 128] as const,
  track: [229, 231, 235] as const,
  success: [22, 120, 75] as const,
  warning: [217, 119, 6] as const,
  destructive: [220, 38, 38] as const,
}

const TIER_RGB: Record<string, readonly [number, number, number]> = {
  Resilient: C.success,
  Developing: C.primary,
  "At risk": C.warning,
  Critical: C.destructive,
}

function scoreRgb(score: number): readonly [number, number, number] {
  if (score >= 70) return C.success
  if (score >= 45) return C.warning
  return C.destructive
}

function statusRgb(status: string): readonly [number, number, number] {
  if (status === "ok") return C.success
  if (status === "at-risk") return C.warning
  return C.destructive
}

/** Generate and trigger download of the facility resilience report PDF. */
export async function generateResilienceReport(opts: ResilienceReportOptions): Promise<void> {
  const { facilityId, facilityName, region, locale, t } = opts
  const { jsPDF } = await import("jspdf")

  const doc = new jsPDF({ unit: "pt", format: "a4" })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const M = 40
  const contentW = pageW - M * 2
  let y = M

  const pick = (b: Bilingual) => (locale === "sw" ? b.sw : b.en)

  function ensureSpace(needed: number) {
    if (y + needed > pageH - 56) {
      doc.addPage()
      y = M
    }
  }

  function heading(text: string) {
    ensureSpace(28)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(13)
    doc.setTextColor(...C.text)
    doc.text(text, M, y)
    y += 8
    doc.setDrawColor(...C.track)
    doc.line(M, y, M + contentW, y)
    y += 14
  }

  function bar(x: number, top: number, w: number, pct: number, rgb: readonly [number, number, number]) {
    const h = 6
    doc.setFillColor(...C.track)
    doc.roundedRect(x, top, w, h, 2, 2, "F")
    const fill = Math.max(0, Math.min(100, pct))
    if (fill > 0) {
      doc.setFillColor(...rgb)
      doc.roundedRect(x, top, (w * fill) / 100, h, 2, 2, "F")
    }
  }

  // ---- Header --------------------------------------------------------------
  doc.setFont("helvetica", "bold")
  doc.setFontSize(11)
  doc.setTextColor(...C.primary)
  doc.text(t("report.brand"), M, y)
  y += 20
  doc.setFontSize(20)
  doc.setTextColor(...C.text)
  doc.text(t("report.docTitle"), M, y)
  y += 22

  doc.setFont("helvetica", "normal")
  doc.setFontSize(10)
  doc.setTextColor(...C.muted)
  const date = (opts.now ?? new Date()).toLocaleDateString(locale === "sw" ? "sw-TZ" : "en-GB", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
  doc.text(`${t("report.facility")}: ${facilityName || facilityId || ""}`, M, y)
  if (region) doc.text(`${t("report.region")}: ${region}`, M + contentW / 2, y)
  y += 14
  doc.text(`${t("report.generated")}: ${date}`, M, y)
  y += 22

  // ---- RCS headline --------------------------------------------------------
  const model = getRcsExplainer(facilityId)
  heading(t("report.rcsHeading"))
  doc.setFont("helvetica", "bold")
  doc.setFontSize(36)
  doc.setTextColor(...C.text)
  doc.text(String(model.rcs), M, y + 8)
  doc.setFontSize(11)
  doc.setTextColor(...(TIER_RGB[model.tier] ?? C.muted))
  doc.text(model.tier, M + 70, y + 2)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  doc.setTextColor(...C.muted)
  doc.text(t("report.formula"), M + 70, y + 16)
  // RCS track bar
  bar(M, y + 22, contentW, model.rcs, scoreRgb(model.rcs))
  y += 44

  // ---- Dimension breakdown table ------------------------------------------
  heading(t("report.dimensionsHeading"))
  const cols = {
    dim: M,
    weight: M + contentW * 0.46,
    score: M + contentW * 0.6,
    contrib: M + contentW * 0.74,
    recover: M + contentW * 0.88,
  }
  doc.setFont("helvetica", "bold")
  doc.setFontSize(8)
  doc.setTextColor(...C.muted)
  doc.text(t("report.colDimension"), cols.dim, y)
  doc.text(t("report.colWeight"), cols.weight, y)
  doc.text(t("report.colScore"), cols.score, y)
  doc.text(t("report.colContribution"), cols.contrib, y)
  doc.text(t("report.colRecoverable"), cols.recover, y)
  y += 12

  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  for (const d of model.dimensions) {
    ensureSpace(26)
    doc.setTextColor(...C.text)
    const name = doc.splitTextToSize(t(`rcs.dim.${d.code}`), contentW * 0.42)[0]
    doc.text(name, cols.dim, y)
    doc.setTextColor(...C.muted)
    doc.text(`${Math.round(d.weight * 100)}%`, cols.weight, y)
    doc.text(`${d.score}/100`, cols.score, y)
    doc.text(String(d.contribution), cols.contrib, y)
    doc.text(`+${d.gapPoints}`, cols.recover, y)
    bar(cols.dim, y + 4, contentW * 0.42, d.score, scoreRgb(d.score))
    y += 22
  }
  y += 6

  // ---- Child services at risk ---------------------------------------------
  heading(t("report.childHeading"))
  const summary = getChildServicesSummary(facilityId)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(10)
  doc.setTextColor(...C.muted)
  doc.text(
    t("report.childSummary", {
      failing: summary.failing,
      atRisk: summary.atRisk,
      protected: summary.ok,
    }),
    M,
    y,
  )
  y += 16

  const services = [...getChildServicesAtRisk(facilityId)].sort((a, b) => {
    const rank = { failing: 0, "at-risk": 1, ok: 2 } as const
    return rank[a.status] - rank[b.status]
  })
  doc.setFontSize(9)
  for (const s of services) {
    ensureSpace(18)
    doc.setTextColor(...statusRgb(s.status))
    doc.setFont("helvetica", "bold")
    doc.text(`[${t(`childServices.status.${s.status}`)}]`, M, y)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(...C.text)
    let line = t(`service.${s.key}`)
    if (s.prediction) {
      line += ` ${t("childServices.predictionWindow")}: ${t("childServices.predictionDays", {
        min: s.prediction.etaDaysMin,
        max: s.prediction.etaDaysMax,
      })}`
    }
    const fitted = doc.splitTextToSize(line, contentW - 80)[0]
    doc.text(fitted, M + 70, y)
    y += 16
  }
  y += 6

  // ---- Top opportunities ---------------------------------------------------
  heading(t("report.opportunitiesHeading"))
  const top = [...model.dimensions].sort((a, b) => b.gapPoints - a.gapPoints).slice(0, 3)
  doc.setFontSize(9)
  for (const d of top) {
    ensureSpace(34)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(...C.text)
    doc.text(`${t(`rcs.dim.${d.code}`)}  (+${d.gapPoints})`, M, y)
    y += 13
    doc.setFont("helvetica", "normal")
    doc.setTextColor(...C.muted)
    const wrapped = doc.splitTextToSize(pick(d.howToImprove), contentW)
    doc.text(wrapped, M, y)
    y += wrapped.length * 12 + 8
  }

  // ---- Footer on every page ------------------------------------------------
  const pages = doc.getNumberOfPages()
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p)
    doc.setFont("helvetica", "normal")
    doc.setFontSize(8)
    doc.setTextColor(...C.muted)
    doc.text(t("report.demoNote"), M, pageH - 28)
    doc.text(t("report.page", { n: p }), pageW - M, pageH - 28, { align: "right" })
  }

  const safeName = (facilityName || facilityId || "facility")
    .toString()
    .replace(/[^a-z0-9]+/gi, "-")
    .toLowerCase()
  doc.save(`afyasolar-resilience-report-${safeName}.pdf`)
}
