/**
 * Portfolio-level AI climate forecast: forecast each facility (via the AI service
 * /predict/climate, Chronos zero-shot) and facility-weight-average the hazard
 * outlook. Mirrors portfolio-climate-server.ts — cost is driven by DISTINCT
 * coordinates (deduped by rounded lat/lon), run with bounded concurrency; a
 * failed coordinate degrades only its facilities.
 */
import { getRawConnection } from "@/lib/db"
import type { RowDataPacket } from "mysql2"

import { REGION_COORDS, DEFAULT_COORDS, type Coords } from "@/lib/climate/nasa-power"
import { fetchAiClimateForecastServer } from "./ai-forecast-server"
import type { AiHazards, HazardTrajectoryPoint } from "./ai-forecast-service"

type HazardKeys = { heat: number; flood: number; storm: number; drought: number }

export type FacilityForecast = {
  facilityId: string
  region: string | null
  lat: number
  lon: number
  hazards: HazardKeys & { composite: number }
  degraded: boolean
}

export type PortfolioForecastAggregate = {
  byHazard: HazardKeys
  composite: number
  trajectory: HazardTrajectoryPoint[]
  facilitiesForecast: number
  modelName?: string
}

export type PortfolioForecastResult = {
  data: FacilityForecast[]
  aggregate: PortfolioForecastAggregate
}

type FacilityRow = RowDataPacket & {
  id: string
  region: string | null
  latitude: unknown
  longitude: unknown
}

function resolveFacilityCoords(row: FacilityRow): Coords {
  const lat = row.latitude != null && row.latitude !== "" ? Number(row.latitude) : NaN
  const lon = row.longitude != null && row.longitude !== "" ? Number(row.longitude) : NaN
  if (!Number.isNaN(lat) && !Number.isNaN(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
    return { lat, lon }
  }
  if (row.region && REGION_COORDS[row.region]) return REGION_COORDS[row.region]
  return DEFAULT_COORDS
}

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

type CoordForecast = {
  hazards: (HazardKeys & { composite: number }) | null
  trajectory: HazardTrajectoryPoint[]
  degraded: boolean
  modelName?: string
}

export async function computePortfolioForecast(months?: number): Promise<PortfolioForecastResult> {
  const pool = getRawConnection()
  const [rows] = await pool.query<FacilityRow[]>(
    `SELECT id, region, latitude, longitude FROM facilities ORDER BY name ASC`,
  )
  const facilities = rows || []

  const resolved = facilities.map((f) => {
    const coords = resolveFacilityCoords(f)
    const key = `${coords.lat.toFixed(2)},${coords.lon.toFixed(2)}`
    return { facility: f, coords, key }
  })

  const uniqueKeys = [...new Set(resolved.map((r) => r.key))]
  const keyToCoords = new Map<string, Coords>()
  for (const r of resolved) if (!keyToCoords.has(r.key)) keyToCoords.set(r.key, r.coords)

  const byKey = new Map<string, CoordForecast>()
  // CPU inference on the AI service: keep concurrency low.
  await mapWithConcurrency(uniqueKeys, 3, async (key) => {
    const coords = keyToCoords.get(key)!
    try {
      const f = await fetchAiClimateForecastServer({ lat: coords.lat, lon: coords.lon, horizon: "monthly", months })
      const h: AiHazards = f.hazards
      byKey.set(key, {
        hazards: { heat: h.heat, flood: h.flood, storm: h.storm, drought: h.drought, composite: h.composite },
        trajectory: f.hazards_monthly ?? [],
        degraded: false,
        modelName: f.model_name,
      })
    } catch {
      byKey.set(key, { hazards: null, trajectory: [], degraded: true })
    }
  })

  const data: FacilityForecast[] = resolved.map((r) => {
    const c = byKey.get(r.key)!
    return {
      facilityId: r.facility.id,
      region: r.facility.region,
      lat: r.coords.lat,
      lon: r.coords.lon,
      hazards: c.hazards ?? { heat: 0, flood: 0, storm: 0, drought: 0, composite: 0 },
      degraded: c.degraded,
    }
  })

  // Facility-weighted aggregate over non-degraded facilities.
  let n = 0
  const sum = { heat: 0, flood: 0, storm: 0, drought: 0, composite: 0 }
  // Trajectory accumulator, aligned by step index.
  const stepAcc: { ts: string; heat: number; flood: number; storm: number; drought: number; n: number }[] = []
  for (const r of resolved) {
    const c = byKey.get(r.key)!
    if (c.degraded || !c.hazards) continue
    n += 1
    sum.heat += c.hazards.heat
    sum.flood += c.hazards.flood
    sum.storm += c.hazards.storm
    sum.drought += c.hazards.drought
    sum.composite += c.hazards.composite
    c.trajectory.forEach((p, i) => {
      const a = stepAcc[i] ?? { ts: p.timestamp, heat: 0, flood: 0, storm: 0, drought: 0, n: 0 }
      a.heat += p.heat
      a.flood += p.flood
      a.storm += p.storm
      a.drought += p.drought
      a.n += 1
      stepAcc[i] = a
    })
  }

  const trajectory: HazardTrajectoryPoint[] = stepAcc.map((a) => ({
    timestamp: a.ts,
    heat: Math.round(a.heat / a.n),
    flood: Math.round(a.flood / a.n),
    storm: Math.round(a.storm / a.n),
    drought: Math.round(a.drought / a.n),
  }))

  const aggregate: PortfolioForecastAggregate = {
    byHazard: n
      ? {
          heat: Math.round(sum.heat / n),
          flood: Math.round(sum.flood / n),
          storm: Math.round(sum.storm / n),
          drought: Math.round(sum.drought / n),
        }
      : { heat: 0, flood: 0, storm: 0, drought: 0 },
    composite: n ? Math.round(sum.composite / n) : 0,
    trajectory,
    facilitiesForecast: n,
    modelName: [...byKey.values()].find((c) => !c.degraded && c.modelName)?.modelName,
  }

  return { data, aggregate }
}
