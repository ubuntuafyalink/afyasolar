import "dotenv/config"
import { ensureClimateAlerts } from "./ensure-climate-alerts"

ensureClimateAlerts()
  .then(() => {
    console.log("device_alerts.device_id is now nullable (facility-level climate alerts enabled).")
    process.exit(0)
  })
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
