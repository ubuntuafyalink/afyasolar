/**
 * Render a `ReportDocument` to a downloadable .xlsx: a "Summary" sheet (meta +
 * stats/bars sections) plus one sheet per table section. Extends the xlsx pattern
 * in src/lib/dashboard/export-data.ts; the library is dynamically imported.
 */
import type { ReportDocument } from "./report-model"

export async function reportToXlsx(doc: ReportDocument, filename: string): Promise<void> {
  const XLSX = await import("xlsx")
  const wb = XLSX.utils.book_new()

  const summary: (string | number)[][] = [[doc.title], [doc.subtitle], []]
  for (const m of doc.meta) summary.push([m.label, m.value])
  summary.push([])
  for (const s of doc.sections) {
    if (s.kind === "stats") {
      summary.push([s.heading])
      for (const it of s.items) summary.push([it.label, it.value])
      if (s.note) summary.push(["", s.note])
      summary.push([])
    } else if (s.kind === "bars") {
      summary.push([s.heading])
      for (const it of s.items) summary.push([it.label, Math.round(it.value)])
      summary.push([])
    }
  }
  summary.push([doc.disclaimer])
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summary), "Summary")

  const used = new Set<string>(["Summary"])
  let idx = 1
  for (const s of doc.sections) {
    if (s.kind !== "table") continue
    const base = (s.heading.replace(/[\\/?*[\]:]/g, "").slice(0, 28) || `Table ${idx}`).trim()
    let name = base
    while (used.has(name)) {
      name = `${base.slice(0, 26)} ${idx}`
      idx += 1
    }
    used.add(name)
    idx += 1
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([s.columns, ...s.rows]), name)
  }

  XLSX.writeFile(wb, filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`)
}
