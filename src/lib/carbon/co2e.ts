/**
 * Pure carbon / avoided-CO2e math for the dMRV engine, extracted from the
 * carbon-credits API routes so it is deterministic and unit-testable.
 *
 * Model (assessment-snapshot method, documented in
 * docs/CARBON_CALCULATOR_METHODOLOGY.md):
 *   energyGenerated (kWh) = dailySolarKwh * max(1, daysInclusive) * max(0, deviceRatio)
 *   co2Saved (kg)         = energyGenerated * gridEmissionFactor
 *   creditsEarned (tons)  = co2Saved / 1000
 *   totalValue (USD)      = creditsEarned * creditValue
 *
 * Output fields are rounded to 2 decimals; the intermediate energy value used to
 * derive co2Saved is NOT pre-rounded, matching the original route behavior.
 */

/** Default grid emission factor, kg CO2 per kWh displaced (grid average default). */
export const DEFAULT_GRID_EMISSION_FACTOR = 0.5
/** Default voluntary-market credit value, USD per ton CO2e. */
export const DEFAULT_CREDIT_VALUE_USD = 25

export type CarbonInput = {
  /** Estimated daily solar generation for the facility, kWh/day. */
  dailySolarKwh: number
  /** Number of days in the reporting window (inclusive). */
  daysInclusive: number
  /** Share of facility generation allocated to this device (0..1); default 1. */
  deviceRatio?: number
  /** kg CO2 avoided per kWh; defaults to DEFAULT_GRID_EMISSION_FACTOR. */
  gridEmissionFactor?: number
  /** USD per ton CO2e; defaults to DEFAULT_CREDIT_VALUE_USD. */
  creditValueUsd?: number
}

export type CarbonResult = {
  energyGenerated: number // kWh (rounded 2dp)
  co2Saved: number // kg (rounded 2dp)
  creditsEarned: number // tons (rounded 2dp)
  creditValue: number // USD per ton
  totalValue: number // USD (rounded 2dp)
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100
}

/**
 * Compute avoided-CO2e and carbon-credit value for one reporting window.
 * Mirrors the formula used in the carbon-credits calculate routes.
 */
export function computeCarbonResult(input: CarbonInput): CarbonResult {
  const {
    dailySolarKwh,
    daysInclusive,
    deviceRatio = 1,
    gridEmissionFactor = DEFAULT_GRID_EMISSION_FACTOR,
    creditValueUsd = DEFAULT_CREDIT_VALUE_USD,
  } = input

  const energyGenerated = dailySolarKwh * Math.max(1, daysInclusive) * Math.max(0, deviceRatio)
  const co2Saved = energyGenerated * gridEmissionFactor
  const creditsEarned = co2Saved / 1000
  const totalValue = creditsEarned * creditValueUsd

  return {
    energyGenerated: round2(energyGenerated),
    co2Saved: round2(co2Saved),
    creditsEarned: round2(creditsEarned),
    creditValue: creditValueUsd,
    totalValue: round2(totalValue),
  }
}
