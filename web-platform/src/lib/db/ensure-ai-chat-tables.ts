import { sql } from "drizzle-orm"
import { db } from "./index"

let ensured = false

/**
 * Creates the AI chat tables if missing (safe for TiDB / MySQL). Called from the
 * conversation API routes on demand; idempotent for the app lifecycle.
 */
export async function ensureAiChatTables(): Promise<void> {
  if (ensured) return

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS \`ai_conversations\` (
      \`id\` VARCHAR(36) NOT NULL,
      \`user_id\` VARCHAR(36) NOT NULL,
      \`facility_id\` VARCHAR(36) NULL,
      \`title\` VARCHAR(200) NULL,
      \`message_count\` INT NOT NULL DEFAULT 0,
      \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      KEY \`aic_user_idx\` (\`user_id\`),
      KEY \`aic_updated_idx\` (\`updated_at\`)
    )
  `)

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS \`ai_messages\` (
      \`id\` VARCHAR(36) NOT NULL,
      \`conversation_id\` VARCHAR(36) NOT NULL,
      \`user_id\` VARCHAR(36) NOT NULL,
      \`role\` VARCHAR(20) NOT NULL,
      \`content\` TEXT NOT NULL,
      \`provider\` VARCHAR(50) NULL,
      \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      KEY \`aim_conversation_idx\` (\`conversation_id\`),
      KEY \`aim_user_idx\` (\`user_id\`)
    )
  `)

  ensured = true
}
