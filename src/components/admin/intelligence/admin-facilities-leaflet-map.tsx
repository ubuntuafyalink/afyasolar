"use client"

import "leaflet/dist/leaflet.css"
import * as React from "react"
import L from "leaflet"
import { LocateFixed } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { FOCUS_RING } from "@/lib/dashboard/facility-ui"
import type { PortfolioFacility, ResilienceTier } from "@/lib/dashboard/admin-portfolio-types"

type TierFilter = "all" | ResilienceTier | "not-assessed"

function FilterChip({
  active,
  label,
  count,
  dot,
  onClick,
}: {
  active: boolean
  label: string
  count: number
  dot?: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
        FOCUS_RING,
        active
          ? "border-primary bg-primary/10 text-foreground"
          : "border-border bg-background text-muted-foreground hover:bg-muted",
      )}
    >
      {dot && <span className={cn("size-2.5 rounded-full ring-1 ring-white", dot)} aria-hidden />}
      {label}
      <span className="tabular-nums opacity-70">{count}</span>
    </button>
  )
}

// Hex colours (Leaflet renders markers as SVG paths; CSS vars are unreliable there).
const TIER_HEX: Record<ResilienceTier, string> = {
  Resilient: "#16a34a",
  Developing: "#2563eb",
  "At risk": "#f59e0b",
  Critical: "#ef4444",
}
const UNASSESSED_HEX = "#9ca3af"
const TIER_ORDER: ResilienceTier[] = ["Resilient", "Developing", "At risk", "Critical"]
const TIER_DOT: Record<ResilienceTier, string> = {
  Resilient: "bg-success",
  Developing: "bg-primary",
  "At risk": "bg-warning",
  Critical: "bg-destructive",
}
const DEFAULT_CENTER: [number, number] = [-6.4, 35]
const DEFAULT_ZOOM = 6

function escapeHtml(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] as string)
}

function exposureBand(score: number): string {
  if (score >= 66) return "high"
  if (score >= 40) return "moderate"
  return "low"
}

/** Short climate blurb for a facility's hover tooltip. */
function climateBlurb(f: PortfolioFacility): string {
  if (!f.climate) return '<span style="opacity:0.7">Climate data pending</span>'
  const th = f.climate.topHazard
  return (
    `Top hazard: <strong>${escapeHtml(th.type)} ${th.score}</strong> (${exposureBand(th.score)})<br/>` +
    `Climate vulnerability: <strong>${f.climate.composite}</strong>/100`
  )
}

/**
 * Real OpenStreetMap-tile facility map. Driven by Leaflet imperatively (not
 * react-leaflet) with a map-instance ref guard + cleanup, so it initialises the
 * container exactly once and survives React 18 StrictMode / HMR remounts.
 */
