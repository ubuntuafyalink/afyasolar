/**
 * Bundled, offline location dataset for the Country -> Region -> District
 * cascade. Worldwide-capable in shape, populated with a focus on Africa.
 *
 * Depth:
 *  - All 54 African countries with a representative (centroid/capital) point.
 *  - Tanzania: full regions + districts, transcribed from the DB seed
 *    (src/lib/db/seed-regions-districts.ts) so the cascade matches the platform
 *    (e.g. Dar es Salaam -> Temeke, Ubungo, Ilala, Kigamboni).
 *  - A curated set of other countries (Kenya, Uganda, Rwanda, Nigeria, Ghana,
 *    Ethiopia, South Africa, Egypt) with their main regions/states.
 *
 * Coordinates: regions carry a representative point; districts usually omit
 * coordinates and resolve to their region's point (NASA POWER only needs a
 * representative lat/lon, so this is sufficient). The dataset is intentionally
 * easy to extend - add rows and the cascade/map pick them up automatically.
 *
 * IDs: country = ISO-3166 alpha-2 (lowercase). region = `${countryId}-<n>`.
 * district = `${countryId}-d<n>`.
 */

export type GeoCoords = { lat: number; lon: number }
export type GeoCountry = { id: string; name: string; coords: GeoCoords }
export type GeoRegion = { id: string; countryId: string; name: string; coords?: GeoCoords }
export type GeoDistrict = { id: string; regionId: string; name: string; coords?: GeoCoords }

export type LocationSelection = {
  countryId?: string
  regionId?: string
  districtId?: string
}

export type ResolvedLocation = { lat: number; lon: number; label: string }

// ---------------------------------------------------------------------------
// Countries (Africa) - representative point each
// ---------------------------------------------------------------------------

