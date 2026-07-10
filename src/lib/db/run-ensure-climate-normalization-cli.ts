import "dotenv/config"
import { ensureClimateNormalization } from "./ensure-climate-normalization"

ensureClimateNormalization()
  .then(() => {
    console.log("facility_climate_profile.normalization_version ensured. Run the climate refresh to restamp scores to the current version.")
    process.exit(0)
  })
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
