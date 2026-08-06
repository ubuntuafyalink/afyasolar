/**
 * Bridges the facility's Energy Efficiency assessment and the Climate Outlook
 * solar resource into the inputs the Power page needs, plus a transparent
 * clear-sky hourly solar model. Pure functions, no React / network / demo deps
 * (so facility-demo-data can import it without a cycle).
 */
import type { MeuSummary, SizingSummary } from "@/components/solar/afya-solar-sizing-tool"
import type { SkyClass } from "@/lib/climate/nasa-power"

/** Real inputs that anchor the Power page to assessed load + sized solar + climate sun. */
export type PowerInputs = {
  /** Total assessed daily load (kWh/day). */
  dailyLoadKwh: number
  /** Average continuous load (kW) = dailyLoadKwh / 24. */
  avgLoadKw: number
  /** Naive peak load with everything on (kW). */
  peakLoadKw: number
  /** Continuous critical load (kW), for battery autonomy. */
  criticalLoadKw: number
  /** Installed / sized solar array (kW). */
  solarCapacityKw: number
  /** Usable battery storage (kWh). */
  batteryCapacityKwh: number
  /** Peak-sun-hours from Climate Outlook (kWh/m^2/day). */
  peakSunHours: number
  sky: SkyClass
}

/**
 * Deterministic fallback energy profile (a typical small health facility), used
 * when no Energy Efficiency assessment has been completed yet so the Power page
 * still shows stable, climate-anchored values instead of random demo data.
 */
export const DEFAULT_ENERGY_PROFILE: Omit<PowerInputs, "peakSunHours" | "sky"> = {
  dailyLoadKwh: 30,
  avgLoadKw: 1.25,
  peakLoadKw: 6,
  criticalLoadKw: 1,
  solarCapacityKw: 6,
  batteryCapacityKwh: 40,
}

/** Performance ratio (array + inverter losses) used in the solar model. */
export const SOLAR_PR = 0.78
/** Battery depth-of-discharge used for autonomy. */
export const BATTERY_DOD = 0.9

const SUNRISE = 6
const SUNSET = 18

/**
 * Energy profile (load / solar capacity / battery / critical) from the Energy
 * Efficiency assessment summaries. Returns null when there is no usable assessed
 * load (so the Power page falls back to demo).
 */
export function deriveEnergyProfile(
  meu?: MeuSummary | null,
  sizing?: SizingSummary | null,
): Omit<PowerInputs, "peakSunHours" | "sky"> | null {
  const dailyLoadKwh = meu?.totalDailyLoad ?? sizing?.totalDailyLoad ?? 0
  if (!(dailyLoadKwh > 0)) return null

  const avgLoadKw = dailyLoadKwh / 24
  const peakLoadKw = meu?.peakLoadKw && meu.peakLoadKw > 0 ? meu.peakLoadKw : avgLoadKw * 2.5
  const criticalDaily = meu?.criticalityBreakdown?.critical
  const criticalLoadKw = criticalDaily != null && criticalDaily > 0 ? criticalDaily / 24 : avgLoadKw * 0.3
  const solarCapacityKw =
    (sizing?.solarArraySize && sizing.solarArraySize > 0
      ? sizing.solarArraySize
      : sizing?.recommendedPackageKw && sizing.recommendedPackageKw > 0
        ? sizing.recommendedPackageKw
        : peakLoadKw) || peakLoadKw
  // Same battery sizing math as the Energy Calculation tab: adjustedLoad / DoD,
  // adjustedLoad = dailyLoad x 1.2 (20% system-loss buffer).
  const batteryCapacityKwh = (dailyLoadKwh * 1.2) / BATTERY_DOD

  return {
    dailyLoadKwh: round2(dailyLoadKwh),
    avgLoadKw: round2(avgLoadKw),
    peakLoadKw: round2(peakLoadKw),
    criticalLoadKw: round2(criticalLoadKw),
    solarCapacityKw: round2(solarCapacityKw),
    batteryCapacityKwh: round2(batteryCapacityKwh),
  }
}

/**
 * Clear-sky solar output (kW) at a given hour for an array of `capacityKw`,
 * shaped so the daylight integral approximates `capacityKw x peakSunHours x PR`.
 * A symmetric sine bell over the daylight window (~06:00-18:00); 0 at night.
 */
export function hourlySolarKw(hour: number, capacityKw: number, peakSunHours: number): number {
  if (hour < SUNRISE || hour > SUNSET || capacityKw <= 0 || peakSunHours <= 0) return 0
  const L = SUNSET - SUNRISE
  const dailyEnergy = capacityKw * peakSunHours * SOLAR_PR
  const amplitude = (dailyEnergy * Math.PI) / (2 * L)
  const kw = amplitude * Math.sin(((hour - SUNRISE) / L) * Math.PI)
  return Math.max(0, Math.min(capacityKw, Math.round(kw * 100) / 100))
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}
