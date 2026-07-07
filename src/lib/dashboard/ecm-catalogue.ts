/**
 * The Energy Conservation Measures (ECM) catalogue (CEO spec 9.5): the versioned
 * reference set of measures the facility UI recommends and ranks. The canonical
 * human-readable reference lives at docs/standards/ecms.yaml; this typed module is
 * the source the app consumes (no runtime YAML parse). Bump ECM_CATALOGUE_VERSION
 * when the set or the costings change.
 *
 * Indicative costs/savings are for a REPRESENTATIVE small health facility (~30
 * kWh/day). Use estimateEcmSavingsTsh()/estimateEcmCostTsh() to scale a measure to
 * a specific facility's size where a real daily-load figure is available.
 */
export const ECM_CATALOGUE_VERSION = "ecm-v1"

export type EcmHorizon = "immediate" | "medium" | "capital"

export type Ecm = {
  code: string
  title: string
  category: string
  description: string
  /** Indicative cost in TSh for the reference facility. */
  indicativeCostTsh: number
  /** Indicative monthly saving in TSh for the reference facility. */
  monthlySavingTsh: number
  /** Expected resilience gain in RCS points. */
  resilienceGainPoints: number
  /** Primary CRiPHC dimension this measure improves. */
  dimension: string
  horizon: EcmHorizon
  lifetimeYears: number
  /** How much the cost/saving scales with facility size (0 = fixed, 1 = fully proportional). */
  sizeScaling?: number
}

export type RankedEcm = Ecm & { rankScore: number; paybackMonths: number | null }

/** Reference facility daily load the indicative figures are costed against. */
const REFERENCE_DAILY_KWH = 30

/** Scale a reference figure to a facility's daily load using the measure's sizeScaling. */
function scaleToFacility(referenceValue: number, sizeScaling: number, facilityDailyKwh?: number): number {
  if (!facilityDailyKwh || facilityDailyKwh <= 0 || sizeScaling <= 0) return referenceValue
  const ratio = facilityDailyKwh / REFERENCE_DAILY_KWH
  // Blend a fixed part (1 - sizeScaling) with a proportional part (sizeScaling * ratio).
  return referenceValue * (1 - sizeScaling + sizeScaling * ratio)
}

/** Size-based estimated monthly saving (TSh) for a measure at a given facility load. */
export function estimateEcmSavingsTsh(ecm: Ecm, facilityDailyKwh?: number): number {
  return Math.round(scaleToFacility(ecm.monthlySavingTsh, ecm.sizeScaling ?? 0.6, facilityDailyKwh))
}

/** Size-based estimated capital cost (TSh) for a measure at a given facility load. */
export function estimateEcmCostTsh(ecm: Ecm, facilityDailyKwh?: number): number {
  return Math.round(scaleToFacility(ecm.indicativeCostTsh, ecm.sizeScaling ?? 0.6, facilityDailyKwh))
}

/**
 * Rank measures by the spec 10.4 idea: prioritise resilience gain per cost, using
 * size-scaled cost/saving when a facility load is provided. Also returns simple
 * payback (months) for context. Higher rankScore is better.
 */
