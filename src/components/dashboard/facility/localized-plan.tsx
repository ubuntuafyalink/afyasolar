"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/lib/utils"
import { rankEcms, type EcmHorizon, type RankedEcm } from "@/lib/dashboard/ecm-catalogue"

const HORIZONS: { key: EcmHorizon; label: string; blurb: string }[] = [
  { key: "immediate", label: "Do now (low cost)", blurb: "Quick wins payable from operating budget." },
  { key: "medium", label: "Plan this year", blurb: "Medium-term measures, financed or saved for." },
  { key: "capital", label: "Capital projects", blurb: "Larger investments, often via EaaS or a funder." },
]

/**
 * Spec 10 / G33: a localized adaptation plan — the recommended measures grouped
 * by horizon/budget, with running totals, so a manager can sequence the work to
 * their facility's cash flow.
 */
export function LocalizedPlan({ facilityId }: { facilityId?: string }) {
  const ranked = rankEcms()
  const byHorizon = (h: EcmHorizon): RankedEcm[] => ranked.filter((e) => e.horizon === h)

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Your adaptation plan</CardTitle>
        <p className="text-xs text-muted-foreground">
          Recommended measures sequenced by what your facility can afford and when.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {HORIZONS.map((group) => {
          const items = byHorizon(group.key)
          if (items.length === 0) return null
          const cost = items.reduce((s, e) => s + e.indicativeCostTsh, 0)
          const saving = items.reduce((s, e) => s + e.monthlySavingTsh, 0)
          const gain = items.reduce((s, e) => s + e.resilienceGainPoints, 0)
          return (
            <div key={group.key} className="rounded-lg border border-border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-foreground">{group.label}</p>
                  <p className="text-xs text-muted-foreground">{group.blurb}</p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="outline" className="text-[10px]">
                    {formatCurrency(cost)}
                  </Badge>
                  <Badge variant="outline" className="text-[10px] text-success">
                    +{gain} pts
                  </Badge>
                  <Badge variant="outline" className="text-[10px]">
                    saves {formatCurrency(saving)}/mo
                  </Badge>
                </div>
              </div>
              <ul className="mt-2 space-y-1">
                {items.map((e) => (
                  <li key={e.code} className="flex items-center justify-between gap-2 text-sm">
                    <span className="text-foreground">{e.title}</span>
                    <span className="text-xs text-muted-foreground">{formatCurrency(e.indicativeCostTsh)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
