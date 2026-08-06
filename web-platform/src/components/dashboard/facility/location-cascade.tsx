"use client"

import { useState } from "react"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  listCountries,
  regionsFor,
  districtsFor,
  coordsFor,
  findRegionByName,
  type ResolvedLocation,
} from "@/lib/geo/africa-locations"
import { useT } from "./facility-preferences-provider"

/**
 * Country -> Region -> District cascade. Each level filters the next; any
 * selection resolves to coordinates (district -> region -> country centroid)
 * and is reported via onResolve so the parent can drive data + map.
 *
 * Defaults to Tanzania and, when possible, the facility's region by name.
 */
export function LocationCascade({
  defaultCountryId = "tz",
  defaultRegionName,
  onResolve,
}: {
  defaultCountryId?: string
  defaultRegionName?: string | null
  onResolve: (loc: ResolvedLocation) => void
}) {
  const t = useT()
  const initialRegion = findRegionByName(defaultRegionName)

  const [countryId, setCountryId] = useState<string>(initialRegion?.countryId ?? defaultCountryId)
  const [regionId, setRegionId] = useState<string | undefined>(initialRegion?.id)
  const [districtId, setDistrictId] = useState<string | undefined>(undefined)

  const countries = listCountries()
  const regions = regionsFor(countryId)
  const districts = districtsFor(regionId)

  function resolve(next: { countryId: string; regionId?: string; districtId?: string }) {
    const loc = coordsFor(next)
    if (loc) onResolve(loc)
  }

  function onCountry(value: string) {
    setCountryId(value)
    setRegionId(undefined)
    setDistrictId(undefined)
    resolve({ countryId: value })
  }

  function onRegion(value: string) {
    setRegionId(value)
    setDistrictId(undefined)
    resolve({ countryId, regionId: value })
  }

  function onDistrict(value: string) {
    setDistrictId(value)
    resolve({ countryId, regionId, districtId: value })
  }

  return (
    <div className="grid gap-2 sm:grid-cols-3">
      <label className="space-y-1 text-xs text-muted-foreground">
        <span>{t("climateOutlook.country")}</span>
        <Select value={countryId} onValueChange={onCountry}>
          <SelectTrigger className="w-full" aria-label={t("climateOutlook.country")}>
            <SelectValue placeholder={t("climateOutlook.country")} />
          </SelectTrigger>
          <SelectContent>
            {countries.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </label>

      <label className="space-y-1 text-xs text-muted-foreground">
        <span>{t("climateOutlook.region")}</span>
        <Select value={regionId ?? ""} onValueChange={onRegion} disabled={regions.length === 0}>
          <SelectTrigger className="w-full" aria-label={t("climateOutlook.region")}>
            <SelectValue
              placeholder={regions.length ? t("climateOutlook.selectRegion") : t("climateOutlook.noRegions")}
            />
          </SelectTrigger>
          <SelectContent>
            {regions.map((r) => (
              <SelectItem key={r.id} value={r.id}>
                {r.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </label>

      <label className="space-y-1 text-xs text-muted-foreground">
        <span>{t("climateOutlook.district")}</span>
        <Select value={districtId ?? ""} onValueChange={onDistrict} disabled={districts.length === 0}>
          <SelectTrigger className="w-full" aria-label={t("climateOutlook.district")}>
            <SelectValue
              placeholder={districts.length ? t("climateOutlook.selectDistrict") : t("climateOutlook.noDistricts")}
            />
          </SelectTrigger>
          <SelectContent>
            {districts.map((d) => (
              <SelectItem key={d.id} value={d.id}>
                {d.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </label>
    </div>
  )
}
