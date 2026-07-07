import { sql } from "drizzle-orm"
import { db } from "./index"

let ensured = false

/**
 * Create `facility_eeat_assessment` if missing (idempotent, TiDB/MySQL). Stores the
 * persisted ISO-50001 Energy Efficiency Assessment (MEUs, baseline, 4-point score)
 * per facility. Run via `npm run db:ensure-eeat`; also invoked on demand by the
 * EEAT save/load API.
 */
export async function ensureEeat(): Promise<void> {
  if (ensured) return
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS \`facility_eeat_assessment\` (
      \`facility_id\` VARCHAR(36) NOT NULL,
      \`data\` TEXT NOT NULL,
      \`raw_score\` DECIMAL(5,1) NULL,
      \`bmi_percent\` DECIMAL(5,2) NULL,
      \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (\`facility_id\`)
    )
  `)
  ensured = true
}
