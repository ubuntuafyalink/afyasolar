import { describe, it, expect } from "vitest"
import {
  runLoadAnalysis,
  sizeBattery,
  sizePvArray,
  sizeInverter,
  sizeMppt,
  calculateBaselineCosts,
  calculateAfterSolarCosts,
  calculateSavings,
  compareFinancingOptions,
  runFullSizing,
  type DeviceLoadRow,
  type FacilityDataInput,
  type SolarSiteDataInput,
  type SystemParametersInput,
  type PricingRow,
  type PvArrayResult,
} from "./sizing-engine"

// A canonical facility used across the pipeline tests. Values are chosen so the
// expected numbers below are hand-computed from the formulas in the engine.
const DEVICES: DeviceLoadRow[] = [
  { device_name: "fridge", wattage_w: 150, quantity: 2, hours_per_day: 24, is_critical: true },
  { device_name: "lights", wattage_w: 20, quantity: 10, hours_per_day: 6, is_critical: false },
  { device_name: "pump", wattage_w: 500, quantity: 1, hours_per_day: 2, is_critical: true, is_motor: true, motor_type: "pump" },
]

const FACILITY: FacilityDataInput = {
  facility_type: "hybrid",
  avg_outage_hours_per_day: 6,
  tanesco_monthly_bill_tzs: 200_000,
  diesel_litres_per_day: 10,
}

const SITE: SolarSiteDataInput = {
  peak_sun_hours_worst_month: 5,
  battery_chemistry: "lifepo4",
}

const PARAMS: SystemParametersInput = {}

const PRICING: PricingRow[] = [
  { system_size_kw: 3, cash_price_tzs: 9_000_000, install_upfront_tzs: 3_000_000, install_monthly_tzs: 300_000, install_term_months: 24, eaas_monthly_tzs: 400_000, eaas_term_months: 60 },
  { system_size_kw: 5, cash_price_tzs: 14_000_000, install_upfront_tzs: 5_000_000, install_monthly_tzs: 450_000, install_term_months: 36, eaas_monthly_tzs: 600_000, eaas_term_months: 60 },
]

describe("runLoadAnalysis", () => {
  const load = runLoadAnalysis(DEVICES, 0.15)

  it("sums running power and daily energy over all devices", () => {
    // fridge 300W×24h=7.2kWh, lights 200W×6h=1.2kWh, pump 500W×2h=1.0kWh
    expect(load.P_run_total).toBe(1000)
    expect(load.E_day_total).toBeCloseTo(9.4, 5)
  })

  it("counts only critical devices toward the critical totals", () => {
    expect(load.P_run_critical).toBe(800) // fridge + pump
    expect(load.E_day_critical).toBeCloseTo(8.2, 5) // 7.2 + 1.0
  })

  it("applies the growth margin to the adjusted figures", () => {
    expect(load.E_day_total_adj).toBeCloseTo(10.81, 5)
    expect(load.P_run_total_adj).toBeCloseTo(1150, 5)
    expect(load.P_run_critical_adj).toBeCloseTo(920, 5)
  })

  it("returns zeros for an empty device list", () => {
    const empty = runLoadAnalysis([], 0.2)
    expect(empty.E_day_total).toBe(0)
    expect(empty.P_run_critical_adj).toBe(0)
  })
})

