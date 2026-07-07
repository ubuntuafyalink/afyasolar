/**
 * Shared server-side computation of per-facility NASA POWER climate exposure for
 * the admin portfolio. Used by:
 *  - GET /api/admin/intelligence/portfolio-climate (the dashboard data), and
 *  - POST /api/admin/intelligence/generate-alerts (the alert engine),
 * so both share one coordinate-deduped, bounded-concurrency NASA path.
 */
import { getRawConnection } from "@/lib/db"
import type { RowDataPacket } from "mysql2"
import {
  REGION_COORDS,
  DEFAULT_COORDS,
  climatologyRange,
  NASA_POWER_PARAMETERS,
  SOLAR_PARAMETERS,
  toCvi,
  toHazardScores,
  toHazardTrend,
  toSolarResource,
  type Coords,
  type SolarResource,
} from "@/lib/climate/nasa-power"
import { fetchNasaPowerServer } from "@/lib/climate/nasa-power-server"
import type { HazardTrendPoint } from "@/lib/dashboard/facility-demo-data"

/** Portfolio-level climate aggregate (facility-weighted averages). */
export type PortfolioClimateAggregate = {
  /** Per-year average hazard indices across facilities with climate. */
  trend: HazardTrendPoint[]
  byHazard: { flood: number; drought: number; heat: number; storm: number }
  composite: number
  facilitiesWithClimate: number
}

export type PortfolioClimateResult = {
  data: FacilityClimate[]
  aggregate: PortfolioClimateAggregate
}

export type CoordsSource = "facility" | "region" | "default"

export type FacilityClimate = {
  facilityId: string
  region: string | null
  lat: number
  lon: number
  coordsSource: CoordsSource
  byHazard: { flood: number; drought: number; heat: number; storm: number }
  composite: number
  hesScore: number
  topHazard: { type: string; score: number }
  hazardScores: { type: string; score: number; trend: string; note: string }[]
  /** Solar resource (peak-sun-hours) at the facility, for modeled generation. Null when unavailable. */
  solar: SolarResource | null
  degraded: boolean
}

type FacilityRow = RowDataPacket & {
  id: string
  region: string | null
  latitude: unknown
  longitude: unknown
}

function resolveFacilityCoords(row: FacilityRow): { coords: Coords; source: CoordsSource } {
  const lat = row.latitude != null && row.latitude !== "" ? Number(row.latitude) : NaN
  const lon = row.longitude != null && row.longitude !== "" ? Number(row.longitude) : NaN
  if (!Number.isNaN(lat) && !Number.isNaN(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
    return { coords: { lat, lon }, source: "facility" }
  }
  if (row.region && REGION_COORDS[row.region]) {
    return { coords: REGION_COORDS[row.region], source: "region" }
  }
  return { coords: DEFAULT_COORDS, source: "default" }
}

/** Run async work over items with a fixed concurrency cap (no deps). */
async function mapWithConcurrency<T, R>(items: T[], limit: number, worker: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length)
  let next = 0
  async function run() {
    while (next < items.length) {
      const i = next++
      results[i] = await worker(items[i])
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run))
  return results
}

type CoordClimate = Omit<FacilityClimate, "facilityId" | "region" | "lat" | "lon" | "coordsSource">

/**
 * Compute real NASA POWER hazard exposure for every facility. Cost is driven by
 * DISTINCT coordinates, not facility count: fetches are deduped by rounded
 * lat/lon, run with bounded concurrency, and reuse the shared 6h upstream cache.
 * A failed coordinate degrades only its facilities (degraded:true).
 */
