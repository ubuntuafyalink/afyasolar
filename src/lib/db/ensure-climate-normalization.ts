import { sql } from "drizzle-orm"
import { db } from "./index"

let ensured = false

/**
 * Add the `normalization_version` column to `facility_climate_profile` so persisted
 * hazard scores record which climate normalization formula produced them (see
 * NORMALIZATION_VERSION in src/lib/climate/nasa-power.ts). Existing rows default to
 * 'v1'; the portfolio climate refresh restamps them to the current version.
 *
 * Idempotent: a duplicate-column error (MySQL 1060) on re-run is swallowed. Run via
 * `npm run db:ensure-climate-normalization`.
 */
export async function ensureClimateNormalization(): Promise<void> {
  if (ensured) return
  try {
    await db.execute(
      sql`ALTER TABLE \`facility_climate_profile\` ADD COLUMN \`normalization_version\` VARCHAR(8) NOT NULL DEFAULT 'v1'`,
    )
  } catch (e) {
    // 1060 = duplicate column: already applied. Anything else is a real error.
    const code = (e as { errno?: number; code?: string })?.errno
    const codeStr = (e as { code?: string })?.code
    if (code !== 1060 && codeStr !== "ER_DUP_FIELDNAME") throw e
  }
  ensured = true
}
