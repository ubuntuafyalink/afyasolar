import { sql } from "drizzle-orm"
import { db } from "./index"
import { generateId } from "@/lib/utils"

let ensured = false

/**
 * Creates the Afya Solar admin sub-panel tables if missing (safe for TiDB / MySQL).
 * Backs the System (users/logs/config) and Support (tickets/responses) panels.
 * Called from API routes on demand; idempotent.
 */
export async function ensureAdminTables(): Promise<void> {
  if (ensured) return

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS \`afyasolar_admin_users\` (
      \`id\` VARCHAR(36) NOT NULL,
      \`name\` VARCHAR(255) NOT NULL,
      \`email\` VARCHAR(255) NOT NULL,
      \`role\` VARCHAR(20) NOT NULL,
      \`status\` VARCHAR(20) NOT NULL DEFAULT 'active',
      \`last_login\` TIMESTAMP NULL,
      \`permissions\` JSON NULL,
      \`created_at\` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
      \`updated_at\` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`afyasolar_admin_users_email\` (\`email\`),
      KEY \`idx_admin_users_role\` (\`role\`),
      KEY \`idx_admin_users_status\` (\`status\`)
    )
  `)

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS \`afyasolar_system_logs\` (
      \`id\` VARCHAR(36) NOT NULL,
      \`level\` VARCHAR(20) NOT NULL,
      \`category\` VARCHAR(50) NOT NULL,
      \`message\` TEXT NOT NULL,
      \`user_id\` VARCHAR(64) NULL,
      \`ip_address\` VARCHAR(64) NULL,
      \`metadata\` JSON NULL,
      \`created_at\` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      KEY \`idx_system_logs_level\` (\`level\`),
      KEY \`idx_system_logs_category\` (\`category\`),
      KEY \`idx_system_logs_created\` (\`created_at\`)
    )
  `)

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS \`afyasolar_admin_configs\` (
      \`id\` VARCHAR(36) NOT NULL,
      \`category\` VARCHAR(30) NOT NULL,
      \`config_key\` VARCHAR(150) NOT NULL,
      \`config_value\` TEXT NULL,
      \`description\` TEXT NULL,
      \`type\` VARCHAR(20) NOT NULL DEFAULT 'string',
      \`options\` JSON NULL,
      \`created_at\` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
      \`updated_at\` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      KEY \`idx_admin_configs_category\` (\`category\`)
    )
  `)

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS \`afyasolar_support_tickets\` (
      \`id\` VARCHAR(36) NOT NULL,
      \`ticket_number\` VARCHAR(50) NOT NULL,
      \`facility_id\` VARCHAR(36) NOT NULL,
      \`facility_name\` VARCHAR(255) NULL,
      \`subject\` VARCHAR(255) NOT NULL,
      \`description\` TEXT NOT NULL,
      \`category\` VARCHAR(30) NOT NULL DEFAULT 'general',
      \`priority\` VARCHAR(20) NOT NULL DEFAULT 'medium',
      \`status\` VARCHAR(20) NOT NULL DEFAULT 'open',
      \`assigned_to\` VARCHAR(120) NULL,
      \`created_by\` VARCHAR(120) NOT NULL,
      \`created_at\` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
      \`updated_at\` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      \`resolved_at\` TIMESTAMP NULL,
      PRIMARY KEY (\`id\`),
      KEY \`idx_support_tickets_status\` (\`status\`),
      KEY \`idx_support_tickets_category\` (\`category\`),
      KEY \`idx_support_tickets_priority\` (\`priority\`),
      KEY \`idx_support_tickets_facility\` (\`facility_id\`),
      KEY \`idx_support_tickets_created\` (\`created_at\`)
    )
  `)

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS \`afyasolar_support_responses\` (
      \`id\` VARCHAR(36) NOT NULL,
      \`ticket_id\` VARCHAR(36) NOT NULL,
      \`message\` TEXT NOT NULL,
      \`is_internal\` TINYINT NOT NULL DEFAULT 0,
      \`created_by\` VARCHAR(120) NOT NULL,
      \`created_at\` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      KEY \`idx_support_responses_ticket\` (\`ticket_id\`, \`created_at\`)
    )
  `)

  ensured = true
}

