/**
 * Portfolio-level predictive maintenance: run the AI maintenance models for every
 * facility (keyed to its real age + installed kW) and aggregate a "facilities at
 * risk" view. Mirrors portfolio-forecast-server.ts (bounded concurrency + degrade).
 * Reads facilities + afyasolar_subscribers only — no writes.
 */
import { getRawConnection } from "@/lib/db"
import type { RowDataPacket } from "mysql2"

import { fetchAiMaintenanceServer } from "./maintenance-server"

export type FacilityMaintenance = {
  facilityId: string
  name: string
  rulDays: number
  status: "critical" | "warning" | "healthy"
  anomalies: number
  degraded: boolean
}

export type PortfolioMaintenanceAggregate = {
  facilitiesForecast: number
  facilitiesAtRisk: number
  totalAnomalies: number
  avgRulDays: number
}

export type PortfolioMaintenanceResult = {
  data: FacilityMaintenance[]
  aggregate: PortfolioMaintenanceAggregate
}

type FacilityRow = RowDataPacket & { id: string; name: string }
type SubRow = RowDataPacket & {
  facility_id: string
  package_rated_kw: unknown
  installation_date: unknown
  subscription_start_date: unknown
}

const DAY_MS = 86_400_000
const DEFAULT_AGE_DAYS = 400
const DEFAULT_SYSTEM_KW = 5

function ageDaysFrom(sub?: SubRow): number {
  const raw = sub?.installation_date || sub?.subscription_start_date
  const t = raw ? new Date(raw as string).getTime() : NaN
  if (Number.isNaN(t)) return DEFAULT_AGE_DAYS
  return Math.max(1, Math.floor((Date.now() - t) / DAY_MS))
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

export async function computePortfolioMaintenance(): Promise<PortfolioMaintenanceResult> {
  const pool = getRawConnection()
  const [facRows] = await pool.query<FacilityRow[]>(
    `SELECT id, name FROM facilities ORDER BY name ASC`,
  )
  const [subRows] = await pool.query<SubRow[]>(
    `SELECT facility_id, package_rated_kw, installation_date, subscription_start_date
       FROM afyasolar_subscribers`,
  )
  const subByFacility = new Map<string, SubRow>()
  for (const s of subRows || []) if (!subByFacility.has(s.facility_id)) subByFacility.set(s.facility_id, s)

  const facilities = facRows || []
  const data = await mapWithConcurrency<FacilityRow, FacilityMaintenance>(facilities, 3, async (f) => {
    const sub = subByFacility.get(f.id)
    const systemKw = sub?.package_rated_kw != null ? Number(sub.package_rated_kw) : DEFAULT_SYSTEM_KW
    try {
      const m = await fetchAiMaintenanceServer({
        facilityId: f.id, ageDays: ageDaysFrom(sub), systemKw: systemKw || DEFAULT_SYSTEM_KW,
      })
      return {
        facilityId: f.id,
        name: f.name,
        rulDays: Math.max(0, Math.round(m.rul.rul_days)),
        status: m.health.status,
        anomalies: m.anomaly.n,
        degraded: false,
      }
    } catch {
      return { facilityId: f.id, name: f.name, rulDays: 0, status: "healthy", anomalies: 0, degraded: true }
    }
  })

  const ok = data.filter((d) => !d.degraded)
  const atRisk = ok.filter((d) => d.status !== "healthy").length
  const totalAnomalies = ok.reduce((s, d) => s + d.anomalies, 0)
  const avgRulDays = ok.length ? Math.round(ok.reduce((s, d) => s + d.rulDays, 0) / ok.length) : 0

  // Sort most-at-risk first (lowest RUL).
  data.sort((a, b) => a.rulDays - b.rulDays)

  return {
    data,
    aggregate: {
      facilitiesForecast: ok.length,
      facilitiesAtRisk: atRisk,
      totalAnomalies,
      avgRulDays,
    },
  }
}
