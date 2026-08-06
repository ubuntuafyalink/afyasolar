/**
 * Reverse geocoding via the free OpenStreetMap Nominatim service (no API key).
 * Turns lat/lon into a human-readable place: the most specific local name plus
 * district, region and country. Used after capturing the device location so the
 * user sees exactly where they are, not just coordinates.
 *
 * Nominatim usage policy: low volume only, max ~1 request/second. This is called
 * on an explicit user action ("Use my current location"), so volume is minimal.
 */

export type ReverseGeocodeResult = {
  /** Concise composed label: "place, district, region, country". */
  label: string
  /** Full Nominatim display name. */
  full: string
  parts: {
    name?: string
    district?: string
    region?: string
    country?: string
  }
}

type NominatimAddress = Record<string, string | undefined>

function composeParts(addr: NominatimAddress) {
  const name =
    addr.road ||
    addr.neighbourhood ||
    addr.suburb ||
    addr.hamlet ||
    addr.village ||
    addr.town ||
    addr.city ||
    addr.municipality
  const district = addr.county || addr.state_district || addr.district || addr.city_district
  const region = addr.state || addr.region || addr.province
  const country = addr.country
  return { name, district, region, country }
}

export async function reverseGeocode(
  lat: number,
  lon: number,
  lang = "en",
): Promise<ReverseGeocodeResult | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=16&addressdetails=1`,
      { headers: { "Accept-Language": lang } },
    )
    if (!res.ok) return null
    const data = await res.json()
    const addr: NominatimAddress = data?.address ?? {}
    const parts = composeParts(addr)
    const label = [parts.name, parts.district, parts.region, parts.country].filter(Boolean).join(", ")
    return {
      label: label || data?.display_name || "",
      full: data?.display_name || label || "",
      parts,
    }
  } catch {
    return null
  }
}
