/**
 * Eco-Pulse EPI (Energy Performance Index) computed from REAL metered consumption.
 *
 * The spec's climate-adjusted expected-consumption model (MLR+GAM) needs a trained
 * baseline we don't have yet, so this uses a transparent, self-referential baseline:
 * the facility's recent consumption versus its own trailing norm. EPI = mean of the
 * last 7 days' consumption ÷ mean of the preceding days. 1.0 = tracking your norm;
 * ≥1.3 = notably higher (possible waste); <0.8 = notably lower (possible metering gap).
 *
 * Pure + dependency-free; returns null when there isn't enough real data (caller
 * falls back to the clearly-badged demo value).
 */
export type EcoPulseBand = "efficient" | "expected" | "inefficient" | "check-data"

export type EcoPulseResult = {
  epi: number
  band: EcoPulseBand
  headline: string
  hypothesis: string
}

const RECENT_DAYS = 7
const MIN_TOTAL_DAYS = 14

function mean(xs: number[]): number {
  return xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0
}

/** `consumed` is the daily consumption series, oldest → newest. */
export function computeEcoPulseEpi(consumed: number[]): EcoPulseResult | null {
  const vals = consumed.filter((v) => Number.isFinite(v) && v > 0)
  if (vals.length < MIN_TOTAL_DAYS) return null
  const recent = vals.slice(-RECENT_DAYS)
  const baseline = vals.slice(0, -RECENT_DAYS)
  const b = mean(baseline)
  if (!(b > 0)) return null

  const epi = Math.round((mean(recent) / b) * 100) / 100
  const pctDiff = Math.round((epi - 1) * 100)
  const band: EcoPulseBand =
    epi >= 1.3 ? "inefficient" : epi < 0.8 ? "check-data" : epi <= 1.0 ? "efficient" : "expected"

  const headline =
    band === "inefficient"
      ? `Recent use is ${pctDiff}% above your baseline`
      : band === "check-data"
        ? `Recent use is ${Math.abs(pctDiff)}% below baseline — check metering`
        : band === "efficient"
          ? "Recent use is at or below your baseline"
          : `Recent use is ${pctDiff >= 0 ? "+" : ""}${pctDiff}% vs your baseline`

  const hypothesis =
    band === "inefficient"
      ? "Consumption has risen versus your recent norm — check for new or faulty loads, and schedule heavy loads into high-solar hours."
      : band === "check-data"
        ? "Consumption is unusually low versus your norm — verify the meter is reporting all loads."
        : "Consumption is tracking your recent norm."

  return { epi, band, headline, hypothesis }
}
