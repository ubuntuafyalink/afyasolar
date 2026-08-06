"use client"

import * as React from "react"
import { BookOpen, Leaf, TrendingUp } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { rankEcms, type EcmHorizon } from "@/lib/dashboard/ecm-catalogue"
import { useAdminAdaptationsRollup } from "@/hooks/use-admin-adaptations-rollup"
import { formatCurrency } from "@/lib/utils"

const HORIZON_META: Record<EcmHorizon, { label: string; variant: "success" | "warning" | "secondary" }> = {
  immediate: { label: "Immediate", variant: "success" },
  medium: { label: "Medium term", variant: "warning" },
  capital: { label: "Capital", variant: "secondary" },
}

function HorizonBadge({ horizon }: { horizon: EcmHorizon }) {
  const meta = HORIZON_META[horizon]
  return <Badge variant={meta.variant}>{meta.label}</Badge>
}

export function AdminEcmManager() {
  const ranked = React.useMemo(() => rankEcms(), [])
  const { data: rollup } = useAdminAdaptationsRollup()

  // Cross-link real adopted measures: count adaptation records whose
  // recommendation text references each catalogue measure's title.
  const adoptedByTitle = React.useMemo(() => {
    const map = new Map<string, number>()
    for (const item of rollup?.items ?? []) {
      const rec = item.recommendation.toLowerCase()
      for (const ecm of ranked) {
        if (rec.includes(ecm.title.toLowerCase())) {
          map.set(ecm.title, (map.get(ecm.title) ?? 0) + 1)
        }
      }
    }
    return map
  }, [rollup, ranked])

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
        <CardTitle className="flex items-center gap-2">
          <Leaf aria-hidden className="size-5 text-primary" />
          ECM catalogue manager
        </CardTitle>
        <Badge variant="outline" className="gap-1 text-muted-foreground">
          <BookOpen aria-hidden className="size-3" />
          Reference catalogue
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <TrendingUp aria-hidden className="size-3.5" />
          Ranking score = resilience gain (points) per million TSh of indicative cost. Higher is better. The
          Adopted column shows how many facilities have logged a matching adaptation.
        </p>

        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                <th scope="col" className="px-3 py-2 font-medium">Code</th>
                <th scope="col" className="px-3 py-2 font-medium">Measure</th>
                <th scope="col" className="px-3 py-2 font-medium">Category</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">Cost</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">Saving / mo</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">Resilience gain</th>
                <th scope="col" className="px-3 py-2 font-medium">Dimension</th>
                <th scope="col" className="px-3 py-2 font-medium">Horizon</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">Rank score</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">Adopted</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {ranked.map((ecm) => (
                <tr key={ecm.code} className="align-top">
                  <td className="whitespace-nowrap px-3 py-2 font-mono text-xs text-muted-foreground">
                    {ecm.code}
                  </td>
                  <td className="px-3 py-2 font-medium text-foreground">{ecm.title}</td>
                  <td className="px-3 py-2 text-muted-foreground">{ecm.category}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-right">
                    {formatCurrency(ecm.indicativeCostTsh)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-right">
                    {formatCurrency(ecm.monthlySavingTsh)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-right font-medium text-success">
                    +{ecm.resilienceGainPoints} pts
                  </td>
                  <td className="px-3 py-2">
                    <Badge variant="outline">{ecm.dimension}</Badge>
                  </td>
                  <td className="px-3 py-2">
                    <HorizonBadge horizon={ecm.horizon} />
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-right font-semibold text-foreground">
                    {ecm.rankScore}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-right">
                    {adoptedByTitle.get(ecm.title) ? (
                      <Badge variant="success">{adoptedByTitle.get(ecm.title)}</Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
