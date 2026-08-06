/**
 * A small sample of the Energy Conservation Measures (ECM) catalogue
 * (CEO spec 9.5). The real catalogue is a versioned YAML of ~50 measures at
 * docs/standards/ecms.yaml; this is a representative subset for the facility UI.
 *
 * TODO: load the real catalogue (docs/standards/ecms.yaml) once it exists.
 */
export type EcmHorizon = "immediate" | "medium" | "capital"

export type Ecm = {
  code: string
  title: string
  category: string
  description: string
  /** Indicative cost in TSh (the real catalogue uses a size-based formula). */
  indicativeCostTsh: number
  /** Indicative monthly saving in TSh. */
  monthlySavingTsh: number
  /** Expected resilience gain in RCS points. */
  resilienceGainPoints: number
  /** Primary CRiPHC dimension this measure improves. */
  dimension: string
  horizon: EcmHorizon
  lifetimeYears: number
}

export type RankedEcm = Ecm & { rankScore: number }

/**
 * Rank measures by a simplified version of the spec 10.4 score:
 * expected resilience gain per million TSh of cost. Higher is better.
 */
export function rankEcms(ecms: Ecm[] = ECM_CATALOGUE): RankedEcm[] {
  return ecms
    .map((e) => ({
      ...e,
      rankScore: Math.round((e.resilienceGainPoints / (e.indicativeCostTsh / 1_000_000)) * 10) / 10,
    }))
    .sort((a, b) => b.rankScore - a.rankScore)
}

export const ECM_CATALOGUE: Ecm[] = [
  {
    code: "ECM-001",
    title: "LED lighting retrofit",
    category: "Lighting",
    description: "Replace incandescent and fluorescent fittings with LED across the facility.",
    indicativeCostTsh: 450_000,
    monthlySavingTsh: 55_000,
    resilienceGainPoints: 4,
    dimension: "EDC",
    horizon: "immediate",
    lifetimeYears: 8,
  },
  {
    code: "ECM-002",
    title: "Solar direct-drive vaccine refrigerator",
    category: "Cold chain",
    description: "Replace a gas-absorption fridge with a solar direct-drive unit with ice-lined storage.",
    indicativeCostTsh: 3_200_000,
    monthlySavingTsh: 90_000,
    resilienceGainPoints: 12,
    dimension: "CSF",
    horizon: "capital",
    lifetimeYears: 10,
  },
  {
    code: "ECM-003",
    title: "Critical-load circuit isolation",
    category: "Electrical",
    description: "Separate cold chain, maternity and lighting onto a protected critical-load circuit.",
    indicativeCostTsh: 1_100_000,
    monthlySavingTsh: 20_000,
    resilienceGainPoints: 9,
    dimension: "ECPQ",
    horizon: "medium",
    lifetimeYears: 12,
  },
  {
    code: "ECM-004",
    title: "Cool-roof coating",
    category: "Thermal",
    description: "Apply reflective roof coating to cut indoor heat gain and cooling load.",
    indicativeCostTsh: 700_000,
    monthlySavingTsh: 30_000,
    resilienceGainPoints: 5,
    dimension: "HES",
    horizon: "medium",
    lifetimeYears: 7,
  },
  {
    code: "ECM-005",
    title: "Variable-frequency drive on water pump",
    category: "Water",
    description: "Add a VFD to the water pump to match flow to demand and cut energy use.",
    indicativeCostTsh: 950_000,
    monthlySavingTsh: 35_000,
    resilienceGainPoints: 6,
    dimension: "WW",
    horizon: "medium",
    lifetimeYears: 10,
  },
  {
    code: "ECM-006",
    title: "Power-factor correction at main panel",
    category: "Electrical",
    description: "Install capacitor bank to correct power factor and reduce demand charges.",
    indicativeCostTsh: 1_400_000,
    monthlySavingTsh: 45_000,
    resilienceGainPoints: 4,
    dimension: "ECPQ",
    horizon: "capital",
    lifetimeYears: 12,
  },
  {
    code: "ECM-007",
    title: "Surge protection & voltage stabilisation",
    category: "Electrical",
    description: "Protect sensitive equipment from surges and voltage swings on the grid supply.",
    indicativeCostTsh: 600_000,
    monthlySavingTsh: 15_000,
    resilienceGainPoints: 7,
    dimension: "ECPQ",
    horizon: "immediate",
    lifetimeYears: 8,
  },
  {
    code: "ECM-008",
    title: "Battery autonomy upgrade",
    category: "Storage",
    description: "Add storage so critical loads ride through longer outages without the generator.",
    indicativeCostTsh: 4_500_000,
    monthlySavingTsh: 80_000,
    resilienceGainPoints: 11,
    dimension: "ECPQ",
    horizon: "capital",
    lifetimeYears: 8,
  },
]
