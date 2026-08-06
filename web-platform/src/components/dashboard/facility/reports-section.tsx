"use client"

import { CheckCircle2, CloudOff, ClipboardList, Loader2, Wifi } from "lucide-react"
import { toast } from "sonner"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/components/ui/empty-state"
import { DemoDataBadge } from "@/components/ui/demo-data-badge"
import { LazyMotionProvider } from "@/components/motion/lazy-motion-provider"
import { cn } from "@/lib/utils"
import { DailyReportStepper } from "./daily-report-stepper"
import { useOfflineReportQueue, type ReportStatus } from "./use-offline-report-queue"

const STATUS_META: Record<ReportStatus, { label: string; className: string; icon: typeof Loader2 }> = {
  queued: { label: "Queued", className: "text-warning-foreground", icon: CloudOff },
  syncing: { label: "Syncing", className: "text-primary", icon: Loader2 },
  synced: { label: "Synced", className: "text-success", icon: CheckCircle2 },
}

/**
 * Spec 8.2 "Ripoti" → the Reports section. A one-field-at-a-time daily report
 * that is written to IndexedDB instantly (offline-first) and then "synced" in
 * the background. The IndexedDB persistence is real; the API + DHIS2 sync is
 * simulated (see use-offline-report-queue). Desktop-first.
 */
export function ReportsSection({ facilityId }: { facilityId?: string }) {
  const { reports, enqueue, online } = useOfflineReportQueue(facilityId)

  return (
    <LazyMotionProvider>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Daily report</h2>
            <p className="text-sm text-muted-foreground">
              A quick daily summary. Works offline it saves on your phone and syncs later.
            </p>
          </div>
          <Badge
            variant="outline"
            className={cn("gap-1", online ? "text-success" : "text-warning-foreground")}
          >
            {online ? <Wifi className="size-3" aria-hidden /> : <CloudOff className="size-3" aria-hidden />}
            {online ? "Online" : "Offline"}
          </Badge>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Today&apos;s report</CardTitle>
            </CardHeader>
            <CardContent>
              <DailyReportStepper
                onSubmit={(draft) => {
                  void enqueue(draft)
                  toast.success(
                    online
                      ? "Report saved and syncing."
                      : "Report saved offline it will sync when you're back online.",
                  )
                }}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="text-base">Recent submissions</CardTitle>
                <DemoDataBadge label="Sync simulated" />
              </div>
              <p className="text-xs text-muted-foreground">
                Saved on this device. Sync to the API &amp; DHIS2 queue is simulated.
              </p>
            </CardHeader>
            <CardContent>
              {reports.length === 0 ? (
                <EmptyState
                  icon={<ClipboardList />}
                  title="No reports yet"
                  description="Submit today's report and it will appear here with its sync status."
                  className="border-0 bg-transparent py-8"
                />
              ) : (
                <ul className="space-y-2">
                  {reports.map((r) => {
                    const meta = STATUS_META[r.status]
                    const Icon = meta.icon
                    return (
                      <li
                        key={r.id}
                        className="flex items-center justify-between gap-3 rounded-lg border border-border p-3"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground">{r.date}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {r.patients} patients · {r.childrenVaccinated} vaccinated · {r.deliveries} deliveries
                            {r.hasVoiceNote ? " · voice note" : ""}
                          </p>
                        </div>
                        <span className={cn("flex shrink-0 items-center gap-1 text-xs font-medium", meta.className)}>
                          <Icon className={cn("size-4", r.status === "syncing" && "animate-spin")} aria-hidden />
                          {meta.label}
                        </span>
                      </li>
                    )
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </LazyMotionProvider>
  )
}
