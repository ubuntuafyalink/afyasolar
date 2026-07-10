"use client"

import { OctagonAlert, TriangleAlert, ShieldCheck } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DemoDataBadge } from "@/components/ui/demo-data-badge"
import { cn } from "@/lib/utils"
import { getPortfolioChildServiceRollup } from "@/lib/dashboard/ngo-portfolio-data"
import type { ServiceRollup } from "@/lib/dashboard/ngo-portfolio-data"

const SERVICE_LABELS: Record<ServiceRollup["key"], string> = {
  "cold-chain": "Vaccine cold-chain",
  maternity: "Maternity",
  neonatal: "Neonatal care",
  diagnostics: "Diagnostics (lab)",
  "water-pumping": "Water pumping",
}

const SERVICES: ServiceMeta[] = [
  { key: "cold-chain", label: "Vaccine cold-chain", icon: Snowflake, dependsOn: "Continuous power to the vaccine fridge", dimension: "ECPQ" },
  { key: "maternity", label: "Maternity", icon: Baby, dependsOn: "Power for delivery, lighting and warmers", dimension: "CSF" },
  { key: "neonatal", label: "Neonatal care", icon: HeartPulse, dependsOn: "Power for warmers, oxygen and monitoring", dimension: "CSF" },
  { key: "diagnostics", label: "Diagnostics (lab)", icon: Microscope, dependsOn: "Power for lab equipment and analysers", dimension: "EDC" },
  { key: "water-pumping", label: "Water pumping", icon: Droplets, dependsOn: "Power and supply for water pumping and storage", dimension: "HES" },
]
const SERVICE_LABELS = Object.fromEntries(SERVICES.map((s) => [s.key, s.label])) as Record<ChildServiceKey, string>

const SOURCE_LABEL: Record<"nasa" | "csf" | "edc", string> = {
  nasa: "Climate exposure (NASA POWER)",
  csf: "From CSF assessment",
  edc: "From EDC assessment",
}

const STATUS_META: Record<
  ChildServiceStatus,
  { label: string; variant: "destructiveSoft" | "warningSoft" | "successSoft" | "muted"; icon: LucideIcon }
> = {
  failing: { label: "Failing", variant: "destructiveSoft", icon: OctagonAlert },
  "at-risk": { label: "At risk", variant: "warningSoft", icon: TriangleAlert },
  ok: { label: "OK", variant: "successSoft", icon: ShieldCheck },
  "not-assessed": { label: "Not assessed", variant: "muted", icon: CircleDashed },
}

function StatusBadge({ status, compact }: { status: ChildServiceStatus; compact?: boolean }) {
  const m = STATUS_META[status]
  const Icon = m.icon
  return (
    <Badge variant={m.variant} className="gap-1">
      <Icon aria-hidden className="size-3" />
      {compact && status === "not-assessed" ? "—" : m.label}
    </Badge>
  )
}

function HeadroomBar({ headroom }: { headroom: number }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className="h-2 w-16 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={headroom}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className={cn("h-full rounded-full", scoreBarColor(headroom))} style={{ width: `${headroom}%` }} />
      </div>
      <span className="w-9 shrink-0 text-right text-xs font-semibold tabular-nums text-foreground">{headroom}</span>
    </div>
  )
}

// --- portfolio summary (per-service rollup) ---------------------------------

const CLIMATE_DERIVED: Record<ChildServiceKey, boolean> = {
  "cold-chain": true,
  maternity: false,
  neonatal: false,
  diagnostics: false,
  "water-pumping": true,
}

function ServiceRollupRow({ row, loading }: { row: ServiceRollup; loading?: boolean }) {
  const total = row.failing + row.atRisk + row.ok + row.notAssessed
  const pct = (n: number) => (total ? (n / total) * 100 : 0)
  const label = SERVICE_LABELS[row.key]
  return (
    <li className="space-y-1.5">
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="font-medium text-foreground">{label}</span>
        <span className="flex items-center gap-3 text-xs">
          <span className="inline-flex items-center gap-1 text-destructive">
            <OctagonAlert aria-hidden className="size-3.5" />
            {row.failing}
          </span>
          <span className="inline-flex items-center gap-1 text-warning-foreground">
            <TriangleAlert aria-hidden className="size-3.5" />
            {row.atRisk}
          </span>
          <span className="inline-flex items-center gap-1 text-success">
            <ShieldCheck aria-hidden className="size-3.5" />
            {row.ok}
          </span>
        </span>
      </div>
      <div
        className="flex h-3 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={row.ok}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label={`${label}: ${row.failing} failing, ${row.atRisk} at risk, ${row.ok} OK of ${total} sites`}
      >
        {row.failing > 0 && (
          <div className="h-full bg-destructive" style={{ width: `${pct(row.failing)}%` }} />
        )}
        {row.atRisk > 0 && (
          <div className="h-full bg-warning" style={{ width: `${pct(row.atRisk)}%` }} />
        )}
        {row.ok > 0 && (
          <div className="h-full bg-success" style={{ width: `${pct(row.ok)}%` }} />
        )}
      </div>
    </li>
  )
}

/** Portfolio-wide rollup of each critical child service by failing/at-risk/ok. */
export function AdminChildServicesRollup() {
  const rows = getPortfolioChildServiceRollup()
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
        <CardTitle className="text-base">Critical services across the portfolio</CardTitle>
        <DemoDataBadge />
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex flex-wrap gap-x-4 gap-y-1.5 text-xs">
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden className={cn("size-2.5 rounded-full bg-destructive")} />
            Failing
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden className={cn("size-2.5 rounded-full bg-warning")} />
            At risk
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden className={cn("size-2.5 rounded-full bg-success")} />
            OK
          </span>
        </div>
        <ul className="space-y-4">
          {rows.map((row) => (
            <ServiceRow key={row.key} row={row} />
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