describe("sizeBattery", () => {
  const load = runLoadAnalysis(DEVICES, 0.15)

  it("sizes from outage energy for hybrid/on-grid facilities", () => {
    const b = sizeBattery(FACILITY, SITE, PARAMS, load)
    expect(b.eta_total).toBeCloseTo(0.874, 5) // 0.92 × 0.95
    // outage fraction 6/24=0.25 → E_outage = 9.43×0.25 = 2.3575
    expect(b.E_outage_critical).toBeCloseTo(2.3575, 4)
    expect(b.E_battery_required).toBeCloseTo(2.6974, 3) // 2.3575 / 0.874
    expect(b.E_battery_nameplate).toBeCloseTo(3.1734, 3) // ÷ 0.85 DoD
    expect(b.battery_Ah).toBeCloseTo(66.11, 1) // ×1000 / 48V
    expect(b.E_autonomy).toBeUndefined()
  })

  it("sizes from autonomy days for off-grid facilities", () => {
    const offGrid: FacilityDataInput = { ...FACILITY, facility_type: "off_grid" }
    const b = sizeBattery(offGrid, SITE, PARAMS, load)
    // E_autonomy = E_day_total_adj × 1 day = 10.81
    expect(b.E_autonomy).toBeCloseTo(10.81, 5)
    expect(b.E_battery_required).toBeCloseTo(12.368, 2) // 10.81 / 0.874
    expect(b.E_outage_critical).toBeUndefined()
  })

  it("halves usable capacity for lead-acid (lower DoD)", () => {
    const lead: SolarSiteDataInput = { ...SITE, battery_chemistry: "lead_acid" }
    const lifepo4 = sizeBattery(FACILITY, SITE, PARAMS, load)
    const leadAcid = sizeBattery(FACILITY, lead, PARAMS, load)
    // same required energy, but 0.5 vs 0.85 DoD → bigger nameplate
    expect(leadAcid.E_battery_nameplate).toBeGreaterThan(lifepo4.E_battery_nameplate)
    expect(leadAcid.E_battery_nameplate).toBeCloseTo(load.E_day_critical_adj * 0.25 / 0.874 / 0.5, 3)
  })
})

describe("sizePvArray", () => {
  const load = runLoadAnalysis(DEVICES, 0.15)
  const pv = sizePvArray(FACILITY, SITE, PARAMS, load)

  it("applies the facility derate factor and rounds panels up", () => {
    expect(pv.derate_factor).toBe(0.75) // hybrid
    // P_pv_kw = 10.81 / (5 × 0.75) = 2.8827 → ceil(2882.7/620)=5 panels
    expect(pv.P_pv_kw).toBeCloseTo(2.8827, 3)
    expect(pv.panels_required).toBe(5)
    expect(pv.P_pv_actual_kw).toBeCloseTo(3.1, 5) // 5 × 620W
    expect(pv.solar_energy_daily).toBeCloseTo(11.625, 3) // 3.1 × 5 × 0.75
  })
})

describe("sizeInverter", () => {
  const load = runLoadAnalysis(DEVICES, 0.15)

  it("uses critical running power with 1.25 headroom and picks the largest motor surge", () => {
    const inv = sizeInverter(DEVICES, load)
    expect(inv.inverter_continuous_w).toBeCloseTo(1150, 5) // 1.25 × 920
    expect(inv.inverter_continuous_kw).toBeCloseTo(1.15, 5)
    expect(inv.surge_required_w).toBe(2000) // pump 500W × 4
  })

  it("reports zero surge when there are no motor loads", () => {
    const noMotors = DEVICES.filter((d) => !d.is_motor)
    const inv = sizeInverter(noMotors, runLoadAnalysis(noMotors, 0.15))
    expect(inv.surge_required_w).toBe(0)
  })

  it("falls back to total running power when no critical load exists", () => {
    const nonCritical: DeviceLoadRow[] = [{ device_name: "tv", wattage_w: 100, quantity: 1, hours_per_day: 4, is_critical: false }]
    const l = runLoadAnalysis(nonCritical, 0.15)
    const inv = sizeInverter(nonCritical, l)
    expect(inv.inverter_continuous_w).toBeCloseTo(1.25 * l.P_run_total_adj, 5)
  })
})

describe("sizeMppt", () => {
  it("computes MPPT current with 1.25 safety over the DC bus voltage", () => {
    const pv = { P_pv_actual_kw: 3.1 } as PvArrayResult
    const mppt = sizeMppt(pv, SITE)
    expect(mppt.P_pv_watts).toBe(3100)
    expect(mppt.I_mppt).toBeCloseTo(80.73, 1) // 1.25 × 3100 / 48
  })
})

