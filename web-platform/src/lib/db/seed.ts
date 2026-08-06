/**
 * Telemetry seeder — populates device_telemetry / device_health with deterministic,
 * clearly-labeled SEED data so the (otherwise empty) device dashboards and the
 * passive telemetry receivers have something to render during development and demos.
 *
 * This is NOT live inverter data. Every row is tagged (firmwareVersion "seed-v1",
 * location "seed") and every seeded device id is prefixed "seed-" so real ingestion
 * (via /api/devices/telemetry) is never confused with it. Re-running is idempotent:
 * prior seed rows for each facility are removed first.
 *
 *   npm run db:seed
 */

// Load environment variables FIRST (same pattern as create-admin.ts).
import * as fs from "fs"
import * as path from "path"

try {
  require("dotenv").config()
} catch {
  const envPath = path.join(process.cwd(), ".env")
  if (fs.existsSync(envPath)) {
    const envFile = fs.readFileSync(envPath, "utf-8")
    envFile.split("\n").forEach((line) => {
      const t = line.trim()
      if (t && !t.startsWith("#")) {
        const [key, ...rest] = t.split("=")
        if (key && rest.length > 0 && !process.env[key.trim()]) {
          process.env[key.trim()] = rest.join("=").trim().replace(/^["']|["']$/g, "")
        }
      }
    })
  }
}

import { drizzle } from "drizzle-orm/mysql2"
import mysql from "mysql2/promise"
import { eq, like } from "drizzle-orm"
import { randomUUID } from "crypto"
import * as schema from "./schema"
import { deviceTelemetry, deviceHealth, type DeviceTelemetry } from "./schema-telemetry"

// ---------------------------------------------------------------------------
// Pure, deterministic generation (unit-tested in seed.test.ts)
// ---------------------------------------------------------------------------

/** Stable hash of a string into the half-open unit interval [0, 1). */
export function seededUnit(key: string): number {
  let h = 2166136261
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  // >>> 0 -> unsigned; divide by 2^32
  return ((h >>> 0) % 100000) / 100000
}

/** Solar availability factor for an hour of day (0 at night, ~1 at noon). */
export function solarFactor(hourOfDay: number): number {
  const x = (hourOfDay - 6) / 12
  if (x <= 0 || x >= 1) return 0
  return Math.sin(x * Math.PI)
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

export type SeedRowInput = {
  id: string
  deviceId: string
  facilityId: string
  timestamp: Date
  systemSizeKw: number
}

/**
 * Build one deterministic device_telemetry insert row. Values follow a simple
 * diurnal solar/load model and are stable for a given (deviceId, hour). Marked
 * as seed data via firmwareVersion/location.
 */
export function buildSeedTelemetryRow(input: SeedRowInput): DeviceTelemetry {
  const { id, deviceId, facilityId, timestamp, systemSizeKw } = input
  const hour = timestamp.getHours()
  const u = seededUnit(`${deviceId}:${hour}`)
  const sun = solarFactor(hour)

  const sizeW = Math.max(1, systemSizeKw) * 1000
  const loadW = sizeW * (0.18 + 0.32 * u)
  const solarKwh = round2(Math.max(0, systemSizeKw) * sun * (0.7 + 0.2 * u))
  const voltage = 228 + 7 * u
  const current = round2(loadW / voltage)
  const batteryLevel = round2(Math.max(35, Math.min(98, 45 + 45 * sun + 8 * u)))
  const temperature = round2(22 + 10 * sun + 3 * u)
  const efficiency = round2(80 + 15 * u)

  return {
    id,
    deviceId,
    facilityId,
    timestamp,
    voltage: voltage.toFixed(2),
    current: current.toFixed(2),
    power: round2(loadW).toFixed(2),
    energy: round2(loadW / 1000).toFixed(2),
    frequency: (49.9 + 0.2 * u).toFixed(2),
    solarGeneration: solarKwh.toFixed(2),
    batteryLevel: batteryLevel.toFixed(2),
    batteryVoltage: round2(48 + 4 * (batteryLevel / 100)).toFixed(2),
    temperature: temperature.toFixed(2),
    gridStatus: "connected",
    deviceStatus: "normal",
    signalStrength: -60 - Math.round(20 * u),
    uptime: (100 + 10 * u).toFixed(2),
    efficiency: efficiency.toFixed(2),
    powerFactor: (0.9 + 0.09 * u).toFixed(2),
    alertCode: null,
    alertMessage: null,
    firmwareVersion: "seed-v1",
    location: "seed",
  }
}

function parseSystemSizeKw(raw: unknown): number {
  if (raw == null) return 5
  const m = String(raw).match(/([\d.]+)/)
  const n = m ? Number(m[1]) : NaN
  return Number.isFinite(n) && n > 0 ? n : 5
}

/** Number of trailing hourly telemetry points to seed per device. */
const HOURS_TO_SEED = 48

// ---------------------------------------------------------------------------
// DB orchestration
// ---------------------------------------------------------------------------

function getSSLConfig() {
  if (process.env.DB_SSL !== "true") return undefined
  const caPath = process.env.DB_CA_PATH
  if (caPath && fs.existsSync(caPath)) {
    return { ca: fs.readFileSync(caPath), rejectUnauthorized: true }
  }
  return { rejectUnauthorized: false }
}

async function seed() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "4000"),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "afya_solar",
    ssl: getSSLConfig(),
    connectTimeout: 60000,
  })

  try {
    const db = drizzle(connection, { schema, mode: "default" })

    const facilityRows = await db
      .select({ id: schema.facilities.id, name: schema.facilities.name, systemSize: schema.facilities.systemSize })
      .from(schema.facilities)

    if (!facilityRows.length) {
      console.log("No facilities found — nothing to seed. Create facilities first.")
      return
    }

    console.log(`Seeding telemetry for ${facilityRows.length} facilities (${HOURS_TO_SEED}h each)...`)
    const now = new Date()
    const msPerHour = 60 * 60 * 1000
    let totalRows = 0

    for (const f of facilityRows) {
      const shortId = f.id.replace(/-/g, "").slice(0, 12)
      const deviceId = `seed-${shortId}`
      const serialNumber = `SEED-${shortId}`.slice(0, 20)
      const systemSizeKw = parseSystemSizeKw(f.systemSize)

      // Idempotency: clear any prior seed rows for this device.
      await db.delete(deviceTelemetry).where(eq(deviceTelemetry.deviceId, deviceId))
      await db.delete(deviceHealth).where(eq(deviceHealth.deviceId, deviceId))

      // Ensure a device record exists (seed type marker).
      await db
        .insert(schema.devices)
        .values({
          id: deviceId,
          serialNumber,
          type: "afyasolar",
          facilityId: f.id,
          status: "active",
          lastUpdate: now,
        })
        .onDuplicateKeyUpdate({ set: { lastUpdate: now, facilityId: f.id } })

      const rows: DeviceTelemetry[] = []
      for (let i = HOURS_TO_SEED - 1; i >= 0; i--) {
        const ts = new Date(now.getTime() - i * msPerHour)
        rows.push(
          buildSeedTelemetryRow({ id: randomUUID(), deviceId, facilityId: f.id, timestamp: ts, systemSizeKw }),
        )
      }
      await db.insert(deviceTelemetry).values(rows)
      totalRows += rows.length

      const last = rows[rows.length - 1]
      await db.insert(deviceHealth).values({
        id: randomUUID(),
        deviceId,
        facilityId: f.id,
        onlineStatus: true,
        lastSeen: now,
        lastDataReceived: now,
        uptime: "1000.00",
        downtime: "12.00",
        efficiency: last.efficiency ?? "90.00",
        avgEfficiency: "88.00",
        batteryHealth: "92.00",
        temperatureAvg: last.temperature ?? "28.00",
        errorCount: 0,
        warningCount: 0,
        maintenanceDue: false,
        model: "AfyaSolar Seed Unit",
        manufacturer: "AfyaSolar",
        firmwareVersion: "seed-v1",
        createdAt: now,
        updatedAt: now,
      })
    }

    console.log(`✅ Seeded ${totalRows} telemetry rows + ${facilityRows.length} health records (labeled seed-v1).`)
  } finally {
    await connection.end()
  }
}

if (require.main === module) {
  seed()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("Seed failed:", error)
      process.exit(1)
    })
}

export { seed }