export const COUNTRIES: GeoCountry[] = [
  { id: "dz", name: "Algeria", coords: { lat: 28.03, lon: 1.66 } },
  { id: "ao", name: "Angola", coords: { lat: -11.2, lon: 17.87 } },
  { id: "bj", name: "Benin", coords: { lat: 9.31, lon: 2.32 } },
  { id: "bw", name: "Botswana", coords: { lat: -22.33, lon: 24.68 } },
  { id: "bf", name: "Burkina Faso", coords: { lat: 12.24, lon: -1.56 } },
  { id: "bi", name: "Burundi", coords: { lat: -3.37, lon: 29.92 } },
  { id: "cv", name: "Cabo Verde", coords: { lat: 16.0, lon: -24.01 } },
  { id: "cm", name: "Cameroon", coords: { lat: 7.37, lon: 12.35 } },
  { id: "cf", name: "Central African Republic", coords: { lat: 6.61, lon: 20.94 } },
  { id: "td", name: "Chad", coords: { lat: 15.45, lon: 18.73 } },
  { id: "km", name: "Comoros", coords: { lat: -11.65, lon: 43.34 } },
  { id: "cg", name: "Congo (Republic)", coords: { lat: -0.23, lon: 15.83 } },
  { id: "cd", name: "Congo (DRC)", coords: { lat: -4.04, lon: 21.76 } },
  { id: "ci", name: "Cote d'Ivoire", coords: { lat: 7.54, lon: -5.55 } },
  { id: "dj", name: "Djibouti", coords: { lat: 11.83, lon: 42.59 } },
  { id: "eg", name: "Egypt", coords: { lat: 26.82, lon: 30.8 } },
  { id: "gq", name: "Equatorial Guinea", coords: { lat: 1.65, lon: 10.27 } },
  { id: "er", name: "Eritrea", coords: { lat: 15.18, lon: 39.78 } },
  { id: "sz", name: "Eswatini", coords: { lat: -26.52, lon: 31.47 } },
  { id: "et", name: "Ethiopia", coords: { lat: 9.15, lon: 40.49 } },
  { id: "ga", name: "Gabon", coords: { lat: -0.8, lon: 11.61 } },
  { id: "gm", name: "Gambia", coords: { lat: 13.44, lon: -15.31 } },
  { id: "gh", name: "Ghana", coords: { lat: 7.95, lon: -1.02 } },
  { id: "gn", name: "Guinea", coords: { lat: 9.95, lon: -9.7 } },
  { id: "gw", name: "Guinea-Bissau", coords: { lat: 11.8, lon: -15.18 } },
  { id: "ke", name: "Kenya", coords: { lat: -0.02, lon: 37.91 } },
  { id: "ls", name: "Lesotho", coords: { lat: -29.61, lon: 28.23 } },
  { id: "lr", name: "Liberia", coords: { lat: 6.43, lon: -9.43 } },
  { id: "ly", name: "Libya", coords: { lat: 26.34, lon: 17.23 } },
  { id: "mg", name: "Madagascar", coords: { lat: -18.77, lon: 46.87 } },
  { id: "mw", name: "Malawi", coords: { lat: -13.25, lon: 34.3 } },
  { id: "ml", name: "Mali", coords: { lat: 17.57, lon: -4.0 } },
  { id: "mr", name: "Mauritania", coords: { lat: 21.01, lon: -10.94 } },
  { id: "mu", name: "Mauritius", coords: { lat: -20.35, lon: 57.55 } },
  { id: "ma", name: "Morocco", coords: { lat: 31.79, lon: -7.09 } },
  { id: "mz", name: "Mozambique", coords: { lat: -18.67, lon: 35.53 } },
  { id: "na", name: "Namibia", coords: { lat: -22.96, lon: 18.49 } },
  { id: "ne", name: "Niger", coords: { lat: 17.61, lon: 8.08 } },
  { id: "ng", name: "Nigeria", coords: { lat: 9.08, lon: 8.68 } },
  { id: "rw", name: "Rwanda", coords: { lat: -1.94, lon: 29.87 } },
  { id: "st", name: "Sao Tome and Principe", coords: { lat: 0.19, lon: 6.61 } },
  { id: "sn", name: "Senegal", coords: { lat: 14.5, lon: -14.45 } },
  { id: "sc", name: "Seychelles", coords: { lat: -4.68, lon: 55.49 } },
  { id: "sl", name: "Sierra Leone", coords: { lat: 8.46, lon: -11.78 } },
  { id: "so", name: "Somalia", coords: { lat: 5.15, lon: 46.2 } },
  { id: "za", name: "South Africa", coords: { lat: -30.56, lon: 22.94 } },
  { id: "ss", name: "South Sudan", coords: { lat: 6.88, lon: 31.31 } },
  { id: "sd", name: "Sudan", coords: { lat: 12.86, lon: 30.22 } },
  { id: "tz", name: "Tanzania", coords: { lat: -6.37, lon: 34.89 } },
  { id: "tg", name: "Togo", coords: { lat: 8.62, lon: 0.82 } },
  { id: "tn", name: "Tunisia", coords: { lat: 33.89, lon: 9.54 } },
  { id: "ug", name: "Uganda", coords: { lat: 1.37, lon: 32.29 } },
  { id: "zm", name: "Zambia", coords: { lat: -13.13, lon: 27.85 } },
  { id: "zw", name: "Zimbabwe", coords: { lat: -19.02, lon: 29.15 } },
]

// ---------------------------------------------------------------------------
// Regions (admin-1)
// ---------------------------------------------------------------------------

