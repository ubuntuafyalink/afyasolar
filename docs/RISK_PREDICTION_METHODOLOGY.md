# AfyaSolar Disruption-Risk Model Methodology & Standards

How AfyaSolar turns a facility's real resilience data into a transparent,
explainable **disruption-risk prior**. It is a calibrated model, **not** a trained
forecast — the reliable output today is the tier ordering and the drivers.

> Source of truth: `src/lib/intelligence/risk-model.ts` (`RISK_MODEL_VERSION`,
> `RISK_COEFFICIENTS`), `src/lib/intelligence/risk-features.ts` (adapters).

## Target

"Elevated risk of a critical-service disruption (power loss or cold-chain
failure) at a facility in the coming weeks." A composite pressure, not a measured
or forecast probability. **Cold-chain has no real internal-temperature telemetry**
in this platform, so its signal is the NASA heat-exposure *proxy*, not an excursion.

## Features (each a normalized risk-pressure in [0,1]; higher = more risk)

```
hazardExposure      = composite CVI / 100                         (NASA POWER)
heatPressure        = heat hazard index / 100  (cold-chain proxy) (NASA POWER)
serviceFragility    = (100 − CSF) / 100                           (climate_score_summaries)
energyContinuityGap = (100 − ECPQ) / 100                          (climate_score_summaries)
readinessGap        = (100 − RRC) / 100                           (climate_score_summaries)
autonomyDeficit     = clamp(1 − autonomyHrs/72, 0,1)              (energy assessment; facility only)
efficiencyDeficit   = clamp((60 − energyBmiPercent)/60, 0,1)      (efficiency data)
deviceOffline       = 1 − activeDevices/deviceCount               (device registry)
criticalAttention   = 1 if the assessment red-flag is set, else 0 (assessment)
adaptationOffset    = clamp(realizedGainPts/15, 0,1)  PROTECTIVE   (adaptation-effectiveness)
```

A feature with no real value is imputed to its neutral value (0) and lowers the
**confidence**, never inventing risk. `autonomyHrs = usableBattery·DoD·0.9 / criticalLoadKw`.

## Model

Logistic regression over the features:

```
z = b0 + Σ wᵢ·xᵢ
p = 1 / (1 + e^-z)
```

Coefficients `wᵢ` (**v0-prior**, expert-elicited, sign-constrained → monotonic):

```
serviceFragility 1.3   energyContinuityGap 1.4   autonomyDeficit 1.5
hazardExposure 1.1     heatPressure 0.9          readinessGap 0.8
efficiencyDeficit 0.6  deviceOffline 0.7         criticalAttention 1.0
adaptationOffset −1.2  (protective)
```

`b0` is calibrated so a documented "typical facility" scores at `BASE_RATE = 0.18`
(the one honest base-rate assumption). Tiers: Low `<0.15`, Elevated `<0.30`,
High `<0.50`, Severe `≥0.50`.

## Explainability (exact)

For a linear logit the additive contribution `wᵢ·xᵢ` **is** the exact attribution
(no SHAP sampling). The identity `Σ contributionᵢ + b0 = z` is unit-tested. Each
driver reports its value, contribution, share %, and direction
(increases / reduces). The UI leads with the tier + top drivers; the probability
is shown only as a small, caveated secondary figure.

## Versioning & logging

`RISK_MODEL_VERSION = "risk-v0-prior"` stamps the coefficient set. Every score is
logged to `facility_risk_prediction` (`probability, tier, features JSON,
completeness, version, scored_at`) by the monthly climate refresh
(`refreshPortfolioClimate`). Run `npm run db:ensure-risk-prediction` once to create
the table.

## Calibration limits & path to fitting

- **No labeled outcomes yet** → this is a prior, not a forecast. Treat absolute
  probabilities as **ordinal**; the tier ranking and drivers are the decision-useful
  output.
- **Cold-chain is a heat proxy**, not a measured excursion.
- **Telemetry is sparse** → live device features are optional; the model is
  meaningful from structural resilience features alone, and completeness drives the
  confidence chip.
- **Path to fit:** once `facility_risk_prediction` rows can be joined to realized
  30-day outcomes, compute a Brier score + reliability curve and refit the same
  logistic model (IRLS/gradient descent, still additive-explainable) → bump to
  `risk-v1-fitted-YYYYMM`. The structure and surfaces do not change.
