/**
 * Format-agnostic report model. A `ReportDocument` is assembled once by the
 * builders (report-builders.ts) from real portfolio/climate/NASA data, then
 * handed to any renderer (PDF / Excel / CSV / Word) — one model, four outputs.
 *
 * Pure data only: no React, no formatting decisions beyond plain strings, so the
 * same document renders identically across every export format.
 */

/** A labelled value (e.g. "Average RCS" → "62 / 100"). */
export type KeyValue = { label: string; value: string }

/** A horizontal-bar metric (0..max), e.g. a hazard index or a dimension score. */
export type BarItem = { label: string; value: number; max?: number; suffix?: string }

export type StatsSection = { kind: "stats"; heading: string; items: KeyValue[]; note?: string }
export type BarsSection = { kind: "bars"; heading: string; items: BarItem[]; note?: string }
export type TableSection = {
  kind: "table"
  heading: string
  columns: string[]
  rows: (string | number)[][]
  note?: string
}

export type ReportSection = StatsSection | BarsSection | TableSection

export type ReportDocument = {
  /** Human title, e.g. "Climate Hazard & NASA Report". */
  title: string
  /** Scope line, e.g. "Portfolio · 86 facilities" or "Facility · Ubuntu Facility". */
  subtitle: string
  /** Header metadata rows (generated date, data source, coverage). */
  meta: KeyValue[]
  sections: ReportSection[]
  disclaimer: string
}

/** Report scope: whole portfolio, one region, or a single facility. */
export type ReportScope =
  | { kind: "portfolio" }
  | { kind: "region"; region: string }
  | { kind: "facility"; facilityId: string }

export const REPORT_TYPES = [
  { id: "climate", label: "Climate Hazard & NASA" },
  { id: "resilience", label: "Climate Resilience (RCS)" },
  { id: "energy", label: "Energy & Power" },
  { id: "full", label: "Full combined assessment" },
] as const

export type ReportTypeId = (typeof REPORT_TYPES)[number]["id"]

/** Filesystem-safe slug for download filenames. */
export function slugify(s: string): string {
  return (s || "report")
    .toString()
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase()
}