const TANZANIA_REGIONS: GeoRegion[] = [
  { id: "tz-1", countryId: "tz", name: "Arusha", coords: { lat: -3.39, lon: 36.68 } },
  { id: "tz-2", countryId: "tz", name: "Dar es Salaam", coords: { lat: -6.79, lon: 39.21 } },
  { id: "tz-3", countryId: "tz", name: "Dodoma", coords: { lat: -6.17, lon: 35.74 } },
  { id: "tz-4", countryId: "tz", name: "Tanga", coords: { lat: -5.07, lon: 38.47 } },
  { id: "tz-7", countryId: "tz", name: "Morogoro", coords: { lat: -6.82, lon: 37.66 } },
  { id: "tz-8", countryId: "tz", name: "Pwani", coords: { lat: -6.44, lon: 38.9 } },
  { id: "tz-9", countryId: "tz", name: "Kilimanjaro", coords: { lat: -3.34, lon: 37.34 } },
  { id: "tz-10", countryId: "tz", name: "Mtwara", coords: { lat: -10.34, lon: 40.18 } },
  { id: "tz-11", countryId: "tz", name: "Lindi", coords: { lat: -9.99, lon: 39.72 } },
  { id: "tz-12", countryId: "tz", name: "Ruvuma", coords: { lat: -10.69, lon: 35.65 } },
  { id: "tz-13", countryId: "tz", name: "Songwe", coords: { lat: -8.5, lon: 32.8 } },
  { id: "tz-14", countryId: "tz", name: "Mbeya", coords: { lat: -8.91, lon: 33.46 } },
  { id: "tz-15", countryId: "tz", name: "Njombe", coords: { lat: -9.34, lon: 34.77 } },
  { id: "tz-16", countryId: "tz", name: "Rukwa", coords: { lat: -7.95, lon: 31.62 } },
  { id: "tz-17", countryId: "tz", name: "Katavi", coords: { lat: -6.4, lon: 31.2 } },
  { id: "tz-19", countryId: "tz", name: "Kigoma", coords: { lat: -4.88, lon: 29.66 } },
  { id: "tz-20", countryId: "tz", name: "Geita", coords: { lat: -2.87, lon: 32.23 } },
  { id: "tz-21", countryId: "tz", name: "Kagera", coords: { lat: -1.33, lon: 31.81 } },
  { id: "tz-22", countryId: "tz", name: "Mwanza", coords: { lat: -2.52, lon: 32.9 } },
  { id: "tz-23", countryId: "tz", name: "Shinyanga", coords: { lat: -3.66, lon: 33.42 } },
  { id: "tz-24", countryId: "tz", name: "Simiyu", coords: { lat: -2.83, lon: 34.15 } },
  { id: "tz-25", countryId: "tz", name: "Mara", coords: { lat: -1.77, lon: 34.15 } },
  { id: "tz-26", countryId: "tz", name: "Manyara", coords: { lat: -4.31, lon: 36.68 } },
  { id: "tz-27", countryId: "tz", name: "Singida", coords: { lat: -4.82, lon: 34.75 } },
  { id: "tz-28", countryId: "tz", name: "Iringa", coords: { lat: -7.77, lon: 35.69 } },
  { id: "tz-29", countryId: "tz", name: "Tabora", coords: { lat: -5.02, lon: 32.8 } },
  { id: "tz-30", countryId: "tz", name: "Songea", coords: { lat: -10.68, lon: 35.65 } },
  { id: "tz-33", countryId: "tz", name: "Pemba Kaskazini", coords: { lat: -4.96, lon: 39.78 } },
  { id: "tz-34", countryId: "tz", name: "Pemba Kusini", coords: { lat: -5.27, lon: 39.7 } },
  { id: "tz-35", countryId: "tz", name: "Unguja Kaskazini", coords: { lat: -5.96, lon: 39.3 } },
  { id: "tz-36", countryId: "tz", name: "Unguja Kusini", coords: { lat: -6.27, lon: 39.44 } },
  { id: "tz-37", countryId: "tz", name: "Unguja Magharibi", coords: { lat: -6.16, lon: 39.2 } },
]

