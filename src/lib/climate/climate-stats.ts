/**
 * Pure, dependency-free statistics for the climate-hazard normalization (v2).
 *
 * Isolated here so the methodology doc (docs/CLIMATE_RESILIENCE_METHODOLOGY.md)
 * maps 1:1 to functions and the math is unit-testable without any NASA/DB deps.
 * All functions are total (defined for empty/degenerate inputs) and side-effect
 * free.
 */

export function mean(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0
}

/** Sample standard deviation (n-1). Returns 0 for fewer than 2 points. */
export function sampleStdev(xs: number[]): number {
  const n = xs.length
  if (n < 2) return 0
  const m = mean(xs)
  const v = xs.reduce((a, b) => a + (b - m) * (b - m), 0) / (n - 1)
  return Math.sqrt(v)
}

/** clamp helper (shared numeric guard). */
export function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n))
}

/**
 * Standard normal CDF Φ(z) via the Abramowitz & Stegun 7.1.26 rational
 * approximation (|error| < 7.5e-8). No dependencies. Used to turn a standardized
 * anomaly (z-score against the local climatology) into a 0..1 percentile.
 */
export function normalCdf(z: number): number {
  const b1 = 0.319381530
  const b2 = -0.356563782
  const b3 = 1.781477937
  const b4 = -1.821255978
  const b5 = 1.330274429
  const p = 0.2316419
  const c = 0.39894228040143268 // 1/sqrt(2*pi)
  const az = Math.abs(z)
  const t = 1 / (1 + p * az)
  const phi = c * Math.exp(-(az * az) / 2)
  const series = phi * (b1 * t + b2 * t * t + b3 * t ** 3 + b4 * t ** 4 + b5 * t ** 5)
  return z >= 0 ? 1 - series : series
}

/**
 * Standardized-anomaly percentile (0..100) of `value` against a sample's local
 * climatology: Φ((value − μ) / σ) × 100. Returns null when the sample is too
 * short or degenerate (σ = 0) so callers can fall back to an absolute index.
 */
export function anomalyPercentile(value: number, sample: number[], minYears: number): number | null {
  if (sample.length < minYears) return null
  const sd = sampleStdev(sample)
  if (sd === 0) return null
  return normalCdf((value - mean(sample)) / sd) * 100
}

/**
 * Empirical (non-parametric) percentile of `value` within `sample` using the
 * Hazen plotting position. Retained for reference / future use.
 */
export function empiricalPercentile(value: number, sample: number[]): number | null {
  const n = sample.length
  if (n === 0) return null
  const below = sample.filter((v) => v <= value).length
  return clamp(((below - 0.5) / n) * 100, 0, 100)
}

/**
 * Empirical return period (years) of `value` treated as a high extreme, via the
 * Weibull plotting position: rank r of value among the sample (1 = largest),
 * T = (N + 1) / r. Returns null when the record is shorter than `minYears`.
 */
export function empiricalReturnYears(value: number, sample: number[], minYears: number): number | null {
  const n = sample.length
  if (n < minYears) return null
  // Rank = 1 + count strictly greater (largest value → rank 1).
  const rank = 1 + sample.filter((v) => v > value).length
  const t = (n + 1) / rank
  return Math.round(t * 10) / 10
}

export type OlsFit = { slope: number; intercept: number; stdErr: number }

/**
 * Ordinary least-squares fit of y on x, returning slope, intercept, and the
 * standard error of the slope (for a projection uncertainty band). Degenerate
 * inputs (< 2 points or zero x-variance) yield slope 0.
 */
export function olsFit(points: { x: number; y: number }[]): OlsFit {
  const n = points.length
  if (n < 2) return { slope: 0, intercept: points[0]?.y ?? 0, stdErr: 0 }
  const mx = mean(points.map((p) => p.x))
  const my = mean(points.map((p) => p.y))
  let sxx = 0
  let sxy = 0
  for (const p of points) {
    sxx += (p.x - mx) * (p.x - mx)
    sxy += (p.x - mx) * (p.y - my)
  }
  if (sxx === 0) return { slope: 0, intercept: my, stdErr: 0 }
  const slope = sxy / sxx
  const intercept = my - slope * mx
  // Residual variance → slope standard error.
  let sse = 0
  for (const p of points) {
    const yhat = intercept + slope * p.x
    sse += (p.y - yhat) * (p.y - yhat)
  }
  const dof = n - 2
  const stdErr = dof > 0 ? Math.sqrt(sse / dof / sxx) : 0
  return { slope, intercept, stdErr }
}
