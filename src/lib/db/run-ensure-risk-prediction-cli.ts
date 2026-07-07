import "dotenv/config"
import { ensureRiskPrediction } from "./ensure-risk-prediction"

ensureRiskPrediction()
  .then(() => {
    console.log("facility_risk_prediction table ensured.")
    process.exit(0)
  })
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
