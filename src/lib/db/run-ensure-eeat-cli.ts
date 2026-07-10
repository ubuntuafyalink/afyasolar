import "dotenv/config"
import { ensureEeat } from "./ensure-eeat"

ensureEeat()
  .then(() => {
    console.log("facility_eeat_assessment table ensured.")
    process.exit(0)
  })
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
