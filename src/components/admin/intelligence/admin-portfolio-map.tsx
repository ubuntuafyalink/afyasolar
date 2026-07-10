"use client"

import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DemoDataBadge } from "@/components/ui/demo-data-badge"
import { getPortfolioRows, type PortfolioRow, type ResilienceTier } from "@/lib/dashboard/admin-portfolio-data"

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

// Bounding boxes (within a 360x260 viewBox) where each region's markers cluster.
const REGION_BOX: Record<string, { x: number; y: number; w: number; h: number }> = {
  Morogoro: { x: 34, y: 74, w: 104, h: 120 },
  Pwani: { x: 158, y: 60, w: 86, h: 140 },
  "Dar es Salaam": { x: 250, y: 96, w: 44, h: 60 },
}

type Marker = { cx: number; cy: number; tier: ResilienceTier; name: string }

/** Lay a region's facilities out in a tidy grid inside its bounding box. */
function placeMarkers(rows: PortfolioRow[]): Marker[] {
  const byRegion = new Map<string, PortfolioRow[]>()
  for (const r of rows) {
    const list = byRegion.get(r.region) ?? []
    list.push(r)
    byRegion.set(r.region, list)
  }
  const markers: Marker[] = []
  for (const [region, list] of byRegion) {
    const box = REGION_BOX[region]
    if (!box) continue
    const cols = Math.ceil(Math.sqrt(list.length))
    const rowsN = Math.ceil(list.length / cols)
    list.forEach((f, i) => {
      const col = i % cols
      const row = Math.floor(i / cols)
      const cx = box.x + ((col + 0.5) / cols) * box.w
      const cy = box.y + ((row + 0.5) / rowsN) * box.h
      markers.push({ cx, cy, tier: f.tier as ResilienceTier, name: f.name })
    })
  }
  return markers
}

/**
 * Portfolio map: every facility plotted in its region, coloured by resilience
 * tier. Lightweight inline SVG (no map library, offline-friendly). Simulated.
 */
export function AdminPortfolioMap() {
  const rows = getPortfolioRows()
  const markers = placeMarkers(rows)
  const counts = TIER_ORDER.map((tier) => ({ tier, n: rows.filter((r) => r.tier === tier).length }))

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base">Facility map</CardTitle>
          <DemoDataBadge />
        </div>
      </CardHeader>
      <CardContent>
        <svg
          viewBox="0 0 360 260"
          className="h-auto w-full"
          role="img"
          aria-label={`Map of ${rows.length} facilities by region, coloured by resilience tier: ${counts
            .map((c) => `${c.n} ${c.tier}`)
            .join(", ")}`}
        >
          {/* Indian Ocean */}
          <rect x="300" y="0" width="60" height="260" fill="var(--color-chart-3)" opacity="0.18" />
          <text x="330" y="16" textAnchor="middle" className="fill-muted-foreground" style={{ fontSize: 8 }}>
            Indian Ocean
          </text>

          {/* Region zones */}
          <path d="M28 70 L150 56 L150 200 L40 206 Z" fill="var(--color-muted)" stroke="var(--color-border)" />
          <path d="M154 50 L250 46 L250 210 L154 200 Z" fill="var(--color-muted)" stroke="var(--color-border)" />
          <rect x="248" y="92" width="50" height="68" rx="3" fill="var(--color-muted)" stroke="var(--color-border)" />

          <text x="84" y="206" textAnchor="middle" className="fill-foreground" style={{ fontSize: 9 }}>
            Morogoro
          </text>
          <text x="200" y="64" textAnchor="middle" className="fill-foreground" style={{ fontSize: 9 }}>
            Pwani
          </text>
          <text x="273" y="172" textAnchor="middle" className="fill-foreground" style={{ fontSize: 8 }}>
            Dar es Salaam
          </text>

          {/* Facility markers */}
          {markers.map((m, i) => (
            <circle
              key={i}
              cx={m.cx}
              cy={m.cy}
              r={5}
              fill={TIER_FILL[m.tier]}
              stroke="white"
              strokeWidth="1.5"
            >
              <title>{`${m.name}: ${m.tier}`}</title>
            </circle>
          ))}
        </svg>

        {/* Legend */}
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
          {counts.map((c) => (
            <li key={c.tier} className="flex items-center gap-1.5 text-xs">
              <span className={cn("size-3 rounded-full", TIER_DOT[c.tier])} aria-hidden />
              <span className="text-foreground">{c.tier}</span>
              <span className="font-semibold tabular-nums text-muted-foreground">{c.n}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
