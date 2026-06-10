/**
 * Render a `ReportDocument` to a single downloadable CSV (UTF-8 BOM so Excel
 * detects encoding). Stats/bars become label,value pairs; each table emits its
 * header + rows; sections separated by blank lines.
 */
import type { ReportDocument } from "./report-model"
import { downloadBlob } from "./download"

function esc(v: string | number): string {
  const s = String(v)
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function reportToCsv(doc: ReportDocument, filename: string): void {
  const lines: string[] = [esc(doc.title), esc(doc.subtitle), ""]
  for (const m of doc.meta) lines.push(`${esc(m.label)},${esc(m.value)}`)
  lines.push("")

  for (const s of doc.sections) {
    lines.push(esc(s.heading))
    if (s.kind === "stats") {
      for (const it of s.items) lines.push(`${esc(it.label)},${esc(it.value)}`)
    } else if (s.kind === "bars") {
      for (const it of s.items) lines.push(`${esc(it.label)},${Math.round(it.value)}`)
    } else {
      lines.push(s.columns.map(esc).join(","))
      for (const row of s.rows) lines.push(row.map(esc).join(","))
    }
    if (s.note) lines.push(esc(s.note))
    lines.push("")
  }
  lines.push(esc(doc.disclaimer))

  const csv = "﻿" + lines.join("\r\n")
  downloadBlob(csv, "text/csv;charset=utf-8", filename.endsWith(".csv") ? filename : `${filename}.csv`)
}
