"use client"

import { useMemo } from "react"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useAdminPortfolio } from "@/hooks/use-admin-portfolio"
import type { PortfolioFacility, ResilienceTier } from "@/lib/dashboard/admin-portfolio-types"

const TIER_FILL: Record<ResilienceTier, string> = {
  Resilient: "var(--color-success)",
  Developing: "var(--color-primary)",
  "At risk": "var(--color-warning)",
  Critical: "var(--color-destructive)",
}
const TIER_DOT: Record<ResilienceTier, string> = {
  Resilient: "bg-success",
  Developing: "bg-primary",
  "At risk": "bg-warning",
  Critical: "bg-destructive",
}
const TIER_ORDER: ResilienceTier[] = ["Resilient", "Developing", "At risk", "Critical"]
const UNASSESSED_FILL = "var(--color-muted-foreground)"

const VIEW_W = 360
const VIEW_H = 260
const PAD = 24

type Marker = { cx: number; cy: number; fill: string; name: string; label: string }

/**
 * Project facilities with real coordinates into the SVG viewBox by auto-fitting
 * their lat/lon bounding box. Colour assessed facilities by tier; grey for
 * unassessed. Degenerate spans (single point) center the marker.
 */
function project(rows: PortfolioFacility[]): Marker[] {
  const mapped = rows.filter((r) => r.lat != null && r.lon != null)
  if (mapped.length === 0) return []
  const lats = mapped.map((r) => r.lat as number)
  const lons = mapped.map((r) => r.lon as number)
  const minLat = Math.min(...lats)
  const maxLat = Math.max(...lats)
  const minLon = Math.min(...lons)
  const maxLon = Math.max(...lons)
  const spanLat = maxLat - minLat || 1
  const spanLon = maxLon - minLon || 1

  return mapped.map((r) => {
    const lon = r.lon as number
    const lat = r.lat as number
    const x = PAD + ((lon - minLon) / spanLon) * (VIEW_W - 2 * PAD)
    // invert latitude: higher lat -> closer to the top
    const y = PAD + ((maxLat - lat) / spanLat) * (VIEW_H - 2 * PAD)
    const fill = r.tier ? TIER_FILL[r.tier] : UNASSESSED_FILL
    return {
      cx: x,
      cy: y,
      fill,
      name: r.name,
      label: r.tier ? r.tier : "Not assessed",
    }
  })
}

/**
 * Portfolio map: every facility with coordinates plotted by real lat/lon,
 * coloured by resilience tier. Lightweight inline SVG (no map library,
 * offline-friendly). Facilities without coordinates are listed separately.
 */
export function AdminPortfolioMap() {
  const { facilities, isLoading, isError } = useAdminPortfolio()
  const markers = useMemo(() => project(facilities), [facilities])
  const unmapped = useMemo(() => facilities.filter((r) => r.lat == null || r.lon == null), [facilities])
  const counts = useMemo(
    () => TIER_ORDER.map((tier) => ({ tier, n: facilities.filter((r) => r.tier === tier).length })),
    [facilities],
  )
  const unassessedCount = useMemo(() => facilities.filter((r) => r.climateRcs == null).length, [facilities])

  if (isLoading) {
    return <div className="h-64 animate-pulse rounded-lg bg-muted" />
  }
  if (isError) {
    return <p className="text-sm text-destructive">Could not load facilities. Please retry.</p>
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base">Facility map</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {markers.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No facilities have coordinates yet. Add latitude/longitude to map them.
          </p>
        ) : (
          <svg
            viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
            className="h-auto w-full"
            role="img"
            aria-label={`Map of ${markers.length} located facilities, coloured by resilience tier: ${counts
              .map((c) => `${c.n} ${c.tier}`)
              .join(", ")}`}
          >
            <rect
              x="1"
              y="1"
              width={VIEW_W - 2}
              height={VIEW_H - 2}
              rx="6"
              fill="var(--color-muted)"
              stroke="var(--color-border)"
            />
            {markers.map((m, i) => (
              <circle key={i} cx={m.cx} cy={m.cy} r={5} fill={m.fill} stroke="white" strokeWidth="1.5">
                <title>{`${m.name}: ${m.label}`}</title>
              </circle>
            ))}
          </svg>
        )}

        {/* Legend */}
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
          {counts.map((c) => (
            <li key={c.tier} className="flex items-center gap-1.5 text-xs">
              <span className={cn("size-3 rounded-full", TIER_DOT[c.tier])} aria-hidden />
              <span className="text-foreground">{c.tier}</span>
              <span className="font-semibold tabular-nums text-muted-foreground">{c.n}</span>
            </li>
          ))}
          {unassessedCount > 0 && (
            <li className="flex items-center gap-1.5 text-xs">
              <span className="size-3 rounded-full bg-muted-foreground" aria-hidden />
              <span className="text-foreground">Not assessed</span>
              <span className="font-semibold tabular-nums text-muted-foreground">{unassessedCount}</span>
            </li>
          )}
        </ul>

        {unmapped.length > 0 && (
          <div className="mt-4 border-t border-border pt-3">
            <p className="text-xs font-medium text-muted-foreground">
              Unmapped facilities ({unmapped.length}) - no coordinates
            </p>
            <ul className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
              {unmapped.map((f) => (
                <li key={f.id}>{f.name}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