export async function computePortfolioClimate(): Promise<PortfolioClimateResult> {
  const pool = getRawConnection()
  const [rows] = await pool.query<FacilityRow[]>(
    `SELECT id, region, latitude, longitude FROM facilities ORDER BY name ASC`,
  )
  const facilities = rows || []

  const range = climatologyRange() // ~30y monthly baseline for v2 anomaly calibration
  const resolved = facilities.map((f) => {
    const { coords, source } = resolveFacilityCoords(f)
    const key = `${coords.lat.toFixed(2)},${coords.lon.toFixed(2)}`
    return { facility: f, coords, source, key }
  })

  const uniqueKeys = [...new Set(resolved.map((r) => r.key))]
  const keyToCoords = new Map<string, Coords>()
  for (const r of resolved) if (!keyToCoords.has(r.key)) keyToCoords.set(r.key, r.coords)

  const climateByKey = new Map<string, CoordClimate>()
  // Per-coordinate multi-year trend, kept separate so it is NOT spread into the
  // per-facility payload (only the portfolio aggregate uses it).
  const trendByKey = new Map<string, HazardTrendPoint[]>()
  await mapWithConcurrency(uniqueKeys, 5, async (key) => {
    const coords = keyToCoords.get(key)!
    try {
      const resp = await fetchNasaPowerServer({
        lat: coords.lat,
        lon: coords.lon,
        temporal: range.temporal,
        start: range.start,
        end: range.end,
        parameters: [...NASA_POWER_PARAMETERS, ...SOLAR_PARAMETERS],
      })
      const cvi = toCvi(resp)
      const hazardScores = toHazardScores(resp)
      const topHazard = hazardScores.reduce(
        (max, h) => (h.score > max.score ? { type: h.type, score: h.score } : max),
        { type: hazardScores[0]?.type ?? "", score: hazardScores[0]?.score ?? 0 },
      )
      climateByKey.set(key, {
        byHazard: cvi.byHazard,
        composite: cvi.composite,
        hesScore: Math.max(0, Math.min(100, 100 - cvi.composite)),
        topHazard,
        hazardScores,
        solar: toSolarResource(resp),
        degraded: false,
      })
      trendByKey.set(key, toHazardTrend(resp))
    } catch {
      climateByKey.set(key, {
        byHazard: { flood: 0, drought: 0, heat: 0, storm: 0 },
        composite: 0,
        hesScore: 0,
        topHazard: { type: "", score: 0 },
        hazardScores: [],
        solar: null,
        degraded: true,
      })
    }
  })

  const data = resolved.map((r) => {
    const c = climateByKey.get(r.key)!
    return {
      facilityId: r.facility.id,
      region: r.facility.region,
      lat: r.coords.lat,
      lon: r.coords.lon,
      coordsSource: r.source,
      ...c,
    }
  })

  // Facility-weighted portfolio aggregate (each facility contributes its coord's data).
  const yearAcc = new Map<number, { heat: number; flood: number; storm: number; drought: number; n: number }>()
  let compSum = 0
  let hSum = 0
  let fSum = 0
  let sSum = 0
  let dSum = 0
  let climCount = 0
  for (const r of resolved) {
    const c = climateByKey.get(r.key)!
    if (c.degraded) continue
    climCount += 1
    compSum += c.composite
    hSum += c.byHazard.heat
    fSum += c.byHazard.flood
    sSum += c.byHazard.storm
    dSum += c.byHazard.drought
    const trend = trendByKey.get(r.key)
    if (trend) {
      for (const p of trend) {
        const a = yearAcc.get(p.year) ?? { heat: 0, flood: 0, storm: 0, drought: 0, n: 0 }
        a.heat += p.heat
        a.flood += p.flood
        a.storm += p.storm
        a.drought += p.drought
        a.n += 1
        yearAcc.set(p.year, a)
      }
    }
  }
  const trend: HazardTrendPoint[] = [...yearAcc.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([year, a]) => ({
      year,
      heat: Math.round(a.heat / a.n),
      flood: Math.round(a.flood / a.n),
      storm: Math.round(a.storm / a.n),
      drought: Math.round(a.drought / a.n),
    }))
  const aggregate: PortfolioClimateAggregate = {
    trend,
    byHazard: climCount
      ? {
          heat: Math.round(hSum / climCount),
          flood: Math.round(fSum / climCount),
          storm: Math.round(sSum / climCount),
          drought: Math.round(dSum / climCount),
        }
      : { flood: 0, drought: 0, heat: 0, storm: 0 },
    composite: climCount ? Math.round(compSum / climCount) : 0,
    facilitiesWithClimate: climCount,
  }

  return { data, aggregate }
}
