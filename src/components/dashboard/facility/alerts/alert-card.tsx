"use client"

import { Activity, CheckCircle2, CloudRain, Flame, PlugZap } from "lucide-react"
import type { LucideIcon } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { AlertKind, AlertSeverity, FacilityAlert } from "@/lib/dashboard/facility-demo-data"

const KIND_ICON: Record<AlertKind, LucideIcon> = {
  heatwave: Flame,
  flood: CloudRain,
  outage: PlugZap,
  disease: Activity,
}

const SEVERITY_STYLE: Record<AlertSeverity, { border: string; chip: string }> = {
  info: { border: "border-border", chip: "bg-primary/10 text-primary" },
  warning: { border: "border-warning/40", chip: "bg-warning/15 text-warning-foreground" },
  danger: { border: "border-destructive/40", chip: "bg-destructive/10 text-destructive" },
}

/**
 * One climate / outage alert card (spec 11.3 "Warn"). Covers the heatwave (I42),
 * flood (I43), outage-probability (I44) and climate-disease (I45) alerts via the
 * alert `kind`.
 */
export function AlertCard({ alert }: { alert: FacilityAlert }) {
  const Icon = alert.active ? KIND_ICON[alert.kind] : CheckCircle2
  const style = alert.active ? SEVERITY_STYLE[alert.severity] : SEVERITY_STYLE.info

  return (
    <Card className={cn("border-2", alert.active ? style.border : "border-success/30 bg-success/5")}>
      <CardContent className="flex items-start gap-3 p-4">
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-lg",
            alert.active ? style.chip : "bg-success/10 text-success",
          )}
        >
          <Icon className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-foreground">{alert.title}</h3>
            {alert.active ? (
              <Badge variant="outline" className="text-[10px]">
                {alert.leadTime}
              </Badge>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{alert.detail}</p>
        </div>
      </CardContent>
    </Card>
  )
}
