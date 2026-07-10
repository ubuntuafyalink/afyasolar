/**
 * Transparent, versioned disruption-RISK model (the vision's "ML risk-prediction",
 * shipped as an explainable calibrated PRIOR — NOT a trained forecast).
 *
 * Target: elevated risk of a critical-service disruption (power loss or cold-chain
 * failure) at a facility in the coming weeks. Output is a calibrated composite
 * pressure, deliberately labelled a "modelled prior" everywhere it surfaces.
 *
 * Form: logistic regression over normalized risk-pressure features
 *   p = 1 / (1 + e^-(b0 + Σ wᵢ·xᵢ)),   xᵢ ∈ [0,1]
 * Coefficients are frozen, documented, SIGN-CONSTRAINED domain priors (all
 * pressures positive; the adaptation offset is protective/negative) → the model is
 * monotonic and cannot produce a counter-intuitive attribution. For a linear logit
 * the additive contributions wᵢ·xᵢ are the EXACT attribution (no SHAP sampling),
 * so `Σ contribution + b0 = z` is an invariant (unit-tested).
 *
 * Pure + dependency-free (no DB, no React). When outcome telemetry accrues, the
 * SAME functions consume a data-FIT coefficient set (bump RISK_MODEL_VERSION); the
 * structure does not change. See docs/RISK_PREDICTION_METHODOLOGY.md.
 */
import { clamp } from "@/lib/climate/climate-stats"

/** Stamps the coefficient set. "v0-prior" = expert-elicited, not fit to outcomes. */
export const RISK_MODEL_VERSION = "risk-v0-prior"

/**
 * Assumed baseline 30-day critical-disruption rate for a "typical" facility. The
 * intercept b0 is chosen so the documented typical feature vector scores here.
 * A single, honest assumption — treat absolute probabilities as ordinal until fit.
 */
export const BASE_RATE = 0.18

export type RiskFeatureKey =
  | "hazardExposure"
  | "heatPressure"
  | "serviceFragility"
  | "energyContinuityGap"
  | "readinessGap"
  | "autonomyDeficit"
  | "efficiencyDeficit"
  | "deviceOffline"
  | "criticalAttention"
  | "adaptationOffset"

/** Normalized risk-pressure inputs, each in [0,1] (higher = more risk). */
export type RiskFeatures = Record<RiskFeatureKey, number>

/** Documented, sign-constrained coefficients (logit units). Rationale per weight. */
export const RISK_COEFFICIENTS: Record<RiskFeatureKey, number> = {
  hazardExposure: 1.1, // broad climate exposure raises disruption pressure
  heatPressure: 0.9, // heat is the dominant cold-chain stressor (proxy, not measured)
  serviceFragility: 1.3, // fragile critical services fail first (CSF)
  energyContinuityGap: 1.4, // weak energy continuity/power quality = outage risk (ECPQ)
  readinessGap: 0.8, // poor readiness/response worsens any shock (RRC)
  autonomyDeficit: 1.5, // short battery autonomy is the most direct outage driver
  efficiencyDeficit: 0.6, // waste erodes the energy margin
  deviceOffline: 0.7, // offline devices = blind spots + likely faults
  criticalAttention: 1.0, // assessment red-flag
  adaptationOffset: -1.2, // protective: implemented adaptations reduce risk
}

/**
 * Neutral (no-signal) value per feature, used when a real value is unavailable.
 * All pressures default to 0 (no evidence of risk); adaptationOffset defaults to 0
 * (no evidence of protection). Imputing neutral keeps the score honest and lowers
 * confidence rather than inventing risk.
 */
export const NEUTRAL_FEATURES: RiskFeatures = {
  hazardExposure: 0,
  heatPressure: 0,
  serviceFragility: 0,
  energyContinuityGap: 0,
  readinessGap: 0,
  autonomyDeficit: 0,
  efficiencyDeficit: 0,
  deviceOffline: 0,
  criticalAttention: 0,
  adaptationOffset: 0,
}

export type RiskTier = "Low" | "Elevated" | "High" | "Severe"

/** Tier from probability (documented thresholds; mirrors rcsTierLabel style). */
export function riskTierLabel(p: number): RiskTier {
  if (p >= 0.5) return "Severe"
  if (p >= 0.3) return "High"
  if (p >= 0.15) return "Elevated"
  return "Low"
}

/** Feature vector of a documented "typical" facility, used to calibrate b0. */
const TYPICAL_FEATURES: RiskFeatures = {
  hazardExposure: 0.45,
  heatPressure: 0.5,
  serviceFragility: 0.4,
  energyContinuityGap: 0.4,
  readinessGap: 0.4,
  autonomyDeficit: 0.3,
  efficiencyDeficit: 0.35,
  deviceOffline: 0.1,
  criticalAttention: 0,
  adaptationOffset: 0.1,
}

const FEATURE_KEYS = Object.keys(RISK_COEFFICIENTS) as RiskFeatureKey[]

