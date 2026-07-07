"use client"

import { useCallback, useMemo, useState } from "react"
import { CloudSun, LocateFixed, Satellite } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DemoDataBadge } from "@/components/ui/demo-data-badge"
import { cn } from "@/lib/utils"
import { FOCUS_RING } from "@/lib/dashboard/facility-ui"
import { getHazardTrend } from "@/lib/dashboard/facility-demo-data"
import {
  resolveCoords,
  rangeForPreset,
  customRange,
  toHazardTrend,
  toHazardScores,
  toCvi,
  NASA_POWER_PARAMETERS,
  type Coords,
  type RangePreset,
  type ResolvedRange,
} from "@/lib/climate/nasa-power"
import { toHazardSeries, type HazardKey } from "@/lib/climate/hazard-series"
import type { ResolvedLocation } from "@/lib/geo/africa-locations"
import { reverseGeocode } from "@/lib/geo/reverse-geocode"
import { useNasaPower } from "@/hooks/use-nasa-power"
import { HazardScorePanel } from "./hazard-score-panel"
import { CviPanel } from "./cvi-panel"
import { HazardChartCard } from "./hazard-chart-card"
import { ClimateInterpretation } from "./climate-interpretation"
import { LocationCascade } from "./location-cascade"
import { RealLocationMap } from "./real-location-map"
import { OfflineReadyBadge } from "./offline-ready-badge"
import { useFacilityPreferences } from "./facility-preferences-provider"

const HAZARDS: { key: HazardKey; color: string }[] = [
  { key: "heat", color: "var(--color-chart-4)" },
  { key: "flood", color: "var(--color-chart-3)" },
  { key: "storm", color: "var(--color-chart-5)" },
  { key: "drought", color: "var(--color-chart-2)" },
]

const PRESETS: Exclude<RangePreset, "custom">[] = ["1y", "5y", "10y", "20y"]

/**
 * Climate Outlook: REAL NASA POWER climate data with a Country -> Region ->
 * District location cascade, a time-range filter, a real map (Google Street
 * View or OSM), per-hazard charts the user can re-shape (line/bar/area/pie/
 * number), and an AI layer that interprets the data in plain language. Falls
 * back to simulated data, clearly labelled, when offline or the API fails.
 */
