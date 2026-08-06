"use client"

import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ClipboardList, Info } from "lucide-react"
import { useAdminPortfolio } from "@/hooks/use-admin-portfolio"

/**
 * Reports = portfolio oversight of facility daily reports (mirrors the facility
 * Reports section). Facility reports are currently captured offline on-device and
 * not yet synced to a central store, so this shows the facility roster with an
 * honest "not synced yet" status until report sync is wired.
 */
export function AdminReports() {
  const { facilities, isLoading, isError } = useAdminPortfolio()
  const rows = useMemo(() => facilities, [facilities])

  if (isLoading) {
    return <div className="h-64 animate-pulse rounded-lg bg-muted" />
  }
  if (isError) {
    return <p className="text-sm text-destructive">Could not load facilities. Please retry.</p>
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <ClipboardList aria-hidden className="size-5 text-primary" />
            Facility reports
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="flex items-start gap-2 rounded-lg border border-border p-3 text-sm text-muted-foreground">
            <Info aria-hidden className="mt-0.5 size-4 shrink-0" />
            Facility daily reports are captured offline on each facility&apos;s device and are not yet
            synced to a central store. Submissions will appear here once report sync is enabled.
          </p>

          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No facilities yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs font-medium text-muted-foreground">
                    <th scope="col" className="py-2 pr-4">Facility</th>
                    <th scope="col" className="py-2 pr-4">Region</th>
                    <th scope="col" className="py-2">Latest report</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((f) => (
                    <tr key={f.id} className="border-b border-border/60 last:border-0">
                      <th scope="row" className="py-2 pr-4 text-left font-medium text-foreground">
                        {f.name}
                      </th>
                      <td className="py-2 pr-4 text-muted-foreground">{f.region ?? "—"}</td>
                      <td className="py-2">
                        <Badge variant="secondary">Not synced yet</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
