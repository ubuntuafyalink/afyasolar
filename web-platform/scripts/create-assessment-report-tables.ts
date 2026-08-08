import fs from "fs"
import path from "path"
import mysql from "mysql2/promise"

import { loadEnv } from "../src/lib/db/load-env"

// Loads .env then .env.local with override, matching Next.js precedence. The
// previous `.env`-only load meant a local run silently targeted the production
// database even when .env.local pointed at localhost.
loadEnv()

async function run() {
  const migrationPath = path.join(
    process.cwd(),
    "src",
    "lib",
    "db",
    "migrations",
    "20260416090000_create_facility_assessment_report_tables.sql"
  )

  if (!fs.existsSync(migrationPath)) {
    throw new Error(`Migration file not found: ${migrationPath}`)
  }

  const sql = fs.readFileSync(migrationPath, "utf-8")
  if (!sql.trim()) throw new Error("Migration SQL is empty")

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    // Was omitted, so this silently defaulted to 3306 regardless of DB_PORT.
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl:
      process.env.DB_SSL === "true"
        ? {
            rejectUnauthorized: false,
          }
        : undefined,
    multipleStatements: true,
  })

  try {
    await connection.query(sql)
    console.log("✅ facility_energy_assessments and facility_climate_assessments are ready.")
  } finally {
    await connection.end()
  }
}

run().catch((error) => {
  console.error("❌ Failed to create assessment report tables.")
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