const OTHER_REGIONS: GeoRegion[] = [
  // Kenya
  { id: "ke-1", countryId: "ke", name: "Nairobi", coords: { lat: -1.29, lon: 36.82 } },
  { id: "ke-2", countryId: "ke", name: "Mombasa", coords: { lat: -4.04, lon: 39.67 } },
  { id: "ke-3", countryId: "ke", name: "Kisumu", coords: { lat: -0.09, lon: 34.77 } },
  { id: "ke-4", countryId: "ke", name: "Nakuru", coords: { lat: -0.3, lon: 36.08 } },
  { id: "ke-5", countryId: "ke", name: "Uasin Gishu", coords: { lat: 0.51, lon: 35.27 } },
  { id: "ke-6", countryId: "ke", name: "Kiambu", coords: { lat: -1.17, lon: 36.83 } },
  { id: "ke-7", countryId: "ke", name: "Machakos", coords: { lat: -1.52, lon: 37.26 } },
  { id: "ke-8", countryId: "ke", name: "Kilifi", coords: { lat: -3.51, lon: 39.85 } },
  // Uganda
  { id: "ug-1", countryId: "ug", name: "Kampala", coords: { lat: 0.35, lon: 32.58 } },
  { id: "ug-2", countryId: "ug", name: "Wakiso", coords: { lat: 0.4, lon: 32.48 } },
  { id: "ug-3", countryId: "ug", name: "Gulu", coords: { lat: 2.77, lon: 32.3 } },
  { id: "ug-4", countryId: "ug", name: "Mbarara", coords: { lat: -0.61, lon: 30.66 } },
  { id: "ug-5", countryId: "ug", name: "Jinja", coords: { lat: 0.44, lon: 33.2 } },
  // Rwanda
  { id: "rw-1", countryId: "rw", name: "Kigali", coords: { lat: -1.94, lon: 30.06 } },
  { id: "rw-2", countryId: "rw", name: "Northern", coords: { lat: -1.5, lon: 29.75 } },
  { id: "rw-3", countryId: "rw", name: "Southern", coords: { lat: -2.3, lon: 29.75 } },
  { id: "rw-4", countryId: "rw", name: "Eastern", coords: { lat: -1.8, lon: 30.6 } },
  { id: "rw-5", countryId: "rw", name: "Western", coords: { lat: -2.1, lon: 29.3 } },
  // Nigeria
  { id: "ng-1", countryId: "ng", name: "Lagos", coords: { lat: 6.52, lon: 3.38 } },
  { id: "ng-2", countryId: "ng", name: "Kano", coords: { lat: 12.0, lon: 8.52 } },
  { id: "ng-3", countryId: "ng", name: "Abuja (FCT)", coords: { lat: 9.06, lon: 7.5 } },
  { id: "ng-4", countryId: "ng", name: "Rivers", coords: { lat: 4.82, lon: 7.03 } },
  { id: "ng-5", countryId: "ng", name: "Oyo", coords: { lat: 7.38, lon: 3.9 } },
  { id: "ng-6", countryId: "ng", name: "Kaduna", coords: { lat: 10.52, lon: 7.44 } },
  // Ghana
  { id: "gh-1", countryId: "gh", name: "Greater Accra", coords: { lat: 5.6, lon: -0.19 } },
  { id: "gh-2", countryId: "gh", name: "Ashanti", coords: { lat: 6.69, lon: -1.62 } },
  { id: "gh-3", countryId: "gh", name: "Northern", coords: { lat: 9.4, lon: -0.84 } },
  { id: "gh-4", countryId: "gh", name: "Western", coords: { lat: 4.93, lon: -1.76 } },
  // Ethiopia
  { id: "et-1", countryId: "et", name: "Addis Ababa", coords: { lat: 9.03, lon: 38.74 } },
  { id: "et-2", countryId: "et", name: "Oromia", coords: { lat: 8.5, lon: 39.0 } },
  { id: "et-3", countryId: "et", name: "Amhara", coords: { lat: 11.5, lon: 37.5 } },
  { id: "et-4", countryId: "et", name: "Tigray", coords: { lat: 14.0, lon: 38.5 } },
  // South Africa
  { id: "za-1", countryId: "za", name: "Gauteng", coords: { lat: -26.2, lon: 28.05 } },
  { id: "za-2", countryId: "za", name: "Western Cape", coords: { lat: -33.92, lon: 18.42 } },
  { id: "za-3", countryId: "za", name: "KwaZulu-Natal", coords: { lat: -29.86, lon: 31.02 } },
  { id: "za-4", countryId: "za", name: "Eastern Cape", coords: { lat: -32.3, lon: 26.4 } },
  // Egypt
  { id: "eg-1", countryId: "eg", name: "Cairo", coords: { lat: 30.04, lon: 31.24 } },
  { id: "eg-2", countryId: "eg", name: "Alexandria", coords: { lat: 31.2, lon: 29.92 } },
  { id: "eg-3", countryId: "eg", name: "Giza", coords: { lat: 30.01, lon: 31.21 } },
]

