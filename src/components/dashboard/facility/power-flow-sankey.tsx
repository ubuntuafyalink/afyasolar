"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getPowerSnapshot } from "@/lib/dashboard/facility-demo-data"

/** Map a kW value to a readable link thickness. */
function linkWidth(kw: number): number {
  return Math.max(2, Math.min(26, 2 + kw * 5))
}

/**
 * Spec 8.2 "Umeme detail": a Sankey-style power-flow diagram — solar production,
 * facility consumption, battery State of Charge and grid status. Hand-drawn SVG
 * (token-styled) so it stays light and fully controllable for the 4-node case.
 */
export function PowerFlowSankey({
  facilityId,
  batteryLevel,
}: {
  facilityId?: string
  batteryLevel?: number
}) {
  const snap = getPowerSnapshot(facilityId, batteryLevel)
  const solarToLoad = Math.min(snap.solarKw, snap.loadKw)
  const batteryDischarge = Math.max(0, -snap.batteryKw)
  const batteryCharge = Math.max(0, snap.batteryKw)

  // Node coordinates (viewBox 0 0 320 180).
  const loadXY = { x: 250, y: 80 }
  const nodes = {
    solar: { x: 24, y: 30 },
    grid: { x: 24, y: 90 },
    battery: { x: 24, y: 150 },
  }

  const links: { from: { x: number; y: number }; to: { x: number; y: number }; kw: number; color: string }[] = []
  if (solarToLoad > 0)
    links.push({ from: nodes.solar, to: loadXY, kw: solarToLoad, color: "var(--color-warning)" })
  if (snap.gridKw > 0)
    links.push({ from: nodes.grid, to: loadXY, kw: snap.gridKw, color: "var(--color-muted-foreground)" })
  if (batteryDischarge > 0)
    links.push({ from: nodes.battery, to: loadXY, kw: batteryDischarge, color: "var(--color-success)" })
  if (batteryCharge > 0)
    links.push({ from: nodes.solar, to: nodes.battery, kw: batteryCharge, color: "var(--color-warning)" })

  const sourceTiles = [
    { key: "solar", label: "Solar", value: snap.solarKw, ...nodes.solar, color: "var(--color-warning)" },
    { key: "grid", label: "Grid", value: snap.gridKw, ...nodes.grid, color: "var(--color-muted-foreground)" },
    {
      key: "battery",
      label: `Battery ${snap.batterySocPct}%`,
      value: Math.abs(snap.batteryKw),
      ...nodes.battery,
      color: "var(--color-success)",
    },
  ]

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Power flow now</CardTitle>
        <p className="text-xs text-muted-foreground">Where your power is coming from and going right now.</p>
      </CardHeader>
      <CardContent>
        <svg viewBox="0 0 320 180" className="h-48 w-full" role="img" aria-label="Current power flow diagram">
          {links.map((l, i) => (
            <path
              key={i}
              d={`M ${l.from.x + 8} ${l.from.y} C ${(l.from.x + l.to.x) / 2} ${l.from.y}, ${(l.from.x + l.to.x) / 2} ${l.to.y}, ${l.to.x - 8} ${l.to.y}`}
              stroke={l.color}
              strokeWidth={linkWidth(l.kw)}
              strokeOpacity={0.45}
              fill="none"
              strokeLinecap="round"
            />
          ))}

          {sourceTiles.map((t) => (
            <g key={t.key}>
              <circle cx={t.x} cy={t.y} r="9" fill={t.color} />
              <text x={t.x + 16} y={t.y - 2} fontSize="10" fill="var(--color-foreground)" fontWeight="600">
                {t.label}
              </text>
              <text x={t.x + 16} y={t.y + 10} fontSize="9" fill="var(--color-muted-foreground)">
                {t.value.toFixed(1)} kW
              </text>
            </g>
          ))}

          <g>
            <circle cx={loadXY.x} cy={loadXY.y} r="11" fill="var(--color-primary)" />
            <text x={loadXY.x} y={loadXY.y - 16} fontSize="10" fill="var(--color-foreground)" fontWeight="600" textAnchor="middle">
              Facility
            </text>
            <text x={loadXY.x} y={loadXY.y + 26} fontSize="9" fill="var(--color-muted-foreground)" textAnchor="middle">
              {snap.loadKw.toFixed(1)} kW
            </text>
          </g>
        </svg>
      </CardContent>
    </Card>
  )
}
