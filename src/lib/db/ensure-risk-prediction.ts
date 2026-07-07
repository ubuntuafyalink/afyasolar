import { sql } from "drizzle-orm"
import { db } from "./index"

let ensured = false

/**
 * Create `facility_risk_prediction` if missing (idempotent, safe for TiDB/MySQL).
 * Stores each disruption-risk-model output so predictions can later be joined to
 * realized outcomes and the coefficients fit (risk-v1-fitted-*). See
 * docs/RISK_PREDICTION_METHODOLOGY.md. Run via `npm run db:ensure-risk-prediction`;
 * also invoked by the monthly climate refresh before it logs predictions.
 */
export async function ensureRiskPrediction(): Promise<void> {
  if (ensured) return
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS \`facility_risk_prediction\` (
      \`id\` VARCHAR(36) NOT NULL,
      \`facility_id\` VARCHAR(36) NOT NULL,
      \`scored_at\` DATETIME NOT NULL,
      \`version\` VARCHAR(32) NOT NULL,
      \`probability\` DECIMAL(6,4) NOT NULL,
      \`tier\` VARCHAR(20) NOT NULL,
      \`features\` TEXT NULL,
      \`completeness\` DECIMAL(5,4) NULL,
      \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      KEY \`frp_facility_idx\` (\`facility_id\`),
      KEY \`frp_scored_idx\` (\`scored_at\`)
    )
  `)
  ensured = true
}