export const REGIONS: GeoRegion[] = [...TANZANIA_REGIONS, ...OTHER_REGIONS]

// ---------------------------------------------------------------------------
// Districts (admin-2) - Tanzania, from the DB seed (resolve coords to region)
// ---------------------------------------------------------------------------

/** [districtName, regionSeedId] pairs transcribed from the DB seed. */
const TZ_DISTRICTS: [string, number][] = [
  ["Kinondoni", 2], ["Ngorongoro", 1], ["Arusha", 1], ["Arumeru", 1], ["Longido", 1],
  ["Monduli", 1], ["Karatu", 1], ["Ilala", 2], ["Temeke", 2], ["Ubungo", 2],
  ["Kigamboni", 2], ["Dodoma", 3], ["Chamwino", 3], ["Chemba", 3], ["Kondoa", 3],
  ["Bahi", 3], ["Mpwapwa", 3], ["Kongwa", 3], ["Bukombe", 20], ["Mbogwe", 20],
  ["Geita", 20], ["Chato", 20], ["Nyang'wale", 20], ["Iringa", 28], ["Mufindi", 28],
  ["Kilolo", 28], ["Biharamulo", 21], ["Karagwe", 21], ["Muleba", 21], ["Bukoba", 21],
  ["Ngara", 21], ["Missenyi", 21], ["Kyerwa", 21], ["Mlele", 17], ["Mpanda", 17],
  ["Tanganyika", 17], ["Kigoma", 19], ["Kasulu", 19], ["Kankoko", 19], ["Uvinza", 19],
  ["Buhigwe", 19], ["Kibondo", 19], ["Siha", 9], ["Moshi", 9], ["Mwanga", 9],
  ["Rombo", 9], ["Hai", 9], ["Same", 9], ["Nachingwea", 11], ["Ruangwa", 11],
  ["Liwale", 11], ["Lindi", 11], ["Kilwa", 11], ["Babati", 26], ["Mbulu", 26],
  ["Hanang'", 26], ["Kiteto", 26], ["Simanjiro", 26], ["Rorya", 25], ["Serengeti", 25],
  ["Bunda", 25], ["Butiama", 25], ["Tarime", 25], ["Musoma", 25], ["Chunya", 14],
  ["Kyela", 14], ["Mbeya", 14], ["Rungwe", 14], ["Mbarali", 14], ["Gairo", 7],
  ["Kilombero", 7], ["Kilosa", 7], ["Mvomero", 7], ["Morogoro", 7], ["Ulanga", 7],
  ["Malinyi", 7], ["Newala", 10], ["Nanyumbu", 10], ["Mtwara", 10], ["Masasi", 10],
  ["Tandahimba", 10], ["Ilemela", 22], ["Kwimba", 22], ["Sengerema", 22], ["Nyamagana", 22],
  ["Magu", 22], ["Ukerewe", 22], ["Misungwi", 22], ["Njombe", 15], ["Ludewa", 15],
  ["Wang'ing'ombe", 15], ["Makete", 15], ["Bagamoyo", 8], ["Mkuranga", 8], ["Rufiji", 8],
  ["Mafia", 8], ["Kibaha", 8], ["Kisarawe", 8], ["Kibiti", 8], ["Sumbawanga", 16],
  ["Nkasi", 16], ["Kalambo", 16], ["Namtumbo", 12], ["Mbinga", 12], ["Nyasa", 12],
  ["Tunduru", 12], ["Songea", 12], ["Kishapu", 23], ["Kahama", 23], ["Shinyanga", 23],
  ["Busega", 24], ["Maswa", 24], ["Bariadi", 24], ["Meatu", 24], ["Itilima", 24],
  ["Mkalama", 27], ["Manyoni", 27], ["Singida", 27], ["Ikungi", 27], ["Iramba", 27],
  ["Songwe", 13], ["Ileje", 13], ["Mbozi", 13], ["Momba", 13], ["Nzega", 29],
  ["Kaliua", 29], ["Igunga", 29], ["Sikonge", 29], ["Tabora", 29], ["Urambo", 29],
  ["Uyui", 29], ["Tanga", 4], ["Muheza", 4], ["Mkinga", 4], ["Pangani", 4],
  ["Handeni", 4], ["Korogwe", 4], ["Kilindi", 4], ["Lushoto", 4], ["Micheweni", 33],
  ["Wete", 33], ["Chakechake", 34], ["Mkoani", 34], ["Kaskazini A", 35], ["Kaskazini B", 35],
  ["Unguja Kati", 36], ["Unguja Kusini", 36], ["Unguja Magharibi", 37], ["Unguja Mjini", 37],
]

