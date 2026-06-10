/**
 * Render a `ReportDocument` to a Word-compatible .doc — a styled HTML document
 * served as application/msword. Opens natively in MS Word / Google Docs with no
 * extra dependency. Bars render as proportional table cells (Word-safe).
 */
import type { ReportDocument, ReportSection } from "./report-model"
import { downloadBlob } from "./download"

function esc(v: string | number): string {
  return String(v)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
}

function renderSection(s: ReportSection): string {
  const heading = `<h2 style="font-size:14px;color:#1a201c;border-bottom:1px solid #e5e7eb;padding-bottom:4px;margin:18px 0 8px;">${esc(s.heading)}</h2>`
  const note = s.note
    ? `<p style="font-size:11px;color:#6b7280;font-style:italic;margin:6px 0 0;">${esc(s.note)}</p>`
    : ""

  if (s.kind === "stats") {
    const rows = s.items
      .map(
        (it) =>
          `<tr><td style="padding:4px 10px;color:#6b7280;">${esc(it.label)}</td>` +
          `<td style="padding:4px 10px;font-weight:bold;color:#1a201c;text-align:right;">${esc(it.value)}</td></tr>`,
      )
      .join("")
    return `${heading}<table style="border-collapse:collapse;width:100%;font-size:12px;">${rows}</table>${note}`
  }

  if (s.kind === "bars") {
    const rows = s.items
      .map((it) => {
        const max = it.max ?? 100
        const filled = Math.max(0, Math.min(100, max > 0 ? (it.value / max) * 100 : 0))
        return (
          `<tr><td style="padding:4px 10px;font-size:12px;color:#1a201c;width:55%;">${esc(it.label)}</td>` +
          `<td style="padding:4px 10px;width:30%;">` +
          `<table style="border-collapse:collapse;width:100%;height:8px;"><tr>` +
          `<td style="background:#16784b;width:${filled.toFixed(0)}%;font-size:1px;">&nbsp;</td>` +
          `<td style="background:#e5e7eb;font-size:1px;">&nbsp;</td></tr></table></td>` +
          `<td style="padding:4px 10px;font-size:12px;color:#6b7280;text-align:right;">${Math.round(it.value)}${esc(it.suffix ?? "")}</td></tr>`
        )
      })
      .join("")
    return `${heading}<table style="border-collapse:collapse;width:100%;">${rows}</table>${note}`
  }

  // table
  const head = s.columns
    .map(
      (c) =>
        `<th style="padding:6px 8px;border:1px solid #e5e7eb;background:#f3f6f4;text-align:left;font-size:11px;color:#374151;">${esc(c)}</th>`,
    )
    .join("")
  const body = s.rows
    .map(
      (row) =>
        `<tr>${row
          .map(
            (cell) =>
              `<td style="padding:5px 8px;border:1px solid #e5e7eb;font-size:11px;color:#1a201c;">${esc(cell)}</td>`,
          )
          .join("")}</tr>`,
    )
    .join("")
  return `${heading}<table style="border-collapse:collapse;width:100%;"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>${note}`
}

export function reportToDoc(doc: ReportDocument, filename: string): void {
  const meta = doc.meta
    .map(
      (m) =>
        `<tr><td style="padding:2px 10px 2px 0;color:#6b7280;">${esc(m.label)}</td>` +
        `<td style="padding:2px 0;color:#1a201c;">${esc(m.value)}</td></tr>`,
    )
    .join("")
  const sections = doc.sections.map(renderSection).join("")

  const html =
    `<!DOCTYPE html><html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word">` +
    `<head><meta charset="utf-8"><title>${esc(doc.title)}</title></head>` +
    `<body style="font-family:Arial,Helvetica,sans-serif;color:#1a201c;font-size:12px;">` +
    `<p style="color:#16784b;font-weight:bold;margin:0 0 4px;">AfyaSolar Intelligence</p>` +
    `<h1 style="font-size:22px;margin:0 0 4px;">${esc(doc.title)}</h1>` +
    `<p style="color:#6b7280;margin:0 0 10px;">${esc(doc.subtitle)}</p>` +
    `<table style="border-collapse:collapse;font-size:12px;margin-bottom:12px;">${meta}</table>` +
    sections +
    `<p style="font-size:10px;color:#6b7280;margin-top:24px;border-top:1px solid #e5e7eb;padding-top:8px;">${esc(doc.disclaimer)}</p>` +
    `</body></html>`

  downloadBlob(html, "application/msword", filename.endsWith(".doc") ? filename : `${filename}.doc`)
}