export function rankEcms(ecms: Ecm[] = ECM_CATALOGUE, facilityDailyKwh?: number): RankedEcm[] {
  return ecms
    .map((e) => {
      const cost = estimateEcmCostTsh(e, facilityDailyKwh)
      const saving = estimateEcmSavingsTsh(e, facilityDailyKwh)
      return {
        ...e,
        rankScore: Math.round((e.resilienceGainPoints / (cost / 1_000_000)) * 10) / 10,
        paybackMonths: saving > 0 ? Math.round(cost / saving) : null,
      }
    })
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
    sizeScaling: 0.8,
  },
  {
    code: "ECM-009",
    title: "Occupancy sensors & daylight controls",
    category: "Controls",
    description: "Auto switch-off lighting in intermittently used rooms (stores, WCs, corridors).",
    indicativeCostTsh: 380_000,
    monthlySavingTsh: 22_000,
    resilienceGainPoints: 3,
    dimension: "EDC",
    horizon: "immediate",
    lifetimeYears: 8,
    sizeScaling: 0.7,
  },
  {
    code: "ECM-010",
    title: "Load scheduling to solar hours",
    category: "Behaviour",
    description: "Run autoclave, pumping and laundry during peak-solar hours to cut battery/genset use.",
    indicativeCostTsh: 60_000,
    monthlySavingTsh: 40_000,
    resilienceGainPoints: 5,
    dimension: "EDC",
    horizon: "immediate",
    lifetimeYears: 5,
    sizeScaling: 0.4,
  },
  {
    code: "ECM-011",
    title: "Staff switch-off protocol & signage",
    category: "Behaviour",
    description: "Train staff and label switches so non-critical loads are turned off overnight.",
    indicativeCostTsh: 90_000,
    monthlySavingTsh: 25_000,
    resilienceGainPoints: 4,
    dimension: "RRC",
    horizon: "immediate",
    lifetimeYears: 4,
    sizeScaling: 0.3,
  },
  {
    code: "ECM-012",
    title: "Fridge gasket & door-seal renewal",
    category: "Cold chain",
    description: "Replace worn vaccine-fridge door seals to cut compressor runtime and excursion risk.",
    indicativeCostTsh: 180_000,
    monthlySavingTsh: 18_000,
    resilienceGainPoints: 6,
    dimension: "CSF",
    horizon: "immediate",
    lifetimeYears: 4,
    sizeScaling: 0.2,
  },
  {
    code: "ECM-013",
    title: "Continuous cold-chain temperature monitoring",
    category: "Cold chain",
    description: "Add logging thermometers with alarms so excursions are caught before spoilage.",
    indicativeCostTsh: 520_000,
    monthlySavingTsh: 15_000,
    resilienceGainPoints: 8,
    dimension: "CSF",
    horizon: "medium",
    lifetimeYears: 6,
    sizeScaling: 0.3,
  },
  {
    code: "ECM-014",
    title: "Inverter (DC) air-conditioner upgrade",
    category: "HVAC",
    description: "Replace fixed-speed AC in the theatre/lab with an efficient inverter unit.",
    indicativeCostTsh: 2_600_000,
    monthlySavingTsh: 70_000,
    resilienceGainPoints: 5,
    dimension: "EDC",
    horizon: "capital",
    lifetimeYears: 10,
    sizeScaling: 0.7,
  },
  {
    code: "ECM-015",
    title: "Ceiling insulation & ventilation",
    category: "Thermal",
    description: "Insulate the ceiling and improve cross-ventilation to reduce cooling demand.",
    indicativeCostTsh: 850_000,
    monthlySavingTsh: 28_000,
    resilienceGainPoints: 5,
    dimension: "HES",
    horizon: "medium",
    lifetimeYears: 12,
    sizeScaling: 0.6,
  },
  {
    code: "ECM-016",
    title: "External window shading",
    category: "Thermal",
    description: "Add eaves/shades on sun-facing windows to cut heat gain in wards and stores.",
    indicativeCostTsh: 480_000,
    monthlySavingTsh: 16_000,
    resilienceGainPoints: 3,
    dimension: "HES",
    horizon: "medium",
    lifetimeYears: 10,
    sizeScaling: 0.5,
  },
  {
    code: "ECM-017",
    title: "Scheduled solar array cleaning",
    category: "Solar",
    description: "Routine panel cleaning to recover lost yield from dust and soiling.",
    indicativeCostTsh: 120_000,
    monthlySavingTsh: 30_000,
    resilienceGainPoints: 4,
    dimension: "ECPQ",
    horizon: "immediate",
    lifetimeYears: 1,
    sizeScaling: 0.9,
  },
  {
    code: "ECM-018",
    title: "Solar array expansion",
    category: "Solar",
    description: "Add PV capacity so more of the daily load is met directly from the sun.",
    indicativeCostTsh: 3_800_000,
    monthlySavingTsh: 95_000,
    resilienceGainPoints: 8,
    dimension: "ECPQ",
    horizon: "capital",
    lifetimeYears: 20,
    sizeScaling: 1,
  },
  {
    code: "ECM-019",
    title: "Right-size & service the generator",
    category: "Electrical",
    description: "Match generator size to critical load and service it so backup fuel burn drops.",
    indicativeCostTsh: 700_000,
    monthlySavingTsh: 60_000,
    resilienceGainPoints: 6,
    dimension: "ECPQ",
    horizon: "medium",
    lifetimeYears: 8,
    sizeScaling: 0.5,
  },
  {
    code: "ECM-020",
    title: "Rainwater harvesting for non-clinical use",
    category: "Water",
    description: "Capture roof runoff to cut pumping energy and buffer drought-season water gaps.",
    indicativeCostTsh: 1_300_000,
    monthlySavingTsh: 22_000,
    resilienceGainPoints: 7,
    dimension: "WW",
    horizon: "capital",
    lifetimeYears: 15,
    sizeScaling: 0.4,
  },
  {
    code: "ECM-021",
    title: "Water leak survey & repair",
    category: "Water",
    description: "Find and fix leaks so the pump runs less and stored water lasts longer.",
    indicativeCostTsh: 220_000,
    monthlySavingTsh: 20_000,
    resilienceGainPoints: 3,
    dimension: "WW",
    horizon: "immediate",
    lifetimeYears: 5,
    sizeScaling: 0.3,
  },
  {
    code: "ECM-022",
    title: "Smart metering & sub-metering",
    category: "Metering",
    description: "Meter the main and key circuits so waste is visible and savings can be tracked.",
    indicativeCostTsh: 640_000,
    monthlySavingTsh: 24_000,
    resilienceGainPoints: 4,
    dimension: "EDC",
    horizon: "medium",
    lifetimeYears: 8,
    sizeScaling: 0.5,
  },
  {
    code: "ECM-023",
    title: "Battery management & monitoring (BMS)",
    category: "Storage",
    description: "Add/upgrade BMS to protect the battery, extend life and avoid deep-discharge failures.",
    indicativeCostTsh: 900_000,
    monthlySavingTsh: 18_000,
    resilienceGainPoints: 6,
    dimension: "ECPQ",
    horizon: "medium",
    lifetimeYears: 8,
    sizeScaling: 0.6,
  },
  {
    code: "ECM-024",
    title: "Efficient water/space heating (solar or heat-pump)",
    category: "HVAC",
    description: "Replace resistive heating with solar-thermal or heat-pump for hot water/sterilising.",
    indicativeCostTsh: 1_800_000,
    monthlySavingTsh: 50_000,
    resilienceGainPoints: 4,
    dimension: "EDC",
    horizon: "capital",
    lifetimeYears: 12,
    sizeScaling: 0.7,
  },
]