describe("baseline & after-solar costs", () => {
  const load = runLoadAnalysis(DEVICES, 0.15)
  const battery = sizeBattery(FACILITY, SITE, PARAMS, load)
  const pv = sizePvArray(FACILITY, SITE, PARAMS, load)

  it("baseline = grid bill + diesel (litres × price × 30)", () => {
    const base = calculateBaselineCosts(FACILITY)
    expect(base.diesel_cost_monthly).toBe(900_000) // 10 × 3000 × 30
    expect(base.baseline_cost_monthly).toBe(1_100_000) // + 200k grid
  })

  it("reduces grid and diesel spend after solar for a hybrid facility", () => {
    const after = calculateAfterSolarCosts(FACILITY, SITE, load, battery, pv)
    expect(after.solar_offset).toBeCloseTo(1.0754, 3)
    expect(after.grid_reduction).toBeCloseTo(0.7528, 3) // min(0.9, offset×0.7)
    expect(after.diesel_reduction).toBe(0.95) // capped
    expect(after.total_after_solar_monthly).toBeCloseTo(94_445, 0)
  })

  it("eliminates grid & diesel entirely for off-grid", () => {
    const offGrid: FacilityDataInput = { ...FACILITY, facility_type: "off_grid" }
    const b = sizeBattery(offGrid, SITE, PARAMS, load)
    const p = sizePvArray(offGrid, SITE, PARAMS, load)
    const after = calculateAfterSolarCosts(offGrid, SITE, load, b, p)
    expect(after.grid_reduction).toBe(1)
    expect(after.diesel_reduction).toBe(1)
    expect(after.total_after_solar_monthly).toBe(0)
  })

  it("savings = baseline − after-solar total", () => {
    const after = calculateAfterSolarCosts(FACILITY, SITE, load, battery, pv)
    const savings = calculateSavings(FACILITY, after)
    expect(savings.gross_monthly_savings).toBeCloseTo(1_005_555, 0)
  })
})

describe("compareFinancingOptions", () => {
  const savings = { gross_monthly_savings: 1_005_555 }

  it("selects the smallest package that covers the array and derives paybacks", () => {
    const pv = { P_pv_actual_kw: 3.1 } as PvArrayResult
    const fin = compareFinancingOptions(pv, PRICING, savings)
    expect(fin.selected_pricing?.system_size_kw).toBe(5)
    expect(fin.cash_payback_months).toBeCloseTo(13.92, 1) // 14M / gross
    expect(fin.installment_net_savings_monthly).toBeCloseTo(555_555, 0)
    expect(fin.installment_breakeven_months).toBeCloseTo(9.0, 1)
    expect(fin.eaas_net_savings_monthly).toBeCloseTo(405_555, 0)
  })

  it("returns all-null when the pricing table is empty", () => {
    const pv = { P_pv_actual_kw: 3.1 } as PvArrayResult
    const fin = compareFinancingOptions(pv, [], savings)
    expect(fin.selected_pricing).toBeNull()
    expect(fin.cash_payback_months).toBeNull()
  })

  it("returns all-null when the array size is non-positive", () => {
    const pv = { P_pv_actual_kw: 0 } as PvArrayResult
    const fin = compareFinancingOptions(pv, PRICING, savings)
    expect(fin.selected_pricing).toBeNull()
  })

  it("leaves cash payback null when there are no savings", () => {
    const pv = { P_pv_actual_kw: 3.1 } as PvArrayResult
    const fin = compareFinancingOptions(pv, PRICING, { gross_monthly_savings: 0 })
    expect(fin.cash_payback_months).toBeNull()
    expect(fin.selected_pricing?.system_size_kw).toBe(5)
  })

  it("falls back to the largest package when none is big enough", () => {
    const pv = { P_pv_actual_kw: 99 } as PvArrayResult
    const fin = compareFinancingOptions(pv, PRICING, savings)
    expect(fin.selected_pricing?.system_size_kw).toBe(5) // largest available
  })
})

describe("runFullSizing", () => {
  it("wires every stage together into one coherent result", () => {
    const result = runFullSizing(DEVICES, FACILITY, SITE, PARAMS, PRICING)
    // spot-check that each stage ran and is internally consistent
    expect(result.load.P_run_total).toBe(1000)
    expect(result.pv.panels_required).toBe(5)
    expect(result.inverter.surge_required_w).toBe(2000)
    expect(result.baseline.baseline_cost_monthly).toBe(1_100_000)
    expect(result.savings.gross_monthly_savings).toBeGreaterThan(0)
    expect(result.financing.selected_pricing?.system_size_kw).toBe(5)
    // the after-solar total must be strictly cheaper than the baseline
    expect(result.afterSolar.total_after_solar_monthly).toBeLessThan(
      result.baseline.baseline_cost_monthly,
    )
  })

  it("honours a custom growth margin", () => {
    const result = runFullSizing(DEVICES, FACILITY, SITE, { growth_margin: 0 }, PRICING)
    expect(result.load.E_day_total_adj).toBeCloseTo(9.4, 5) // no uplift
  })
})