function weightedSum(f: RiskFeatures): number {
  return FEATURE_KEYS.reduce((s, k) => s + RISK_COEFFICIENTS[k] * clamp(f[k], 0, 1), 0)
}

/**
 * Intercept b0 calibrated so the TYPICAL feature vector yields BASE_RATE:
 *   b0 = logit(BASE_RATE) − Σ wᵢ·typicalᵢ
 */
export const RISK_INTERCEPT = Math.log(BASE_RATE / (1 - BASE_RATE)) - weightedSum(TYPICAL_FEATURES)

function sigmoid(z: number): number {
  return 1 / (1 + Math.exp(-z))
}

/** Raw logit z and probability p for a feature vector. */
export function scoreRisk(f: RiskFeatures): { z: number; probability: number } {
  const z = RISK_INTERCEPT + weightedSum(f)
  return { z, probability: sigmoid(z) }
}

export type RiskDriverDirection = "increases" | "reduces"
export type Bilingual = { en: string; sw: string }

export type RiskDriver = {
  key: RiskFeatureKey
  label: Bilingual
  /** The normalized feature value xᵢ (0..1). */
  value: number
  /** Exact logit contribution wᵢ·xᵢ. */
  contribution: number
  /** |contribution| as a share of total absolute contribution (0..100). */
  sharePct: number
  direction: RiskDriverDirection
}

const DRIVER_LABELS: Record<RiskFeatureKey, Bilingual> = {
  hazardExposure: { en: "High climate exposure", sw: "Mfiduo mkubwa wa hali ya hewa" },
  heatPressure: { en: "Heat stress on the cold chain", sw: "Joto kwenye mnyororo baridi" },
  serviceFragility: { en: "Fragile critical services", sw: "Huduma muhimu dhaifu" },
  energyContinuityGap: { en: "Weak energy continuity", sw: "Mwendelezo dhaifu wa nishati" },
  readinessGap: { en: "Low readiness & response", sw: "Utayari mdogo wa kukabiliana" },
  autonomyDeficit: { en: "Short battery autonomy", sw: "Uwezo mdogo wa betri" },
  efficiencyDeficit: { en: "Low energy efficiency", sw: "Ufanisi mdogo wa nishati" },
  deviceOffline: { en: "Devices offline", sw: "Vifaa havipo mtandaoni" },
  criticalAttention: { en: "Flagged for critical attention", sw: "Imeorodheshwa kwa umakini wa dharura" },
  adaptationOffset: { en: "Adaptations implemented", sw: "Hatua za kukabiliana zimetekelezwa" },
}

/** Exact per-feature attribution, sorted by |contribution| (biggest first). */
export function explainRisk(f: RiskFeatures): RiskDriver[] {
  const raw = FEATURE_KEYS.map((k) => {
    const value = clamp(f[k], 0, 1)
    const contribution = RISK_COEFFICIENTS[k] * value
    return { key: k, value, contribution }
  }).filter((d) => Math.abs(d.contribution) > 1e-9)

  const totalAbs = raw.reduce((s, d) => s + Math.abs(d.contribution), 0) || 1
  return raw
    .map((d) => ({
      key: d.key,
      label: DRIVER_LABELS[d.key],
      value: d.value,
      contribution: d.contribution,
      sharePct: Math.round((Math.abs(d.contribution) / totalAbs) * 100),
      direction: (d.contribution >= 0 ? "increases" : "reduces") as RiskDriverDirection,
    }))
    .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))
}

export type RiskConfidence = "low" | "moderate" | "good"

/**
 * Below this data-completeness we do NOT assign a risk tier: too many features are
 * imputed-neutral, so a "Low" score would misleadingly read as "safe" when it is
 * really "unknown". Surfaces show an honest "insufficient data" state instead.
 */
export const MIN_SUFFICIENT_COMPLETENESS = 0.4

export type RiskResult = {
  version: string
  probability: number
  tier: RiskTier
  drivers: RiskDriver[]
  confidence: RiskConfidence
  /** False when too little real data exists to assign a credible tier (see threshold). */
  sufficientData: boolean
  /** Human-readable notes on what real data was missing (imputed neutral). */
  dataGaps: string[]
}

/**
 * Full assessment. `completeness` in [0,1] = fraction of features backed by real
 * data (the adapter computes it); it drives the confidence chip + the
 * sufficient-data gate, never the score itself.
 */
export function assessRisk(
  f: RiskFeatures,
  completeness: number,
  dataGaps: string[] = [],
): RiskResult {
  const { probability } = scoreRisk(f)
  const c = clamp(completeness, 0, 1)
  const confidence: RiskConfidence = c >= 0.75 ? "good" : c >= 0.45 ? "moderate" : "low"
  return {
    version: RISK_MODEL_VERSION,
    probability,
    tier: riskTierLabel(probability),
    drivers: explainRisk(f),
    confidence,
    sufficientData: c >= MIN_SUFFICIENT_COMPLETENESS,
    dataGaps,
  }
}
