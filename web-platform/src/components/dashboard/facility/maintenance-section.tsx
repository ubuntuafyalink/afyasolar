"use client"

import { Wrench, BatteryWarning, Activity, ShieldCheck } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AiLoadingIndicator } from "@/components/ui/ai-loading"
import { cn } from "@/lib/utils"
import { useAiMaintenance } from "@/hooks/use-ai-maintenance"
import { ExplainPopover, type ExplainDriver } from "./explain-popover"

const STATUS_META = {
  healthy: { label: "Healthy", color: "var(--color-success)", Icon: ShieldCheck },
  warning: { label: "Watch", color: "var(--color-warning)", Icon: Activity },
  critical: { label: "Critical", color: "var(--color-destructive)", Icon: BatteryWarning },
} as const

const FACTOR_LABELS: Record<string, string> = {
  age_days: "System age",
  soc_mean_7: "Avg battery SoC (7d)",
  soc_min_7: "Min battery SoC (7d)",
  soc_mean_30: "Avg battery SoC (30d)",
  temp_mean_30: "Avg temperature (30d)",
  temp_max_7: "Peak temperature (7d)",
  battv_mean_7: "Avg battery voltage (7d)",
  pv_load_ratio_7: "PV-to-load ratio (7d)",
  dod_proxy_7: "Depth of discharge (7d)",
}

// A nominal design life used only to scale the battery-life bar.
const NOMINAL_LIFE_DAYS = 1800

/**
 * Equipment Health / Predictive Maintenance: battery remaining-useful-life +
 * anomaly detection from the AI service. Currently runs on simulated telemetry
 * (labelled), keyed to the facility's real age + installed kW.
 */
export function MaintenanceSection({
  facilityId,
  systemKw,
  ageDays,
}: {
  facilityId?: string
  systemKw?: number
  ageDays?: number
}) {
  const { data, isLoading, isError, error } = useAiMaintenance({
    facilityId: facilityId ?? null,
    ageDays,
    systemKw,
  })

  const modelNotReady = (error as Error | undefined)?.message?.toLowerCase().includes("model")
  const status = data ? STATUS_META[data.health.status] : null
  const rulDays = data ? Math.max(0, Math.round(data.rul.rul_days)) : 0
  const lifePct = Math.max(2, Math.min(100, Math.round((rulDays / NOMINAL_LIFE_DAYS) * 100)))

  // Top RUL drivers (SHAP-like) shown in the explainer, importance as a relative %.
  const rulDrivers: ExplainDriver[] = data
    ? (() => {
        const maxImp = Math.max(...data.rul.top_factors.map((f) => Math.abs(f.importance)), 1e-9)
        return data.rul.top_factors.slice(0, 4).map((f) => ({
          label: FACTOR_LABELS[f.feature] ?? f.feature,
          value: f.value,
          sub: `${Math.round((Math.abs(f.importance) / maxImp) * 100)}%`,
        }))
      })()
    : []

  return (
    <section className="space-y-4" aria-labelledby="maintenance-title">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <Wrench className="size-5 text-primary" aria-hidden />
            <h2 id="maintenance-title" className="text-xl font-semibold text-foreground">
              Equipment Health
            </h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            AI predictive maintenance — battery life &amp; anomaly detection.
          </p>
        </div>
        <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
          AI · simulated telemetry
        </span>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="space-y-3 p-6">
            <AiLoadingIndicator label="Analyzing equipment health…" />
            <div className="h-24 animate-pulse rounded bg-muted" aria-hidden />
            <div className="h-16 animate-pulse rounded bg-muted" aria-hidden />
          </CardContent>
        </Card>
      ) : isError || !data || !status ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            {modelNotReady
              ? "Maintenance models are warming up — try again shortly."
              : "Maintenance prediction unavailable. Ensure the AI service is running."}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Battery remaining-useful-life */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <status.Icon className="size-4" style={{ color: status.color }} aria-hidden />
                Battery remaining life
                <ExplainPopover
                  metric="battery_rul"
                  value={rulDays}
                  unit=" days"
                  label="Battery remaining life"
                  drivers={rulDrivers}
                  context={{
                    rul_days: rulDays,
                    status: data.health.status,
                    importance_method: data.rul.importance_method,
                    nominal_life_days: NOMINAL_LIFE_DAYS,
                    top_factors: rulDrivers.map((d) => ({ label: d.label, value: d.value, importance: d.sub })),
                  }}
                />
                <span
                  className="ml-auto rounded-full px-2 py-0.5 text-[11px] font-semibold"
                  style={{ color: status.color, backgroundColor: `color-mix(in oklch, ${status.color} 15%, transparent)` }}
                >
                  {status.label}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-end gap-2">
                <span className="text-4xl font-black tracking-tight text-foreground">{rulDays}</span>
                <span className="pb-1 text-sm text-muted-foreground">days to end-of-life</span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full" style={{ width: `${lifePct}%`, backgroundColor: status.color }} />
              </div>
              <p className="text-xs text-muted-foreground">{data.health.note}</p>

              <div className="space-y-1 border-t border-border pt-2">
                <p className="text-xs font-medium text-foreground">Key drivers</p>
                {data.rul.top_factors.slice(0, 4).map((f) => (
                  <div key={f.feature} className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{FACTOR_LABELS[f.feature] ?? f.feature}</span>
                    <span className="font-medium text-foreground">{f.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Anomaly detection */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Activity className="size-4 text-primary" aria-hidden />
                Anomaly detection
                <ExplainPopover
                  metric="anomaly"
                  value={data.anomaly.n}
                  label="Anomaly detection"
                  context={{
                    n: data.anomaly.n,
                    recent_days: data.anomaly.recent.length,
                    scores: data.anomaly.recent.map((r) => Math.round(r.score * 100) / 100),
                  }}
                />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.anomaly.n > 0 ? (
                <>
                  <div className="flex items-end gap-2">
                    <span className="text-4xl font-black tracking-tight" style={{ color: "var(--color-warning)" }}>
                      {data.anomaly.n}
                    </span>
                    <span className="pb-1 text-sm text-muted-foreground">
                      anomalous reading{data.anomaly.n === 1 ? "" : "s"} (last {data.anomaly.recent.length} days)
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Unusual battery/inverter behaviour detected — inspect the system.
                  </p>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="size-6" style={{ color: "var(--color-success)" }} aria-hidden />
                    <span className="text-lg font-semibold text-foreground">No anomalies detected</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Recent readings ({data.anomaly.recent.length} days) look normal.
                  </p>
                </>
              )}
              {/* Recent flags strip */}
              <div className="flex flex-wrap gap-1 border-t border-border pt-2">
                {data.anomaly.recent.map((r, i) => (
                  <span
                    key={i}
                    title={`score ${r.score}`}
                    className="size-3 rounded-sm"
                    style={{ backgroundColor: r.anomaly ? "var(--color-warning)" : "var(--color-muted)" }}
                    aria-hidden
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <p className="text-[11px] text-muted-foreground">
        Predictions run on simulated telemetry keyed to this facility&apos;s age and system size — a working
        foundation; accuracy improves once live device data streams.
      </p>
    </section>
  )
}
