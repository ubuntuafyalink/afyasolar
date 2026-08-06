"use client"

import { cn } from "@/lib/utils"
import { useT } from "./facility-preferences-provider"

/**
 * Lightweight, offline-friendly SCHEMATIC locator map of the pilot regions
 * (Dar es Salaam / Pwani / Morogoro) inline SVG, no map library and no network
 * tiles, so it works on slow/offline rural connections. The facility's region is
 * highlighted with a marker. Not geographically precise; a production build would
 * swap this for a real basemap (Leaflet/MapLibre).
 */

type RegionKey = "Dar es Salaam" | "Pwani" | "Morogoro"

const ZONES: Record<RegionKey, { label: string; marker: { x: number; y: number } }> = {
  Morogoro: { label: "Morogoro", marker: { x: 92, y: 132 } },
  Pwani: { label: "Pwani", marker: { x: 205, y: 120 } },
  "Dar es Salaam": { label: "Dar es Salaam", marker: { x: 243, y: 132 } },
}

export function FacilityLocatorMap({
  region,
  facilityName,
  className,
}: {
  region?: string | null
  facilityName?: string | null
  className?: string
}) {
  const t = useT()
  const active = (region && region in ZONES ? region : "Pwani") as RegionKey
  const marker = ZONES[active].marker

  const zoneFill = (key: RegionKey) =>
    key === active ? "var(--color-primary)" : "var(--color-muted)"
  const zoneOpacity = (key: RegionKey) => (key === active ? 0.18 : 1)

  return (
    <figure className={cn("rounded-xl border border-border bg-card p-3", className)}>
      <svg
        viewBox="0 0 320 240"
        className="h-auto w-full"
        role="img"
        aria-label={t("climateOutlook.mapAria", {
          facility: facilityName || t("climateOutlook.facility"),
          region: active,
        })}
      >
        {/* Indian Ocean */}
        <rect x="262" y="0" width="58" height="240" fill="var(--color-chart-3)" opacity="0.18" />
        <text x="291" y="16" textAnchor="middle" className="fill-muted-foreground" style={{ fontSize: 8 }}>
          {t("climateOutlook.ocean")}
        </text>

        {/* Morogoro (inland) */}
        <path
          d="M20 70 L150 55 L150 205 L30 210 Z"
          fill={zoneFill("Morogoro")}
          fillOpacity={zoneOpacity("Morogoro")}
          stroke="var(--color-border)"
        />
        {/* Pwani (coastal) */}
        <path
          d="M150 45 L262 40 L262 212 L150 205 Z"
          fill={zoneFill("Pwani")}
          fillOpacity={zoneOpacity("Pwani")}
          stroke="var(--color-border)"
        />
        {/* Dar es Salaam (coastal city block within Pwani) */}
        <rect
          x="224"
          y="112"
          width="38"
          height="40"
          rx="3"
          fill={zoneFill("Dar es Salaam")}
          fillOpacity={zoneOpacity("Dar es Salaam")}
          stroke="var(--color-border)"
        />

        {/* Zone labels */}
        <text x="80" y="135" textAnchor="middle" className="fill-foreground" style={{ fontSize: 9 }}>
          Morogoro
        </text>
        <text x="195" y="70" textAnchor="middle" className="fill-foreground" style={{ fontSize: 9 }}>
          Pwani
        </text>

        {/* Facility marker */}
        <g transform={`translate(${marker.x}, ${marker.y})`}>
          <circle r="9" fill="var(--color-primary)" opacity="0.25" />
          <circle r="4" fill="var(--color-primary)" stroke="white" strokeWidth="1.5" />
        </g>
      </svg>
      <figcaption className="mt-2 text-center text-xs text-muted-foreground">
        {t("climateOutlook.mapCaption", { region: active })}
      </figcaption>
    </figure>
  )
}
