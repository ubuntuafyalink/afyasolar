"use client"

import { useMemo, useState } from "react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { StatCard } from "@/components/ui/stat-card"
import { cn } from "@/lib/utils"
import { FOCUS_RING } from "@/lib/dashboard/facility-ui"
import { Droplet, Info, OctagonAlert, PackageCheck, Sun, Waves, Wind } from "lucide-react"
import { useAdminPortfolio } from "@/hooks/use-admin-portfolio"
import type { PortfolioFacility } from "@/lib/dashboard/admin-portfolio-types"

type Hazard = "flood" | "heat" | "storm" | "drought"
const HAZARDS: Hazard[] = ["flood", "heat", "storm", "drought"]

const HAZARD_LABEL: Record<Hazard, string> = {
  flood: "Flood",
  heat: "Heatwave",
  storm: "Storm",
  drought: "Drought",
}

/** Static pre-positioning guidance per hazard (operational advice, not data). */
const HAZARD_GUIDANCE: Record<Hazard, string> = {
  flood: "Pre-position water storage, raise equipment off the floor, and stage backup power for pumping.",
  heat: "Stage backup cold boxes and generator fuel for the vaccine cold-chain; verify ventilation.",
  storm: "Secure roofing and solar panels; stage backup lighting and power for delivery and neonatal care.",
  drought: "Pre-position water storage and backup pumping for sanitation and maternity needs.",
}

function hazardIcon(hazard: Hazard) {
  if (hazard === "flood") return <Waves aria-hidden className="size-4" />
  if (hazard === "heat") return <Sun aria-hidden className="size-4" />
  if (hazard === "storm") return <Wind aria-hidden className="size-4" />
  return <Droplet aria-hidden className="size-4" />
}

function impactAccent(score: number): "destructive" | "warning" | "success" {
  if (score >= 60) return "destructive"
  if (score >= 35) return "warning"
  return "success"
}
function impactBarClass(score: number): string {
  if (score >= 60) return "bg-destructive"
  if (score >= 35) return "bg-warning"
  return "bg-success"
}

function SelectorChip({
  active,
  children,
  onClick,
}: {
  active: boolean
  children: React.ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
        FOCUS_RING,
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-background text-muted-foreground hover:bg-muted",
      )}
    >
      {children}
    </button>
  )
}

function hazardScore(f: PortfolioFacility, hazard: Hazard): number | null {
  if (!f.climate) return null
  return f.climate.byHazard[hazard]
}

/**
 * Surge planning driven by real NASA POWER hazard exposure. Facilities are
 * grouped by real region; impact is each facility's real hazard index for the
 * selected hazard. Pre-positioning advice is static operational guidance.
 */
export function AdminSurgeOverview() {
  const { facilities, isLoading, isError, climateLoading } = useAdminPortfolio()

  const regions = useMemo(() => {
    const set = new Set<string>()
    for (const f of facilities) if (f.region) set.add(f.region)
    return [...set].sort()
  }, [facilities])

  // Derive the effective region: explicit selection, else first available.
  const [regionSel, setRegionSel] = useState<string | null>(null)
  const [hazard, setHazard] = useState<Hazard>("flood")
  const region = regionSel ?? regions[0] ?? ""

  const scoped = useMemo(() => {
    const inRegion = facilities.filter((f) => f.region === region && f.climate)
    return inRegion
      .map((f) => ({ facility: f, score: hazardScore(f, hazard) ?? 0 }))
      .sort((a, b) => b.score - a.score)
  }, [facilities, region, hazard])

  const highImpact = scoped.filter((s) => s.score >= 60).length

  if (isLoading) {
    return <div className="h-72 animate-pulse rounded-lg bg-muted" />
  }
  if (isError) {
    return <p className="text-sm text-destructive">Could not load portfolio data. Please retry.</p>
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2">
            <Waves aria-hidden className="size-5 text-primary" />
            Surge Planning Overview
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {climateLoading && (
          <p className="text-xs text-muted-foreground">Loading climate exposure from NASA POWER...</p>
        )}

        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Region:</span>
            {regions.length === 0 ? (
              <span className="text-xs text-muted-foreground">No regions yet</span>
            ) : (
              regions.map((d) => (
                <SelectorChip key={d} active={region === d} onClick={() => setRegionSel(d)}>
                  {d}
                </SelectorChip>
              ))
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Hazard:</span>
            {HAZARDS.map((h) => (
              <SelectorChip key={h} active={hazard === h} onClick={() => setHazard(h)}>
                {hazardIcon(h)}
                {HAZARD_LABEL[h]}
              </SelectorChip>
            ))}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <StatCard
            title="High-exposure facilities"
            value={highImpact}
            icon={<OctagonAlert />}
            accent="destructive"
            meta={`${HAZARD_LABEL[hazard]} exposure index >= 60`}
          />
          <StatCard
            title="Facilities in scope"
            value={scoped.length}
            icon={hazardIcon(hazard)}
            accent="muted"
            meta={region || "—"}
          />
        </div>

        <section className="space-y-2">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <PackageCheck aria-hidden className="size-4 text-primary" />
            Recommended pre-positioning
          </h3>
          <p className="flex items-start gap-2 rounded-lg border border-border p-3 text-sm text-muted-foreground">
            <Info aria-hidden className="mt-0.5 size-4 shrink-0" />
            {HAZARD_GUIDANCE[hazard]}
          </p>
        </section>

        <section className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground">Facilities by {HAZARD_LABEL[hazard]} exposure</h3>
          {scoped.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground">
              No facilities with climate data in this region yet.
            </p>
          ) : (
            <ul className="space-y-2">
              {scoped.map(({ facility: f, score }) => (
                <li key={f.id} className="rounded-lg border border-border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="font-medium text-foreground">{f.name}</span>
                      <span className="ml-2 text-xs text-muted-foreground">{f.city ?? "—"}</span>
                    </div>
                    <Badge variant={impactAccent(score)}>Exposure {score}</Badge>
                  </div>
                  <div
                    className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted"
                    role="progressbar"
                    aria-valuenow={score}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${HAZARD_LABEL[hazard]} exposure for ${f.name}`}
                  >
                    <div className={cn("h-full rounded-full", impactBarClass(score))} style={{ width: `${score}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </CardContent>
    </Card>
  )
}
