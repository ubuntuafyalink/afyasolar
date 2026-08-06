"use client"

import { TrendingUp } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/lib/utils"
import { rankEcms } from "@/lib/dashboard/ecm-catalogue"

/**
 * Spec 10.4: ranked adaptation recommendations, each with its expected
 * resilience gain and indicative cost, ordered by gain-per-cost.
 */
export function AdaptationRecsList({ limit = 5 }: { limit?: number }) {
  const ranked = rankEcms().slice(0, limit)

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <TrendingUp className="size-5 text-primary" aria-hidden /> Recommended actions
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Ranked by expected resilience gain per cost (spec 10.4).
        </p>
      </CardHeader>
      <CardContent>
        <ol className="space-y-2">
          {ranked.map((ecm, i) => (
            <li
              key={ecm.code}
              className="flex items-start gap-3 rounded-lg border border-border p-3"
            >
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium text-foreground">{ecm.title}</p>
                  <Badge variant="outline" className="text-[10px]">
                    {ecm.dimension}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{ecm.description}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm font-semibold text-success">+{ecm.resilienceGainPoints} pts</p>
                <p className="text-xs text-muted-foreground">{formatCurrency(ecm.indicativeCostTsh)}</p>
              </div>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  )
}
