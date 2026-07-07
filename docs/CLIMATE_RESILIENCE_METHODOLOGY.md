# AfyaSolar Climate Resilience Methodology & Standards

How AfyaSolar turns raw climate data into hazard indices, a Climate Vulnerability
Index (CVI), and the Hazard Exposure input to the Resilience Capacity Score (RCS).
Designed to be transparent, versioned, and auditable.

> Source of truth: `src/lib/climate/nasa-power.ts` (`NORMALIZATION_VERSION`),
> `src/lib/climate/climate-stats.ts` (pure math), `src/lib/climate/criphc-scoring.ts` (RCS).

## Data source

**NASA POWER** (`power.larc.nasa.gov`, community = RE) — free, no API key. Monthly
series, fill values (−999) stripped, 6 h server cache. Parameters:

```
T2M_MAX        daily maximum temperature (°C)   → heat
PRECTOTCORR    corrected precipitation (mm/day)  → flood, drought
WS10M          10 m wind speed (m/s)             → storm
ALLSKY_SFC_SW_DWN  surface irradiance (kWh/m²/day = peak-sun-hours) → solar
```

**Baseline** = `climatologyRange()`: the last ~30 complete calendar years (WMO-normal
length). Each hazard's index is measured against *this facility's own* record.

## Annual statistic per hazard (physical reduction)

```
heat    = mean(T2M_MAX)  over the year
flood   = max(PRECTOTCORR)                (wettest month at monthly resolution)
storm   = max(WS10M)
drought = longest run of dry months (mean < 1 mm/day)   [daily: longest dry-day run]
```

## Hazard index (0–100) — v2, calibrated

Each hazard blends a **local-climatology anomaly** with an **absolute-severity anchor**:

```
Relative  R = Φ((x − μ) / σ) × 100        // Φ = standard normal CDF (A&S 7.1.26)
                                          // μ, σ from this site's baseline series
Absolute  A = clamp((x − min) / (max − min) × 100, 0, 100)   // fixed reference bounds
Index     = round( w·R + (1−w)·A )        // per-hazard weight w
```

Weights `w` (relative share): heat 0.60, drought 0.60, flood 0.45, storm 0.45
(skewed extremes lean on the absolute anchor). Absolute bounds: heat [20, 42] °C,
flood [0, 15] mm/day monthly, storm [0, 15] m/s, drought [0, 12] dry months.

**Fallback:** with fewer than 8 baseline years (or σ = 0) the anomaly is undefined,
so `Index = A` (absolute only). Short user-selected ranges therefore still render.

## Return period

For heat and flood, the latest year's value is ranked in the local record
(Weibull plotting position):

```
T (years) = (N + 1) / rank        rank 1 = largest value
```

Reported only when `N ≥ 10`, with an explicit short-baseline uncertainty caveat.
At monthly resolution this is a *wettest-month* level, not a daily rainfall extreme.

## Composite CVI and Hazard Exposure

```
CVI composite = mean(flood, drought, heat, storm)          // 0–100 exposure
HES capacity  = 100 − CVI composite                        // higher = more resilient
```

`HES` feeds the RCS as the Hazard Exposure dimension; the other four dimensions
come from the CRiPHC questionnaire. RCS weights and composition:
`src/lib/climate/criphc-scoring.ts` (`CRIPHC_CORE_WEIGHTS`, `combineRcs`).

## Projection (2030 / 2050)

Per-facility trend extrapolation — **not a forecast**:

```
For each hazard, OLS-regress its per-year index on year → slope β, slope std error SE.
projected = clamp(latest_index + β·Δyears, 0, 100)
band      = ±1.96 · SE · Δyears        (hazard-averaged uncertainty)
```

A flat +12/hazard fallback (`projectCvi`) is retained only where no per-year trend
is available (e.g. some report aggregates), and is labeled as an assumption.

## Versioning

`NORMALIZATION_VERSION` (currently **v2**) stamps every persisted profile
(`facility_climate_profile.normalization_version`) and the saved RCS
`formula_version`. On a formula change: bump the constant, run
`npm run db:ensure-climate-normalization`, then trigger the portfolio climate
refresh (`/api/cron/refresh-climate`) to restamp scores.

## Notes & limitations

- **Single source** (NASA POWER), monthly resolution → flood/heat are monthly, not
  daily, extremes. **ERA5** (native daily extremes, better wind, 1940– baseline) is
  planned future work; it is **not** integrated today.
- Self-referential baseline: a warming trend biases recent years upward; the
  anomaly-CDF partially accounts for this.
- Short records make return periods and projections uncertain — always labeled.
- Bounds and weights are documented, versioned heuristics, tuned for Tanzanian
  coastal/inland facilities; recalibrate (and bump the version) as the record grows.
