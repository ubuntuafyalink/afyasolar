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
  rangeForPreset,
  NASA_POWER_PARAMETERS,
  toCvi,
  toHazardScores,
  type Coords,
} from "@/lib/climate/nasa-power"
import { fetchNasaPowerServer } from "@/lib/climate/nasa-power-server"

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
export async function computePortfolioClimate(): Promise<FacilityClimate[]> {
  const pool = getRawConnection()
  const [rows] = await pool.query<FacilityRow[]>(
    `SELECT id, region, latitude, longitude FROM facilities ORDER BY name ASC`,
  )
  const facilities = rows || []

  const range = rangeForPreset("10y") // monthly, small payloads
  const resolved = facilities.map((f) => {
    const { coords, source } = resolveFacilityCoords(f)
    const key = `${coords.lat.toFixed(2)},${coords.lon.toFixed(2)}`
    return { facility: f, coords, source, key }
  })

  const uniqueKeys = [...new Set(resolved.map((r) => r.key))]
  const keyToCoords = new Map<string, Coords>()
  for (const r of resolved) if (!keyToCoords.has(r.key)) keyToCoords.set(r.key, r.coords)

  const climateByKey = new Map<string, CoordClimate>()
  await mapWithConcurrency(uniqueKeys, 5, async (key) => {
    const coords = keyToCoords.get(key)!
    try {
      const resp = await fetchNasaPowerServer({
        lat: coords.lat,
        lon: coords.lon,
        temporal: range.temporal,
        start: range.start,
        end: range.end,
        parameters: NASA_POWER_PARAMETERS,
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
        degraded: false,
      })
    } catch {
      climateByKey.set(key, {
        byHazard: { flood: 0, drought: 0, heat: 0, storm: 0 },
        composite: 0,
        hesScore: 0,
        topHazard: { type: "", score: 0 },
        hazardScores: [],
        degraded: true,
      })
    }
  })

  return resolved.map((r) => {
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
}
