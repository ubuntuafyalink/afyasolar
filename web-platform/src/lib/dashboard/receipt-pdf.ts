/**
 * Client-side PDF generator for bill / payment / invoice records. Mirrors the
 * resilience-report approach: programmatic jsPDF (crisp + small), dynamically
 * imported on use so the library never ships in the main bundle. No backend.
 */
export type PdfRow = { label: string; value: string }

export async function downloadRecordPdf(
  title: string,
  rows: PdfRow[],
  filename: string,
  now?: Date,
): Promise<void> {
  const { jsPDF } = await import("jspdf")
  const doc = new jsPDF({ unit: "pt", format: "a4" })
  const pageW = doc.internal.pageSize.getWidth()
  const M = 48
  let y = M

  // Header
  doc.setFont("helvetica", "bold")
  doc.setFontSize(11)
  doc.setTextColor(22, 120, 75)
  doc.text("AfyaSolar", M, y)
  y += 22
  doc.setFontSize(18)
  doc.setTextColor(26, 32, 28)
  doc.text(title, M, y)
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
  y += 20

  // Key/value rows
  doc.setFontSize(11)
  for (const row of rows) {
    doc.setFont("helvetica", "bold")
    doc.setTextColor(26, 32, 28)
    doc.text(row.label, M, y)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(60, 66, 62)
    const wrapped = doc.splitTextToSize(String(row.value), pageW - M * 2 - 170)
    doc.text(wrapped, M + 170, y)
    y += Math.max(18, wrapped.length * 14)
    if (y > doc.internal.pageSize.getHeight() - 60) {
      doc.addPage()
      y = M
    }
  }

  // Footer
  doc.setFont("helvetica", "normal")
  doc.setFontSize(8)
  doc.setTextColor(107, 114, 128)
  doc.text(
    "Demo data sample values, not yet wired to a live source.",
    M,
    doc.internal.pageSize.getHeight() - 28,
  )

  const safe = title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()
  doc.save(`afyasolar-${safe}.pdf`)
}