export function ClimateOutlookSection({
  facilityId,
  facilityName,
  region,
  coords: coordsProp,
}: {
  facilityId?: string
  facilityName?: string | null
  region?: string | null
  /** Explicit coordinates (e.g. a facility's real lat/lon); falls back to resolveCoords. */
  coords?: Coords
}) {
  const { locale, t } = useFacilityPreferences()

  const defaultCoords = useMemo<Coords>(
    () => coordsProp ?? resolveCoords({ facilityId, region }),
    [coordsProp, facilityId, region],
  )

  const [coords, setCoords] = useState<Coords>(defaultCoords)
  const [locationLabel, setLocationLabel] = useState<string | null>(facilityName ?? region ?? null)
  const [latInput, setLatInput] = useState(String(defaultCoords.lat))
  const [lonInput, setLonInput] = useState(String(defaultCoords.lon))
  const [preset, setPreset] = useState<RangePreset>("10y")
  const [customFrom, setCustomFrom] = useState(2005)
  const [customTo, setCustomTo] = useState(2024)

  const range = useMemo<ResolvedRange>(
    () => (preset === "custom" ? customRange(customFrom, customTo) : rangeForPreset(preset)),
    [preset, customFrom, customTo],
  )

  const query = useNasaPower({
    lat: coords.lat,
    lon: coords.lon,
    temporal: range.temporal,
    start: range.start,
    end: range.end,
    parameters: NASA_POWER_PARAMETERS,
  })

  const real = query.data
  const realTrend = useMemo(() => (real ? toHazardTrend(real) : null), [real])
  const realScores = useMemo(() => (real ? toHazardScores(real) : null), [real])
  const realCvi = useMemo(() => (real ? toCvi(real) : null), [real])

  const hasRealData = !!realTrend && realTrend.length > 0
  const emptyResult = !!real && !hasRealData
  const isError = query.isError || emptyResult
  const showSkeleton = query.isLoading && !real

  const demoTrend = useMemo(() => getHazardTrend(facilityId), [facilityId])

  const showReal = hasRealData
  const trend = showReal ? realTrend! : demoTrend

  const onResolveLocation = useCallback((loc: ResolvedLocation) => {
    setCoords({ lat: loc.lat, lon: loc.lon })
    setLocationLabel(loc.label)
    setLatInput(loc.lat.toFixed(4))
    setLonInput(loc.lon.toFixed(4))
  }, [])

  function applyManualCoords() {
    const lat = Number(latInput)
    const lon = Number(lonInput)
    if (Number.isFinite(lat) && lat >= -90 && lat <= 90 && Number.isFinite(lon) && lon >= -180 && lon <= 180) {
      setCoords({ lat, lon })
      setLocationLabel(null)
    }
  }

  // Capture the device's real current location via the browser Geolocation API.
  const [geoStatus, setGeoStatus] = useState<"idle" | "locating" | "resolving" | "denied" | "unsupported">("idle")
  const [geoPlace, setGeoPlace] = useState<string | null>(null)

  function useMyLocation() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGeoStatus("unsupported")
      return
    }
    setGeoStatus("locating")
    setGeoPlace(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude
        const lon = pos.coords.longitude
        setCoords({ lat, lon })
        setLatInput(lat.toFixed(4))
        setLonInput(lon.toFixed(4))
        setLocationLabel(t("climateOutlook.myLocation"))
        // Resolve the coordinates to a readable place (name, district, region, country).
        setGeoStatus("resolving")
        void reverseGeocode(lat, lon, locale).then((place) => {
          if (place?.label) {
            setLocationLabel(place.label)
            setGeoPlace(place.full || place.label)
          }
          setGeoStatus("idle")
        })
      },
      () => setGeoStatus("denied"),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    )
  }

  const temporalLabel = t(`climateOutlook.temporal.${range.temporal}`)
  const rangeLabel = `${range.startYear} ${t("climateOutlook.to")} ${range.endYear}`
  const queryKey = `${coords.lat},${coords.lon},${range.temporal},${range.start},${range.end}`

  return (
    <section className="space-y-4" aria-labelledby="climate-outlook-title">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <CloudSun className="size-5 text-primary" aria-hidden />
            <h2 id="climate-outlook-title" className="text-xl font-semibold text-foreground">
              {t("climateOutlook.title")}
            </h2>
          </div>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{t("climateOutlook.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          <OfflineReadyBadge />
          {showReal ? null : <DemoDataBadge label={isError ? t("climateOutlook.offlineFallback") : undefined} />}
        </div>
      </div>

      {/* Location + time-range filters */}
      <Card>
        <CardContent className="space-y-4 pt-4">
          <fieldset className="space-y-2">
            <legend className="text-xs font-medium text-foreground">{t("climateOutlook.locationLabel")}</legend>
            <LocationCascade defaultRegionName={region} onResolve={onResolveLocation} />
            <div className="flex flex-wrap items-end gap-2">
              <label className="flex-1 text-xs text-muted-foreground">
                {t("climateOutlook.manualLat")}
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  value={latInput}
                  onChange={(e) => setLatInput(e.target.value)}
                  className={cn("mt-1 w-full rounded-md border border-border bg-background px-2 py-1 text-sm", FOCUS_RING)}
                />
              </label>
              <label className="flex-1 text-xs text-muted-foreground">
                {t("climateOutlook.manualLon")}
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  value={lonInput}
                  onChange={(e) => setLonInput(e.target.value)}
                  className={cn("mt-1 w-full rounded-md border border-border bg-background px-2 py-1 text-sm", FOCUS_RING)}
                />
              </label>
              <button
                type="button"
                onClick={applyManualCoords}
                className={cn(
                  "rounded-md border border-primary bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground",
                  FOCUS_RING,
                )}
              >
                {t("climateOutlook.apply")}
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={useMyLocation}
                disabled={geoStatus === "locating" || geoStatus === "resolving"}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50",
                  FOCUS_RING,
                )}
              >
                <LocateFixed className="size-4 text-primary" aria-hidden />
                {geoStatus === "locating"
                  ? t("climateOutlook.locating")
                  : geoStatus === "resolving"
                    ? t("climateOutlook.resolvingPlace")
                    : t("climateOutlook.useMyLocation")}
              </button>
              {geoStatus === "denied" ? (
                <span className="text-xs text-muted-foreground" role="status">
                  {t("climateOutlook.locationDenied")}
                </span>
              ) : null}
              {geoStatus === "unsupported" ? (
                <span className="text-xs text-muted-foreground" role="status">
                  {t("climateOutlook.geoUnsupported")}
                </span>
              ) : null}
            </div>
            {geoPlace ? (
              <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-foreground" role="status">
                <span className="font-medium">{t("climateOutlook.detectedLocation")}:</span> {geoPlace}
              </p>
            ) : null}
          </fieldset>

          <fieldset className="space-y-2">
            <legend className="text-xs font-medium text-foreground">{t("climateOutlook.timeRangeLabel")}</legend>
            <div className="flex flex-wrap items-center gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  aria-pressed={preset === p}
                  onClick={() => setPreset(p)}
                  className={cn(
                    "rounded-md border px-3 py-1 text-sm font-medium transition-colors",
                    FOCUS_RING,
                    preset === p
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-muted-foreground hover:bg-muted",
                  )}
                >
                  {t(`climateOutlook.preset.${p}`)}
                </button>
              ))}
              <button
                type="button"
                aria-pressed={preset === "custom"}
                onClick={() => setPreset("custom")}
                className={cn(
                  "rounded-md border px-3 py-1 text-sm font-medium transition-colors",
                  FOCUS_RING,
                  preset === "custom"
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-muted-foreground hover:bg-muted",
                )}
              >
                {t("climateOutlook.preset.custom")}
              </button>
            </div>
            {preset === "custom" ? (
              <div className="flex flex-wrap items-end gap-2">
                <label className="text-xs text-muted-foreground">
                  {t("climateOutlook.customFrom")}
                  <input
                    type="number"
                    value={customFrom}
                    min={1981}
                    max={customTo}
                    onChange={(e) => setCustomFrom(Number(e.target.value))}
                    className={cn("mt-1 w-24 rounded-md border border-border bg-background px-2 py-1 text-sm", FOCUS_RING)}
                  />
                </label>
                <label className="text-xs text-muted-foreground">
                  {t("climateOutlook.customTo")}
                  <input
                    type="number"
                    value={customTo}
                    min={customFrom}
                    onChange={(e) => setCustomTo(Number(e.target.value))}
                    className={cn("mt-1 w-24 rounded-md border border-border bg-background px-2 py-1 text-sm", FOCUS_RING)}
                  />
                </label>
              </div>
            ) : null}
          </fieldset>
        </CardContent>
      </Card>

      {/* Dataset attribution */}
      {showReal ? (
        <p className="inline-flex flex-wrap items-center gap-1.5 rounded-lg border border-success/30 bg-success/10 px-3 py-1.5 text-xs text-foreground">
          <Satellite className="size-3.5" aria-hidden />
          {t("climateOutlook.realSource", {
            lat: coords.lat.toFixed(2),
            lon: coords.lon.toFixed(2),
            range: rangeLabel,
            temporal: temporalLabel,
          })}
          {real?.sourceUrl ? (
            <a href={real.sourceUrl} target="_blank" rel="noopener noreferrer" className={cn("font-medium underline", FOCUS_RING)}>
              {t("climateOutlook.viewQuery")}
            </a>
          ) : null}
        </p>
      ) : (
        <p className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground">
          <Satellite className="size-3.5" aria-hidden />
          {isError ? t("climateOutlook.offlineFallback") : t("climateOutlook.source")}
        </p>
      )}

      {/* AI interpretation */}
      {realCvi ? (
        <ClimateInterpretation
          trend={trend}
          cvi={realCvi}
          locationLabel={locationLabel}
          rangeLabel={rangeLabel}
          temporalLabel={temporalLabel}
          live={showReal}
          queryKey={queryKey}
        />
      ) : null}

      {/* Per-hazard charts */}
      {showSkeleton ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {HAZARDS.map((h) => (
            <div key={h.key} className="h-72 animate-pulse rounded-md bg-muted" aria-hidden />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {HAZARDS.map((h) => (
            <HazardChartCard
              key={h.key}
              hazardKey={h.key}
              title={t(`climateOutlook.hazard.${h.key}`)}
              points={toHazardSeries(trend, h.key)}
              color={h.color}
              live={showReal}
              locationLabel={locationLabel}
            />
          ))}
        </div>
      )}

      {/* Hazard scores + CVI (reused panels) */}
      {showSkeleton ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="h-64 animate-pulse rounded-md bg-muted" aria-hidden />
          <div className="h-64 animate-pulse rounded-md bg-muted" aria-hidden />
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <HazardScorePanel facilityId={facilityId} scores={showReal ? realScores ?? undefined : undefined} live={showReal} />
          <CviPanel
            facilityId={facilityId}
            baseCvi={showReal ? realCvi ?? undefined : undefined}
            trend={showReal ? realTrend ?? undefined : undefined}
            live={showReal}
          />
        </div>
      )}

      {/* Real location map */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t("climateOutlook.mapTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <RealLocationMap lat={coords.lat} lon={coords.lon} label={locationLabel} />
        </CardContent>
      </Card>
    </section>
  )
}
