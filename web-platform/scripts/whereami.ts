/**
 * Safety gate for the investor-video recording setup.
 *
 * Prints which database the current environment actually resolves to and exits
 * non-zero unless it is local. Run this BEFORE db:migrate, db:seed or npm run
 * dev while the recording overrides are in .env.local, so a missing//reordered
 * override can never silently point a seeder at the production database.
 *
 * Loads .env then .env.local, matching Next.js precedence (.env.local wins).
 */
import { config } from "dotenv"

config({ path: ".env" })
config({ path: ".env.local", override: true })

const host = process.env.DB_HOST ?? "(unset)"
const name = process.env.DB_NAME ?? "(unset)"
const port = process.env.DB_PORT ?? "(unset)"

const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost", "::1", "0.0.0.0"])
const isLocal = LOCAL_HOSTS.has(host)

console.log(`\n  DB_HOST : ${host}`)
console.log(`  DB_PORT : ${port}`)
console.log(`  DB_NAME : ${name}\n`)

if (!isLocal) {
  console.error(
    `  ✗ REFUSING TO PROCEED — "${host}" is not a local database.\n` +
      `    The recording setup must never touch production. Check that the\n` +
      `    DB_* override block is present in .env.local.\n`,
  )
  process.exit(1)
}

console.log("  ✓ Local database. Safe to migrate, seed and record.\n")
