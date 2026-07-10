"use client"

import { useMemo, useState } from "react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { StatCard } from "@/components/ui/stat-card"
import { DemoDataBadge } from "@/components/ui/demo-data-badge"
import { cn } from "@/lib/utils"
import { FOCUS_RING } from "@/lib/dashboard/facility-ui"
import { Droplet, OctagonAlert, PackageCheck, Sun, Waves, Wind } from "lucide-react"
import {
  getDistricts,
  getDistrictSurgePlan,
  SURGE_HAZARDS,
  type SurgeHazard,
} from "@/lib/dashboard/district-data"

const HAZARD_LABEL: Record<SurgeHazard, string> = {
  flood: "Flood",
  heat: "Heatwave",
  storm: "Storm",
  drought: "Drought",
}

const SERVICE_LABEL: Record<string, string> = {
  "cold-chain": "Vaccine cold-chain",
  maternity: "Maternity",
  neonatal: "Neonatal care",
  diagnostics: "Diagnostics (lab)",
  "water-pumping": "Water pumping",
}

const SURGE_RESOURCE_LABEL: Record<string, string> = {
  "cold-chain": "Backup cold boxes + generator fuel",
  maternity: "Backup lighting & power for delivery",
  neonatal: "Backup power for warmers & oxygen",
  diagnostics: "Backup power for the lab",
  "water-pumping": "Water storage & backup pumping",
}

function hazardIcon(hazard: SurgeHazard) {
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

export function AdminSurgeOverview() {
  const districts = useMemo(() => getDistricts(), [])
  const [district, setDistrict] = useState<string>(districts[0] ?? "")
  const [hazard, setHazard] = useState<SurgeHazard>("flood")

  const plan = useMemo(
    () => (district ? getDistrictSurgePlan(district, hazard) : null),
    [district, hazard],
  )

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2">
            <Waves aria-hidden className="size-5 text-primary" />
            Surge Planning Overview
          </CardTitle>
          <DemoDataBadge />
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">District:</span>
            {districts.map((d) => (
              <SelectorChip key={d} active={district === d} onClick={() => setDistrict(d)}>
                {d}
              </SelectorChip>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Hazard:</span>
            {SURGE_HAZARDS.map((h) => (
              <SelectorChip key={h} active={hazard === h} onClick={() => setHazard(h)}>
                {hazardIcon(h)}
                {HAZARD_LABEL[h]}
              </SelectorChip>
            ))}
          </div>
        </div>

        {plan ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <StatCard
                title="High-impact facilities"
                value={plan.highImpactCount}
                icon={<OctagonAlert />}
                accent="destructive"
                meta={`${HAZARD_LABEL[hazard]} scenario impact score ≥ 60`}
              />
              <StatCard
                title="Facilities in scope"
                value={plan.facilities.length}
                icon={hazardIcon(hazard)}
                accent="muted"
                meta={district}
              />
            </div>

            <section className="space-y-2">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <PackageCheck aria-hidden className="size-4 text-primary" />
                Recommended pre-positioning
              </h3>
              {plan.affectedServiceCounts.length === 0 ? (
                <p className="rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground">
                  No services currently flagged for this scenario.
                </p>
              ) : (
                <ul className="space-y-2">
                  {plan.affectedServiceCounts.map((sc) => (
                    <li
                      key={sc.key}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground">
                          {SURGE_RESOURCE_LABEL[sc.key] ?? sc.key}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          For {SERVICE_LABEL[sc.key] ?? sc.key}
                        </p>
                      </div>
                      <Badge variant="secondary">
                        {sc.sites} {sc.sites === 1 ? "site" : "sites"}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground">
                Facilities by surge impact
              </h3>
              <ul className="space-y-2">
                {plan.facilities.map((f) => (
                  <li key={f.facility.id} className="rounded-lg border border-border p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0">
                        <span className="font-medium text-foreground">{f.facility.name}</span>
                        <span className="ml-2 text-xs text-muted-foreground">
                          {f.facility.district}
                        </span>
                      </div>
                      <Badge variant={impactAccent(f.impactScore)}>
                        Impact {f.impactScore}
                      </Badge>
                    </div>
                    <div
                      className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted"
                      role="progressbar"
                      aria-valuenow={f.impactScore}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`Surge impact for ${f.facility.name}`}
                    >
                      <div
                        className={cn("h-full rounded-full", impactBarClass(f.impactScore))}
                        style={{ width: `${f.impactScore}%` }}
                      />
                    </div>
                    {f.affectedServices.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {f.affectedServices.map((key) => (
                          <Badge key={key} variant="outline">
                            {SERVICE_LABEL[key] ?? key}
                          </Badge>
                        ))}
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">No district selected.</p>
        )}
      </CardContent>
    </Card>
  )
}
