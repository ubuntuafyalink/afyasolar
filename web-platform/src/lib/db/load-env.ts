/**
 * Environment loading + safety guard for the standalone DB scripts (migrate,
 * seed, create-admin). These run outside Next.js, via tsx.
 *
 * WHY THIS EXISTS: Next.js loads `.env` then `.env.local`, with `.env.local`
 * winning. The standalone scripts loaded `.env` ONLY, so a developer who put a
 * local database in `.env.local` (the documented way to avoid touching
 * production) was silently still pointed at the `.env` database. For the
 * telemetry seeder that means writing fabricated rows into production.
 *
 * Import this at the very top of any script that opens a DB connection, before
 * anything reads process.env.
 */
import * as fs from "fs"

/** Load `.env`, then let `.env.local` override it — matching Next.js precedence. */
export function loadEnv(): void {
  const dotenv = require("dotenv")
  if (fs.existsSync(".env")) dotenv.config({ path: ".env" })
  if (fs.existsSync(".env.local")) dotenv.config({ path: ".env.local", override: true })
}

const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost", "::1", "0.0.0.0"])

/**
 * Refuse to run a data-writing script against a non-local database.
 *
 * Set ALLOW_REMOTE_SEED=true to override deliberately (e.g. a staging box).
 * There is no reason to bypass this for production.
 */
export function assertLocalDatabase(action: string): void {
  const host = process.env.DB_HOST || "localhost"
  if (LOCAL_HOSTS.has(host)) return

  if (process.env.ALLOW_REMOTE_SEED === "true") {
    console.warn(`⚠️  ${action} targeting REMOTE host "${host}" (ALLOW_REMOTE_SEED=true).`)
    return
  }

  console.error(
    `\n✗ Refusing to ${action}: "${host}" is not a local database.\n` +
      `  This script writes fabricated data and must not run against production.\n` +
      `  Point DB_HOST at a local database in .env.local, or set\n` +
      `  ALLOW_REMOTE_SEED=true if you genuinely intend a remote target.\n`,
  )
  process.exit(1)
}
