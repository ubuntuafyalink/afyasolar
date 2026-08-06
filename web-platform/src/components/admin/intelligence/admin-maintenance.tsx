"use client"

import { Wrench, BatteryWarning, Activity, Gauge } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useAdminMaintenance } from "@/hooks/use-admin-maintenance"

const STATUS_COLOR = {
  healthy: "var(--color-success)",
  warning: "var(--color-warning)",
  critical: "var(--color-destructive)",
} as const

const STATUS_LABEL = { healthy: "Healthy", warning: "Watch", critical: "Critical" } as const

function StatTile({ icon: Icon, label, value, color }: {
  icon: typeof Wrench
  label: string
  value: string | number
  color?: string
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <Icon className="size-5" style={{ color: color ?? "var(--color-primary)" }} aria-hidden />
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-2xl font-black tracking-tight text-foreground">{value}</p>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Portfolio Predictive Maintenance: RUL + anomaly per facility (AI service),
 * aggregated into a facilities-at-risk overview for the admin Energy area.
 */
export function AdminMaintenance() {
  const { data, isLoading, isError } = useAdminMaintenance()
  const agg = data?.aggregate

  return (
    <section className="space-y-4" aria-labelledby="admin-maintenance-title">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <Wrench className="size-5 text-primary" aria-hidden />
            <h2 id="admin-maintenance-title" className="text-xl font-semibold text-foreground">
              Predictive Maintenance
            </h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Battery life &amp; anomaly detection across the portfolio.
          </p>
        </div>
        <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
          AI · simulated telemetry
        </span>
      </div>

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-lg bg-muted" aria-hidden />
          ))}
        </div>
      ) : isError || !agg ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            Portfolio maintenance unavailable. Ensure the AI service is running.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <StatTile
              icon={BatteryWarning}
              label={`Facilities at risk (of ${agg.facilitiesForecast})`}
              value={agg.facilitiesAtRisk}
              color={agg.facilitiesAtRisk > 0 ? "var(--color-warning)" : "var(--color-success)"}
            />
            <StatTile icon={Activity} label="Total anomalies" value={agg.totalAnomalies} />
            <StatTile icon={Gauge} label="Avg. battery life (days)" value={agg.avgRulDays} />
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Facilities by risk</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs text-muted-foreground">
                      <th className="px-4 py-2 font-medium">Facility</th>
                      <th className="px-4 py-2 font-medium">Battery life</th>
                      <th className="px-4 py-2 font-medium">Status</th>
                      <th className="px-4 py-2 font-medium">Anomalies</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data!.rows.map((r) => (
                      <tr key={r.facilityId} className="border-b border-border/60 last:border-0">
                        <td className="px-4 py-2 text-foreground">{r.name}</td>
                        <td className="px-4 py-2 text-foreground">
                          {r.degraded ? "—" : `${r.rulDays} d`}
                        </td>
                        <td className="px-4 py-2">
                          {r.degraded ? (
                            <span className="text-xs text-muted-foreground">n/a</span>
                          ) : (
                            <span
                              className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
                              style={{
                                color: STATUS_COLOR[r.status],
                                backgroundColor: `color-mix(in oklch, ${STATUS_COLOR[r.status]} 15%, transparent)`,
                              }}
                            >
                              {STATUS_LABEL[r.status]}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-foreground">{r.degraded ? "—" : r.anomalies}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <p className="text-[11px] text-muted-foreground">
            Predictions run on simulated telemetry keyed to each facility&apos;s age and system size — a working
            foundation; accuracy improves once live device data streams.
          </p>
        </>
      )}
    </section>
  )
}
