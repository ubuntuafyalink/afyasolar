"use client"

import { BookOpen } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  getCrphcBaseDimensions,
  CRPHC_NEW_DIMENSIONS,
} from "@/lib/dashboard/facility-demo-data"
import { NORMALIZATION_VERSION } from "@/lib/climate/nasa-power"

/**
 * Read-only, transparent view of the CRiPHC resilience model: the scoring
 * formula, each dimension's weight, and the resilience-tier thresholds. Supports
 * the open-source / explainability goal. Demo data only.
 */

type Dimension = { code: string; label: string; weight: number }

const TIERS: { tier: string; threshold: string }[] = [
  { tier: "Resilient", threshold: "RCS 75 and above" },
  { tier: "Developing", threshold: "RCS 55 to 74" },
  { tier: "At risk", threshold: "RCS 35 to 54" },
  { tier: "Critical", threshold: "RCS below 35" },
]

function DimensionRow({ dim }: { dim: Dimension }) {
  return (
    <li className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
      <div className="flex min-w-0 items-center gap-3">
        <Badge variant="outline" className="font-mono">
          {dim.code}
        </Badge>
        <span className="truncate font-medium text-foreground">{dim.label}</span>
      </div>
      <span className="shrink-0 tabular-nums font-semibold text-foreground">
        {Math.round(dim.weight * 100)}%
      </span>
    </li>
  )
}

export function AdminMethodologyConfig() {
  const dimensions: Dimension[] = [
    ...getCrphcBaseDimensions().map((d) => ({ code: d.code, label: d.label, weight: d.weight })),
    ...CRPHC_NEW_DIMENSIONS,
  ]

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2">
            <BookOpen aria-hidden className="size-5 text-primary" />
            Methodology &amp; model configuration
          </CardTitle>
          <Badge variant="outline" className="font-mono text-muted-foreground">
            Climate model {NORMALIZATION_VERSION}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div>
          <p className="mb-2 text-sm font-medium text-muted-foreground">Scoring formula</p>
          <code className="block rounded-lg border border-border bg-muted px-4 py-3 font-mono text-sm text-foreground">
            RCS = sum of (each dimension score x its weight)
          </code>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-muted-foreground">
            Dimensions and weights
          </p>
          <ul className="space-y-2">
            {dimensions.map((d) => (
              <DimensionRow key={d.code} dim={d} />
            ))}
          </ul>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-muted-foreground">Resilience tiers</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <caption className="sr-only">Resilience tier thresholds</caption>
              <thead>
                <tr className="border-b border-border text-left text-xs font-medium text-muted-foreground">
                  <th scope="col" className="py-2 pr-4">
                    Tier
                  </th>
                  <th scope="col" className="py-2">
                    Threshold
                  </th>
                </tr>
              </thead>
              <tbody>
                {TIERS.map((t) => (
                  <tr key={t.tier} className="border-b border-border/60 last:border-0">
                    <th scope="row" className="py-2 pr-4 text-left font-medium text-foreground">
                      {t.tier}
                    </th>
                    <td className="py-2 text-muted-foreground">{t.threshold}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
