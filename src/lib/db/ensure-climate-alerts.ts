import { sql } from "drizzle-orm"
import { db } from "./index"

let ensured = false

/**
 * Relax the device_alerts.device_id NOT NULL constraint so facility-level climate
 * alerts (not tied to a specific device) can be written with device_id = NULL.
 * Idempotent MODIFY re-running it is a no-op. Safe for TiDB / MySQL.
 *
 * Run via `npm run db:ensure-climate-alerts` (or it is invoked on demand by the
 * climate alert scan path). Until this runs, the scan degrades gracefully and
 * simply skips device-less facilities.
 */
export async function ensureClimateAlerts(): Promise<void> {
  if (ensured) return
  await db.execute(sql`ALTER TABLE \`device_alerts\` MODIFY \`device_id\` VARCHAR(36) NULL`)
  ensured = true
}
