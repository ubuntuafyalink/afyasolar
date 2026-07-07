/**
 * Server-side: compute REAL NASA POWER hazard exposure for a single facility and
 * persist it into facility_climate_profile with dataSource="real".
 *
 * This is the persistence counterpart to the live UI derivation in
 * rcs-explainer-section.tsx (toCvi -> hesScore) and reuses the same NASA path as
 * computePortfolioClimate (fetchNasaPowerServer + toCvi). The simulated profile
 * (simulateClimateProfile) is kept only as the empty-DB / unavailable fallback.
 *
 * NASA hazard model -> facility_climate_profile mapping (both 0..100 exposure):
 *   flood  -> floodRiskScore   (peak precipitation intensity)
 *   heat   -> heatRiskScore    (mean daily maximum temperature)
 *   storm  -> windRiskScore    (peak 10 m wind speed)
 *   drought-> rainRiskScore    (precipitation-deficit / dry-spell hazard; the
 *                               remaining precipitation-driven hazard)
 * overallResilienceScore stores the CVI-derived capacity (100 - composite).
 */
import { db } from "@/lib/db"
import { facilityClimateProfile } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import {
  REGION_COORDS,
  DEFAULT_COORDS,
  climatologyRange,
  NASA_POWER_PARAMETERS,
  toCvi,
  NORMALIZATION_VERSION,
  type Coords,
} from "@/lib/climate/nasa-power"
import { fetchNasaPowerServer } from "@/lib/climate/nasa-power-server"
import { hesFromComposite } from "@/lib/climate/criphc-scoring"

export type RealFacilityClimate = {
  byHazard: { flood: number; drought: number; heat: number; storm: number }
  composite: number
  hesScore: number
  coords: Coords
}

function isValidCoord(lat: number, lon: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lon) &&
    lat >= -90 &&
    lat <= 90 &&
    lon >= -180 &&
    lon <= 180
  )
}

/** Prefer real facility lat/lon, then a region representative point, then the default. */
export function resolveServerCoords(opts: {
  lat?: number | null
  lon?: number | null
  region?: string | null
}): Coords {
  const lat = opts.lat != null ? Number(opts.lat) : NaN
  const lon = opts.lon != null ? Number(opts.lon) : NaN
  if (isValidCoord(lat, lon)) return { lat, lon }
  if (opts.region && REGION_COORDS[opts.region]) return REGION_COORDS[opts.region]
  return DEFAULT_COORDS
}

/**
 * Fetch real NASA POWER exposure for a coordinate and reduce it to a CVI.
 * Returns null on any upstream/parse failure so callers can fall back.
 */
export async function fetchRealClimateForCoords(coords: Coords): Promise<RealFacilityClimate | null> {
  const range = climatologyRange() // ~30y monthly baseline for v2 anomaly calibration
  try {
    const resp = await fetchNasaPowerServer({
      lat: coords.lat,
      lon: coords.lon,
      temporal: range.temporal,
      start: range.start,
      end: range.end,
      parameters: NASA_POWER_PARAMETERS,
    })
    const cvi = toCvi(resp)
    return {
      byHazard: cvi.byHazard,
      composite: cvi.composite,
      hesScore: hesFromComposite(cvi.composite),
      coords,
    }
  } catch {
    return null
  }
}

/** Map a NASA CVI onto the four facility_climate_profile risk fields + capacity. */
export function climateToProfileValues(real: RealFacilityClimate) {
  return {
    floodRiskScore: String(real.byHazard.flood),
    heatRiskScore: String(real.byHazard.heat),
    windRiskScore: String(real.byHazard.storm),
    rainRiskScore: String(real.byHazard.drought),
    overallResilienceScore: String(real.hesScore),
    latitude: String(real.coords.lat),
    longitude: String(real.coords.lon),
    dataSource: "real" as const,
    normalizationVersion: NORMALIZATION_VERSION,
  }
}

/**
 * Compute REAL NASA hazard exposure for a facility and upsert it into
 * facility_climate_profile (dataSource="real"). Returns the computed climate, or
 * null when NASA data is unavailable (callers keep the simulated fallback).
 */
export async function persistRealClimateProfile(
  facilityId: string,
  opts: { region?: string | null; lat?: number | null; lon?: number | null } = {},
): Promise<RealFacilityClimate | null> {
  const coords = resolveServerCoords(opts)
  const real = await fetchRealClimateForCoords(coords)
  if (!real) return null

  const values = climateToProfileValues(real)
  try {
    const existing = await db
      .select({ facilityId: facilityClimateProfile.facilityId })
      .from(facilityClimateProfile)
      .where(eq(facilityClimateProfile.facilityId, facilityId))
      .limit(1)
    if (existing.length > 0) {
      await db
        .update(facilityClimateProfile)
        .set(values)
        .where(eq(facilityClimateProfile.facilityId, facilityId))
    } else {
      await db.insert(facilityClimateProfile).values({ facilityId, ...values })
    }
  } catch (e) {
    console.warn("[facility-climate-persist] profile upsert:", e)
  }

  return real
}
