import "dotenv/config"
import { ensureAdminTables, seedAdminConfigDefaults } from "./ensure-admin-tables"

const seedConfig = process.argv.includes("--seed-config")

ensureAdminTables()
  .then(async () => {
    console.log("Admin sub-panel tables ensured.")
    if (seedConfig) {
      const inserted = await seedAdminConfigDefaults()
      console.log(`Seeded ${inserted} default config rows.`)
    }
    process.exit(0)
  })
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