/**
 * Default system configuration rows. These are genuine configuration defaults
 * (not mock activity data). Opt-in: only inserted when the config table is empty,
 * so the System > Config panel has something to show / edit.
 */
const DEFAULT_CONFIGS: Array<{
  category: string
  key: string
  value: string
  description: string
  type: string
  options?: string[]
}> = [
  { category: "general", key: "System Name", value: "Afya Solar Management System", description: "Display name for the system", type: "string" },
  { category: "general", key: "Default Timezone", value: "Africa/Dar_es_Salaam", description: "Default timezone for the system", type: "string" },
  { category: "general", key: "Maintenance Mode", value: "false", description: "Enable maintenance mode to disable user access", type: "boolean" },
  { category: "security", key: "Session Timeout", value: "480", description: "Session timeout in minutes", type: "number" },
  { category: "security", key: "Two-Factor Authentication", value: "false", description: "Require 2FA for admin users", type: "boolean" },
  { category: "security", key: "Password Policy", value: "strong", description: "Password strength requirement", type: "select", options: ["weak", "medium", "strong"] },
  { category: "notifications", key: "Email Notifications", value: "true", description: "Enable email notifications for system events", type: "boolean" },
  { category: "notifications", key: "SMTP Server", value: "smtp.afyasolar.com", description: "SMTP server for outgoing emails", type: "string" },
  { category: "notifications", key: "Alert Email", value: "alerts@afyasolar.com", description: "Email address for system alerts", type: "string" },
  { category: "automation", key: "Auto-Suspend Overdue", value: "true", description: "Automatically suspend services with overdue payments", type: "boolean" },
  { category: "automation", key: "Grace Period Days", value: "7", description: "Number of days before auto-suspension", type: "number" },
  { category: "automation", key: "Backup Frequency", value: "daily", description: "System backup frequency", type: "select", options: ["hourly", "daily", "weekly"] },
  { category: "integrations", key: "Payment Gateway", value: "flutterwave", description: "Default payment gateway", type: "select", options: ["flutterwave", "mpesa", "tigo pesa", "airtel money"] },
  { category: "integrations", key: "SMS Provider", value: "twilio", description: "SMS service provider for notifications", type: "select", options: ["twilio", "africastalking", "infobip"] },
  { category: "integrations", key: "API Rate Limit", value: "1000", description: "Maximum API requests per hour", type: "number" },
]

/**
 * Inserts the default config rows only if the config table is currently empty.
 * Idempotent and opt-in (run via the CLI with --seed-config).
 */
export async function seedAdminConfigDefaults(): Promise<number> {
  await ensureAdminTables()

  const existing = await db.execute(sql`SELECT COUNT(*) AS count FROM \`afyasolar_admin_configs\``)
  // mysql2 returns [rows, fields]; drizzle execute returns the rows array as element 0
  const rows = Array.isArray(existing) ? (existing[0] as unknown as Array<{ count: number }>) : []
  const count = Number(rows?.[0]?.count ?? 0)
  if (count > 0) return 0

  for (const cfg of DEFAULT_CONFIGS) {
    await db.execute(sql`
      INSERT INTO \`afyasolar_admin_configs\`
        (\`id\`, \`category\`, \`config_key\`, \`config_value\`, \`description\`, \`type\`, \`options\`)
      VALUES (
        ${generateId()},
        ${cfg.category},
        ${cfg.key},
        ${cfg.value},
        ${cfg.description},
        ${cfg.type},
        ${cfg.options ? JSON.stringify(cfg.options) : null}
      )
    `)
  }

  return DEFAULT_CONFIGS.length
}