export const DISTRICTS: GeoDistrict[] = TZ_DISTRICTS.map(([name, regionSeedId], i) => ({
  id: `tz-d${i + 1}`,
  regionId: `tz-${regionSeedId}`,
  name,
}))

// ---------------------------------------------------------------------------
// Lookups + helpers
// ---------------------------------------------------------------------------

const COUNTRY_BY_ID = new Map(COUNTRIES.map((c) => [c.id, c]))
const REGION_BY_ID = new Map(REGIONS.map((r) => [r.id, r]))
const DISTRICT_BY_ID = new Map(DISTRICTS.map((d) => [d.id, d]))

export function listCountries(): GeoCountry[] {
  return [...COUNTRIES].sort((a, b) => a.name.localeCompare(b.name))
}

export function regionsFor(countryId: string | undefined): GeoRegion[] {
  if (!countryId) return []
  return REGIONS.filter((r) => r.countryId === countryId).sort((a, b) => a.name.localeCompare(b.name))
}

export function districtsFor(regionId: string | undefined): GeoDistrict[] {
  if (!regionId) return []
  return DISTRICTS.filter((d) => d.regionId === regionId).sort((a, b) => a.name.localeCompare(b.name))
}

export function getCountry(id?: string): GeoCountry | undefined {
  return id ? COUNTRY_BY_ID.get(id) : undefined
}
export function getRegion(id?: string): GeoRegion | undefined {
  return id ? REGION_BY_ID.get(id) : undefined
}
export function getDistrict(id?: string): GeoDistrict | undefined {
  return id ? DISTRICT_BY_ID.get(id) : undefined
}

/** Resolve a selection to coordinates + a human label (district -> region -> country). */
export function coordsFor(sel: LocationSelection): ResolvedLocation | null {
  const district = getDistrict(sel.districtId)
  const region = getRegion(sel.regionId ?? district?.regionId)
  const country = getCountry(sel.countryId ?? region?.countryId)

  const point = district?.coords ?? region?.coords ?? country?.coords
  if (!point) return null

  const label = [district?.name, region?.name, country?.name].filter(Boolean).join(", ")
  return { lat: point.lat, lon: point.lon, label }
}

/** Best-effort default selection from a free-text region name (e.g. "Pwani"). */
export function findRegionByName(name?: string | null): GeoRegion | undefined {
  if (!name) return undefined
  const norm = name.trim().toLowerCase()
  return REGIONS.find((r) => r.name.toLowerCase() === norm)
}
