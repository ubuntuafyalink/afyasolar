/**
 * Render a `ReportDocument` to a downloadable PDF with programmatic jsPDF (text +
 * rects, no DOM rasterisation) — crisp, small, offline-friendly. Mirrors the
 * established style in src/lib/dashboard/resilience-report.ts. jsPDF is loaded on
 * demand so it never ships in the main bundle.
 */
import type { ReportDocument } from "./report-model"

const C = {
  primary: [22, 120, 75] as const,
  text: [26, 32, 28] as const,
  muted: [107, 114, 128] as const,
  track: [229, 231, 235] as const,
  headerBg: [243, 246, 244] as const,
}

export async function reportToPdf(doc: ReportDocument, filename: string): Promise<void> {
  const { jsPDF } = await import("jspdf")
  const pdf = new jsPDF({ unit: "pt", format: "a4" })
  const pageW = pdf.internal.pageSize.getWidth()
  const pageH = pdf.internal.pageSize.getHeight()
  const M = 40
  const contentW = pageW - M * 2
  let y = M

  function ensureSpace(needed: number) {
    if (y + needed > pageH - 56) {
      pdf.addPage()
      y = M
    }
  }

  function heading(text: string) {
    ensureSpace(30)
    pdf.setFont("helvetica", "bold")
    pdf.setFontSize(12)
    pdf.setTextColor(...C.text)
    pdf.text(text, M, y)
    y += 7
    pdf.setDrawColor(...C.track)
    pdf.line(M, y, M + contentW, y)
    y += 14
  }

  function bar(x: number, top: number, w: number, value: number, max: number) {
    const h = 6
    pdf.setFillColor(...C.track)
    pdf.roundedRect(x, top, w, h, 2, 2, "F")
    const fill = Math.max(0, Math.min(1, max > 0 ? value / max : 0))
    if (fill > 0) {
      pdf.setFillColor(...C.primary)
      pdf.roundedRect(x, top, w * fill, h, 2, 2, "F")
    }
  }

  // ---- Header --------------------------------------------------------------
  pdf.setFont("helvetica", "bold")
  pdf.setFontSize(11)
  pdf.setTextColor(...C.primary)
  pdf.text("AfyaSolar Intelligence", M, y)
  y += 20
  pdf.setFontSize(19)
  pdf.setTextColor(...C.text)
  pdf.text(doc.title, M, y)
  y += 18
  pdf.setFont("helvetica", "normal")
  pdf.setFontSize(11)
  pdf.setTextColor(...C.muted)
  pdf.text(doc.subtitle, M, y)
  y += 18

  pdf.setFontSize(9)
  for (const m of doc.meta) {
    ensureSpace(14)
    pdf.setTextColor(...C.muted)
    pdf.text(`${m.label}:`, M, y)
    pdf.setTextColor(...C.text)
    pdf.text(pdf.splitTextToSize(m.value, contentW - 130)[0] ?? "", M + 130, y)
    y += 13
  }
  y += 10

  // ---- Sections ------------------------------------------------------------
  for (const section of doc.sections) {
    heading(section.heading)

    if (section.kind === "stats") {
      pdf.setFontSize(9.5)
      for (const item of section.items) {
        ensureSpace(15)
        pdf.setFont("helvetica", "normal")
        pdf.setTextColor(...C.muted)
        pdf.text(item.label, M, y)
        pdf.setFont("helvetica", "bold")
        pdf.setTextColor(...C.text)
        pdf.text(String(item.value), M + contentW, y, { align: "right" })
        y += 15
      }
    } else if (section.kind === "bars") {
      for (const item of section.items) {
        ensureSpace(26)
        pdf.setFont("helvetica", "normal")
        pdf.setFontSize(9)
        pdf.setTextColor(...C.text)
        pdf.text(pdf.splitTextToSize(item.label, contentW - 60)[0] ?? "", M, y)
        const valLabel = `${Math.round(item.value)}${item.suffix ?? ""}`
        pdf.setTextColor(...C.muted)
        pdf.text(valLabel, M + contentW, y, { align: "right" })
        bar(M, y + 4, contentW, item.value, item.max ?? 100)
        y += 22
      }
    } else {
      // table
      const cols = section.columns
      const n = cols.length
      const firstW = contentW * (n > 5 ? 0.22 : 0.3)
      const restW = (contentW - firstW) / Math.max(1, n - 1)
      const colX = (i: number) => (i === 0 ? M : M + firstW + restW * (i - 1))
      const colW = (i: number) => (i === 0 ? firstW : restW)

      const drawHeader = () => {
        ensureSpace(20)
        pdf.setFillColor(...C.headerBg)
        pdf.rect(M, y - 9, contentW, 16, "F")
        pdf.setFont("helvetica", "bold")
        pdf.setFontSize(7.5)
        pdf.setTextColor(...C.muted)
        cols.forEach((c, i) => {
          pdf.text(pdf.splitTextToSize(String(c), colW(i) - 4)[0] ?? "", colX(i) + 2, y + 2)
        })
        y += 16
      }

      drawHeader()
      pdf.setFont("helvetica", "normal")
      pdf.setFontSize(7.5)
      for (const row of section.rows) {
        if (y + 14 > pageH - 56) {
          pdf.addPage()
          y = M
          drawHeader()
          pdf.setFont("helvetica", "normal")
          pdf.setFontSize(7.5)
        }
        pdf.setTextColor(...C.text)
        row.forEach((cell, i) => {
          pdf.text(pdf.splitTextToSize(String(cell), colW(i) - 4)[0] ?? "", colX(i) + 2, y + 2)
        })
        y += 13
        pdf.setDrawColor(...C.track)
        pdf.line(M, y - 4, M + contentW, y - 4)
      }
    }

    if (section.note) {
      ensureSpace(16)
      pdf.setFont("helvetica", "italic")
      pdf.setFontSize(8)
      pdf.setTextColor(...C.muted)
      const wrapped = pdf.splitTextToSize(section.note, contentW)
      pdf.text(wrapped, M, y + 4)
      y += wrapped.length * 11 + 8
    }
    y += 8
  }

  // ---- Footer --------------------------------------------------------------
  const pages = pdf.getNumberOfPages()
  for (let p = 1; p <= pages; p++) {
    pdf.setPage(p)
    pdf.setFont("helvetica", "normal")
    pdf.setFontSize(7.5)
    pdf.setTextColor(...C.muted)
    const note = pdf.splitTextToSize(doc.disclaimer, contentW - 60)[0] ?? ""
    pdf.text(note, M, pageH - 28)
    pdf.text(`Page ${p} / ${pages}`, pageW - M, pageH - 28, { align: "right" })
  }

  pdf.save(filename.endsWith(".pdf") ? filename : `${filename}.pdf`)
}
