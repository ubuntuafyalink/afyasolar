/**
 * Canonical CRiPHC resilience scoring for the SAVED climate assessment.
 *
 * Mirrors the client RCS model in facility-demo-data.ts (getCrphcBaseDimensions
 * weights + computeCrphcResult tiering) so the persisted score uses the same
 * formula the facility RCS explainer shows on screen. Centralized here so the
 * server scoring route and any tooling share one definition.
 *
 * The saved climate assessment scores only the five CORE dimensions
 * (HES, CSF, ECPQ, EDC, RRC); the two CRiPHC v2 dimensions (Workforce, WASH) are
 * scored elsewhere. The canonical core weights sum to 0.70, so we renormalize
 * them to sum to 1 across these five dimensions when composing the RCS.
 *
 * Bump CRIPHC_FORMULA_VERSION whenever the math below changes, for auditability.
 */

export type ModuleCode = "HES" | "CSF" | "ECPQ" | "EDC" | "RRC"

/** Canonical CRiPHC core weights (see getCrphcBaseDimensions in facility-demo-data.ts). */
export const CRIPHC_CORE_WEIGHTS: Record<ModuleCode, number> = {
  HES: 0.15,
  CSF: 0.2,
  ECPQ: 0.15,
  EDC: 0.1,
  RRC: 0.1,
}

/** Version stamp for the saved scoring formula (combine with the climate normalization version). */
export const CRIPHC_FORMULA_VERSION = "criphc-v1"

export function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n))
}

/**
 * HES (Hazard Exposure) capacity from a NASA POWER CVI composite: higher measured
 * exposure -> lower capacity. Matches the live rcs-explainer-section derivation.
 */
export function hesFromComposite(composite: number): number {
  return Math.round(clamp(100 - composite, 0, 100))
}

/**
 * Weighted RCS (0..100) from per-dimension CAPACITY scores (each 0..100, higher
 * is better). The five core weights are renormalized to sum to 1 because this
 * assessment covers only the core dimensions.
 */
export function combineRcs(capacity: Record<ModuleCode, number>): number {
  const codes = Object.keys(CRIPHC_CORE_WEIGHTS) as ModuleCode[]
  const weightTotal = codes.reduce((s, m) => s + CRIPHC_CORE_WEIGHTS[m], 0)
  const rcs = codes.reduce(
    (s, m) => s + clamp(capacity[m] ?? 0, 0, 100) * (CRIPHC_CORE_WEIGHTS[m] / weightTotal),
    0,
  )
  return Math.round(rcs)
}

/** Tier label per the canonical computeCrphcResult thresholds. */
export function rcsTierLabel(rcs: number): "Resilient" | "Developing" | "At risk" | "Critical" {
  return rcs >= 75 ? "Resilient" : rcs >= 55 ? "Developing" : rcs >= 35 ? "At risk" : "Critical"
}

/**
 * Tier as the int the climate_score_summaries.tier column stores. Ordered so
 * higher is better (3 = Resilient .. 0 = Critical), consistent with the prior
 * column convention (3 = strong .. 0 = fragile).
 */
export function rcsTierInt(rcs: number): number {
  return rcs >= 75 ? 3 : rcs >= 55 ? 2 : rcs >= 35 ? 1 : 0
}
