/**
 * Quantify the impact of climate adaptations, two honest ways:
 *
 *  - ESTIMATED gain: a transparent per-risk-category model (documented points a
 *    completed measure is expected to add to the Resilience Capacity Score).
 *  - OBSERVED change: the real RCS movement read from facility_resilience_snapshot
 *    between the first adaptation's implementation and the latest snapshot. This is
 *    a facility-level, all-factors figure (not attributed to a single measure), so
 *    we never over-claim causation.
 *
 * Pure + dependency-free; unit-testable. No DB, no React.
 */

export type AdaptationLike = {
  riskCategory: string
  status: string
  /** ISO date, when the measure was completed. */
  implementedAt: string | null
}

export type SnapshotLike = { periodMonth: string; resilienceScore: number }

/** Documented estimated RCS points a completed measure adds, by hazard family. */
export const EXPECTED_GAIN_BY_FAMILY: Record<string, number> = {
  coldchain: 4,
  flood: 3,
  storm: 2,
  water: 2,
  general: 1,
}

const ACTIVE_STATUSES = new Set(["recommended", "planned", "in_progress"])

/** Map a free-form risk category onto a hazard family used for the gain model. */
export function adaptationFamily(riskCategory: string): keyof typeof EXPECTED_GAIN_BY_FAMILY {
  const c = riskCategory.toLowerCase()
  if (c.includes("cold") || c.includes("heat") || c.includes("vaccine")) return "coldchain"
  if (c.includes("flood")) return "flood"
  if (c.includes("storm") || c.includes("wind")) return "storm"
  if (c.includes("water") || c.includes("drought") || c.includes("rain")) return "water"
  return "general"
}

/** Estimated RCS points a completed measure in this category is expected to add. */
export function estimatedGainPoints(riskCategory: string): number {
  return EXPECTED_GAIN_BY_FAMILY[adaptationFamily(riskCategory)]
}

export type AdaptationEffectiveness = {
  /** Estimated points already realized (sum over completed measures). */
  realizedGain: number
  /** Estimated points still available (sum over active/pending measures). */
  potentialGain: number
  completedCount: number
  activeCount: number
  /** Real RCS movement from snapshots since the first adaptation was implemented. */
  observed: { points: number; fromMonth: string; toMonth: string } | null
}

/** Snapshot RCS at or before a YYYY-MM period (the closest earlier baseline). */
function snapshotAtOrBefore(snapshots: SnapshotLike[], month: string): SnapshotLike | null {
  const eligible = snapshots.filter((s) => s.periodMonth <= month).sort((a, b) => a.periodMonth.localeCompare(b.periodMonth))
  return eligible.length ? eligible[eligible.length - 1] : null
}

export function computeAdaptationEffectiveness(
  adaptations: AdaptationLike[],
  snapshots: SnapshotLike[],
): AdaptationEffectiveness {
  let realizedGain = 0
  let potentialGain = 0
  let completedCount = 0
  let activeCount = 0

  for (const a of adaptations) {
    const g = estimatedGainPoints(a.riskCategory)
    if (a.status === "completed") {
      realizedGain += g
      completedCount += 1
    } else if (ACTIVE_STATUSES.has(a.status)) {
      potentialGain += g
      activeCount += 1
    }
  }

  // Observed change: earliest completion month → latest snapshot.
  let observed: AdaptationEffectiveness["observed"] = null
  const completedMonths = adaptations
    .filter((a) => a.status === "completed" && a.implementedAt)
    .map((a) => a.implementedAt!.slice(0, 7))
    .sort()
  const sorted = [...snapshots].sort((a, b) => a.periodMonth.localeCompare(b.periodMonth))
  if (completedMonths.length && sorted.length >= 2) {
    const baseline = snapshotAtOrBefore(sorted, completedMonths[0]) ?? sorted[0]
    const latest = sorted[sorted.length - 1]
    if (latest.periodMonth > baseline.periodMonth) {
      observed = {
        points: Math.round(latest.resilienceScore - baseline.resilienceScore),
        fromMonth: baseline.periodMonth,
        toMonth: latest.periodMonth,
      }
    }
  }

  return { realizedGain, potentialGain, completedCount, activeCount, observed }
}
