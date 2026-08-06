"use client"

import { Sparkles, BatteryWarning, Activity, ShieldAlert } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useAdminAdvisory } from "@/hooks/use-admin-advisory"

const STATUS_COLOR = {
  healthy: "var(--color-success)",
  warning: "var(--color-warning)",
  critical: "var(--color-destructive)",
} as const

const STATUS_LABEL = { healthy: "Healthy", warning: "Watch", critical: "Critical" } as const

function StatTile({ icon: Icon, label, value, color }: {
  icon: typeof Sparkles
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
 * Fleet Advisory: an LLM weekly briefing over the whole portfolio + a ranked list
 * of the facilities needing attention this week. Blends predictive maintenance
 * (battery RUL + anomalies) with the climate outlook (composite hazard).
 */
export function AdminAdvisory() {
  const { data, isLoading, isError } = useAdminAdvisory()
  const agg = data?.aggregate
  const isLlm = data?.source === "llm"

  return (
    <section className="space-y-4" aria-labelledby="admin-advisory-title">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="size-5 text-primary" aria-hidden />
            <h2 id="admin-advisory-title" className="text-xl font-semibold text-foreground">
              Fleet Advisory
            </h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            AI weekly briefing — which facilities need attention, and why.
          </p>
        </div>
        {data ? (
          <span
            className="rounded-full border px-2 py-0.5 text-[10px] font-medium"
            style={
              isLlm
                ? { borderColor: "color-mix(in oklch, var(--color-primary) 30%, transparent)", backgroundColor: "color-mix(in oklch, var(--color-primary) 10%, transparent)", color: "var(--color-primary)" }
                : { borderColor: "var(--color-border)", color: "var(--color-muted-foreground)" }
            }
          >
            {isLlm ? `AI · ${data.model ?? "LLM"}` : "AI · rule-based"}
          </span>
        ) : null}
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <div className="h-28 animate-pulse rounded-lg bg-muted" aria-hidden />
          <div className="grid gap-3 sm:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-lg bg-muted" aria-hidden />
            ))}
          </div>
        </div>
      ) : isError || !data || !agg ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            Portfolio advisory unavailable. Ensure the AI service is running.
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Narrative briefing */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="size-4 text-primary" aria-hidden />
                This week&apos;s briefing
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed text-foreground">{data.advisory}</p>
            </CardContent>
          </Card>

          <div className="grid gap-3 sm:grid-cols-3">
            <StatTile
              icon={ShieldAlert}
              label={`Facilities at risk (of ${agg.facilities})`}
              value={agg.atRisk}
              color={agg.atRisk > 0 ? "var(--color-warning)" : "var(--color-success)"}
            />
            <StatTile icon={Activity} label="Total anomalies" value={agg.totalAnomalies} />
            <StatTile icon={BatteryWarning} label="Avg. battery life (days)" value={agg.avgRulDays} />
          </div>

          {/* Priority facilities */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Priority facilities</CardTitle>
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
                      <th className="px-4 py-2 font-medium">Climate hazard</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.top.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                          No facilities are flagged this week.
                        </td>
                      </tr>
                    ) : (
                      data.top.map((r) => (
                        <tr key={r.facilityId} className="border-b border-border/60 last:border-0">
                          <td className="px-4 py-2 text-foreground">{r.name}</td>
                          <td className="px-4 py-2 text-foreground">{r.rulDays} d</td>
                          <td className="px-4 py-2">
                            <span
                              className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
                              style={{
                                color: STATUS_COLOR[r.status],
                                backgroundColor: `color-mix(in oklch, ${STATUS_COLOR[r.status]} 15%, transparent)`,
                              }}
                            >
                              {STATUS_LABEL[r.status]}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-foreground">{r.anomalies}</td>
                          <td className="px-4 py-2 text-foreground">{r.hazardComposite}/100</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <p className="text-[11px] text-muted-foreground">
            Ranking blends battery life, anomalies and climate hazard; the briefing is AI-generated
            from those signals. Predictions run on simulated telemetry keyed to each facility&apos;s
            age and system size.
          </p>
        </>
      )}
    </section>
  )
}
