/**
 * Shared climate alert scan: evaluate real NASA POWER hazard exposure per facility
 * (computePortfolioClimate) against the climate-alert rules and write real
 * device_alerts rows. Dedupes against existing active alerts (one active alert per
 * facility + code). Pass { dryRun: true } to preview without writing.
 *
 * Each climate alert is attached to the facility's primary device when it has one,
 * otherwise it is written as a facility-level alert (deviceId = null). The latter
 * requires the db:ensure-climate-alerts migration (relaxes the device_id NOT NULL
 * constraint); until it runs, device-less inserts fail and are reported as skipped
 * (noDevice) so the scan never throws.
 *
 * Used by:
 *  - POST /api/admin/intelligence/generate-alerts (admin session, the "Run climate scan" button)
 *  - GET/POST /api/cron/generate-climate-alerts    (secret-auth cron trigger)
 */
import { db } from "@/lib/db"
import { devices, facilities } from "@/lib/db/schema"
import { deviceAlerts } from "@/lib/db/schema-telemetry"
import { eq } from "drizzle-orm"
import { generateId } from "@/lib/utils"
import { computePortfolioClimate } from "@/lib/climate/portfolio-climate-server"
import { evaluateClimateAlerts } from "@/lib/intelligence/climate-alert-rules"

export type ClimateAlertScanResult = {
  success: true
  dryRun: boolean
  scanned: number
  created: number
  skipped: { duplicate: number; noDevice: number }
  items: { facilityId: string; code: string; severity: string; title: string }[]
}

export async function runClimateAlertScan(
  opts: { dryRun?: boolean } = {},
): Promise<ClimateAlertScanResult> {
  const dryRun = Boolean(opts.dryRun)

  const [{ data: climate }, facilityRows, deviceRows, activeAlerts] = await Promise.all([
    computePortfolioClimate(),
    db.select({ id: facilities.id, name: facilities.name }).from(facilities),
    db.select({ id: devices.id, facilityId: devices.facilityId, status: devices.status }).from(devices),
    db
      .select({ facilityId: deviceAlerts.facilityId, code: deviceAlerts.code })
      .from(deviceAlerts)
      .where(eq(deviceAlerts.status, "active")),
  ])

  const nameById = new Map(facilityRows.map((f) => [f.id, f.name]))

  // Primary device per facility: prefer an active device, else any device.
  const deviceByFacility = new Map<string, string>()
  for (const d of deviceRows) {
    if (!d.facilityId) continue
    const existing = deviceByFacility.get(d.facilityId)
    if (!existing || d.status === "active") deviceByFacility.set(d.facilityId, d.id)
  }

  // Active dedupe set: one active alert per facility + code.
  const activeSet = new Set(activeAlerts.map((a) => `${a.facilityId}:${a.code}`))

  const now = new Date()
  const created: { facilityId: string; code: string; severity: string; title: string }[] = []
  let scanned = 0
  let duplicate = 0
  let noDevice = 0

  for (const c of climate) {
    if (c.degraded) continue
    scanned += 1
    const facilityName = nameById.get(c.facilityId) ?? "this facility"
    const candidates = evaluateClimateAlerts(c.byHazard, facilityName)
    if (candidates.length === 0) continue

    // A primary device when the facility has one; otherwise null so the alert is
    // written at the facility level (climate hazards are not device-specific).
    const deviceId = deviceByFacility.get(c.facilityId) ?? null
    for (const cand of candidates) {
      const key = `${c.facilityId}:${cand.code}`
      if (activeSet.has(key)) {
        duplicate += 1
        continue
      }
      activeSet.add(key) // avoid duplicates within this run
      if (!dryRun) {
        try {
          await db.insert(deviceAlerts).values({
            id: generateId(),
            deviceId,
            facilityId: c.facilityId,
            alertType: cand.alertType,
            severity: cand.severity,
            code: cand.code,
            title: cand.title,
            message: cand.message,
            status: "active",
            threshold: String(cand.threshold),
            actualValue: String(cand.score),
            alertData: JSON.stringify({ source: "climate-engine", hazard: cand.hazard, score: cand.score }),
            triggeredAt: now,
          })
        } catch (e) {
          // Most likely the device_id NOT NULL constraint (device-less facility,
          // before db:ensure-climate-alerts has run). Degrade gracefully.
          activeSet.delete(key)
          if (!deviceId) noDevice += 1
          console.warn("[run-climate-alert-scan] insert skipped", c.facilityId, cand.code, e)
          continue
        }
      }
      created.push({
        facilityId: c.facilityId,
        code: cand.code,
        severity: cand.severity,
        title: cand.title,
      })
    }
  }

  return {
    success: true,
    dryRun,
    scanned,
    created: created.length,
    skipped: { duplicate, noDevice },
    items: created,
  }
}
