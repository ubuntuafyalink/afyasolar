/**
 * Mann-Kendall trend test + Sen's slope (spec §8.3 — real climate statistics,
 * replacing the earlier ±5-point deadband heuristic). Pure and deterministic.
 *
 * The Mann-Kendall test is the standard non-parametric test for a monotonic
 * trend in a time series; Sen's slope estimates its magnitude. Both are
 * distribution-free and robust to outliers, which suits short annual hazard
 * series derived from NASA POWER.
 */

export type TrendDirection = "increasing" | "decreasing" | "no-trend"

export type MannKendallResult = {
  /** Number of finite samples used. */
  n: number
  /** Mann-Kendall S statistic. */
  s: number
  /** Variance of S (with tie correction). */
  varS: number
  /** Standardized test statistic (continuity-corrected). */
  z: number
  /** Classified trend at the given critical value. */
  trend: TrendDirection
}

function sign(n: number): number {
  return n > 0 ? 1 : n < 0 ? -1 : 0
}

/**
 * Run the Mann-Kendall test on an ordered series.
 * @param series values in time order (equal spacing assumed).
 * @param zCritical two-sided critical z (default 1.645 ≈ α=0.10). |z| beyond it
 *   classifies the trend as increasing/decreasing; otherwise "no-trend".
 * Series shorter than 3 finite points return "no-trend" (test undefined).
 */
export function mannKendall(series: number[], zCritical = 1.645): MannKendallResult {
  const xs = series.filter((v) => Number.isFinite(v))
  const n = xs.length
  if (n < 3) return { n, s: 0, varS: 0, z: 0, trend: "no-trend" }

  let s = 0
  for (let i = 0; i < n - 1; i++) {
    for (let j = i + 1; j < n; j++) {
      s += sign(xs[j] - xs[i])
    }
  }

  // Variance with tie correction.
  const counts = new Map<number, number>()
  for (const v of xs) counts.set(v, (counts.get(v) ?? 0) + 1)
  let tieTerm = 0
  for (const t of counts.values()) if (t > 1) tieTerm += t * (t - 1) * (2 * t + 5)
  const varS = (n * (n - 1) * (2 * n + 5) - tieTerm) / 18

  let z = 0
  if (varS > 0) {
    if (s > 0) z = (s - 1) / Math.sqrt(varS)
    else if (s < 0) z = (s + 1) / Math.sqrt(varS)
  }

  const trend: TrendDirection = z > zCritical ? "increasing" : z < -zCritical ? "decreasing" : "no-trend"
  return { n, s, varS, z, trend }
}

/**
 * Sen's slope: the median of all pairwise slopes (x_j - x_i)/(j - i) over the
 * equally-spaced series. Returns 0 for series shorter than 2 points.
 */
export function sensSlope(series: number[]): number {
  const xs = series.filter((v) => Number.isFinite(v))
  const n = xs.length
  if (n < 2) return 0
  const slopes: number[] = []
  for (let i = 0; i < n - 1; i++) {
    for (let j = i + 1; j < n; j++) {
      slopes.push((xs[j] - xs[i]) / (j - i))
    }
  }
  slopes.sort((a, b) => a - b)
  const mid = Math.floor(slopes.length / 2)
  return slopes.length % 2 === 0 ? (slopes[mid - 1] + slopes[mid]) / 2 : slopes[mid]
}
