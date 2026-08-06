/**
 * Helpers to slice the combined hazard trend into single-hazard series and to
 * summarize a series, for the per-hazard charts (line/bar/area/pie/number) and
 * the AI "Explain" feature.
 */
import type { HazardTrendPoint } from "@/lib/dashboard/facility-demo-data"

export type HazardKey = "heat" | "flood" | "storm" | "drought"
export type SeriesPoint = { year: number; value: number }

export const HAZARD_KEYS: HazardKey[] = ["heat", "flood", "storm", "drought"]

/** Extract one hazard's {year,value}[] from the combined trend. */
export function toHazardSeries(trend: HazardTrendPoint[], hazard: HazardKey): SeriesPoint[] {
  return trend.map((p) => ({ year: p.year, value: p[hazard] }))
}

export type SeverityBuckets = { low: number; moderate: number; high: number }

/** Count years that fall into low (<40), moderate (40-65), high (>=66) bands. */
export function severityBuckets(points: SeriesPoint[]): SeverityBuckets {
  const b: SeverityBuckets = { low: 0, moderate: 0, high: 0 }
  for (const p of points) {
    if (p.value >= 66) b.high += 1
    else if (p.value >= 40) b.moderate += 1
    else b.low += 1
  }
  return b
}

export type SeriesStats = {
  latest: number
  first: number
  min: number
  max: number
  avg: number
  trend: "rising" | "stable" | "falling"
}

/** Latest/first/min/max/avg + a deadband trend (compares latest vs early mean). */
export function seriesStats(points: SeriesPoint[]): SeriesStats | null {
  if (!points.length) return null
  const values = points.map((p) => p.value)
  const latest = values[values.length - 1]
  const first = values[0]
  const min = Math.min(...values)
  const max = Math.max(...values)
  const avg = Math.round(values.reduce((a, b) => a + b, 0) / values.length)
  const head = points.slice(0, Math.min(3, points.length))
  const base = head.reduce((a, p) => a + p.value, 0) / head.length
  const d = latest - base
  const trend: SeriesStats["trend"] = d > 5 ? "rising" : d < -5 ? "falling" : "stable"
  return { latest, first, min, max, avg, trend }
}