export function AdminFacilitiesLeafletMap({ facilities }: { facilities: PortfolioFacility[] }) {
  const [tierFilter, setTierFilter] = React.useState<TierFilter>("all")
  const mapped = React.useMemo(() => facilities.filter((f) => f.lat != null && f.lon != null), [facilities])
  const unmapped = React.useMemo(() => facilities.filter((f) => f.lat == null || f.lon == null), [facilities])

  // Tier counts over MAPPABLE facilities (only these can appear as pins).
  const tierCounts = React.useMemo(() => {
    const c: Record<string, number> = { Resilient: 0, Developing: 0, "At risk": 0, Critical: 0, "not-assessed": 0 }
    for (const f of mapped) {
      if (f.climateRcs == null) c["not-assessed"] += 1
      else if (f.tier) c[f.tier] += 1
    }
    return c
  }, [mapped])

  // Markers shown: all, a single tier, or unassessed.
  const visible = React.useMemo(() => {
    if (tierFilter === "all") return mapped
    if (tierFilter === "not-assessed") return mapped.filter((f) => f.climateRcs == null)
    return mapped.filter((f) => f.tier === tierFilter)
  }, [mapped, tierFilter])

  const mapRef = React.useRef<L.Map | null>(null)
  const layerRef = React.useRef<L.LayerGroup | null>(null)
  const pointsRef = React.useRef<[number, number][]>([])
  const roRef = React.useRef<ResizeObserver | null>(null)

  // Fit the map to all plotted facilities (used on first draw + the Recenter button).
  const recenter = React.useCallback(() => {
    const map = mapRef.current
    if (!map) return
    if (pointsRef.current.length > 0) {
      map.fitBounds(L.latLngBounds(pointsRef.current), { padding: [32, 32], maxZoom: 9 })
    } else {
      map.setView(DEFAULT_CENTER, DEFAULT_ZOOM)
    }
  }, [])

  // Callback ref: init Leaflet exactly when the container mounts; tear down on
  // unmount. The mapRef guard blocks StrictMode/HMR double-init. invalidateSize
  // (on a tick + on resize) fixes partial/grey tile rendering.
  const setContainer = React.useCallback((node: HTMLDivElement | null) => {
    if (node && !mapRef.current) {
      const map = L.map(node, { scrollWheelZoom: true, zoomControl: true }).setView(DEFAULT_CENTER, DEFAULT_ZOOM)
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 18,
      }).addTo(map)
      layerRef.current = L.layerGroup().addTo(map)
      mapRef.current = map
      // Ensure correct sizing once layout settles, then again shortly after.
      requestAnimationFrame(() => map.invalidateSize())
      setTimeout(() => map.invalidateSize(), 250)
      const ro = new ResizeObserver(() => map.invalidateSize())
      ro.observe(node)
      roRef.current = ro
    } else if (!node && mapRef.current) {
      roRef.current?.disconnect()
      roRef.current = null
      mapRef.current.remove()
      mapRef.current = null
      layerRef.current = null
    }
  }, [])

  // (Re)draw markers + fit bounds whenever the visible facilities change.
  React.useEffect(() => {
    const map = mapRef.current
    const layer = layerRef.current
    if (!map || !layer) return
    layer.clearLayers()
    const points: [number, number][] = []
    for (const f of visible) {
      const color = f.tier ? TIER_HEX[f.tier] : UNASSESSED_HEX
      const lat = f.lat as number
      const lon = f.lon as number
      const marker = L.circleMarker([lat, lon], {
        radius: 8,
        color: "#ffffff",
        weight: 2,
        fillColor: color,
        fillOpacity: 1,
      })
      const meta = [f.region, f.category].filter(Boolean).map((x) => escapeHtml(x as string)).join(" &middot; ") || "—"
      const rcsLine = f.climateRcs != null ? `RCS ${f.climateRcs} &middot; ${escapeHtml(f.tier ?? "")}` : "Not assessed"
      marker.bindTooltip(
        `<div style="font-size:11px;line-height:1.45;max-width:220px">` +
          `<strong>${escapeHtml(f.name)}</strong><br/>` +
          `<span style="opacity:0.7">${meta}</span><br/>` +
          `${climateBlurb(f)}<br/>` +
          `<span style="opacity:0.85">${rcsLine}</span>` +
          `</div>`,
      )
      marker.addTo(layer)
      points.push([lat, lon])
    }
    pointsRef.current = points
    if (points.length) {
      map.fitBounds(L.latLngBounds(points), { padding: [32, 32], maxZoom: 9 })
    }
  }, [visible])

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base">Facility map</CardTitle>
        {mapped.length > 0 && (
          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={recenter}>
            <LocateFixed aria-hidden className="size-3.5" />
            Recenter
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {mapped.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No facilities have coordinates yet. Add latitude/longitude to map them.
          </p>
        ) : (
          <>
            {/* Filter the map by resilience tier (acts as a clickable legend). */}
            <div className="mb-3 flex flex-wrap items-center gap-1.5">
              <FilterChip active={tierFilter === "all"} label="All" count={mapped.length} onClick={() => setTierFilter("all")} />
              {TIER_ORDER.map((t) => (
                <FilterChip
                  key={t}
                  active={tierFilter === t}
                  label={t}
                  count={tierCounts[t]}
                  dot={TIER_DOT[t]}
                  onClick={() => setTierFilter(t)}
                />
              ))}
              <FilterChip
                active={tierFilter === "not-assessed"}
                label="Not assessed"
                count={tierCounts["not-assessed"]}
                dot="bg-muted-foreground"
                onClick={() => setTierFilter("not-assessed")}
              />
            </div>
            <div ref={setContainer} className="h-[460px] w-full overflow-hidden rounded-lg border border-border" />
            {visible.length === 0 && (
              <p className="mt-2 text-xs text-muted-foreground">No facilities in this category.</p>
            )}
          </>
        )}

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
