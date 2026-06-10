"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { BookOpen, LifeBuoy } from "lucide-react"

const RCS_DIMENSIONS: { code: string; label: string }[] = [
  { code: "HES", label: "Hazard Exposure - climate hazards the site faces (from NASA POWER)" },
  { code: "CSF", label: "Critical Service Fragility - how exposed essential services are" },
  { code: "ECPQ", label: "Energy Continuity & Power Quality - reliability of power" },
  { code: "EDC", label: "Efficiency & Demand Control - how well energy is used" },
  { code: "RRC", label: "Readiness & Response Capacity - ability to cope and recover" },
]

const TIERS: { tier: string; range: string }[] = [
  { tier: "Resilient", range: "RCS 75 and above" },
  { tier: "Developing", range: "RCS 55 to 74" },
  { tier: "At risk", range: "RCS 35 to 54" },
  { tier: "Critical", range: "RCS below 35" },
]

/** Plain-language help + methodology for the admin panel (mirrors facility Help). */
export function AdminHelp() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <LifeBuoy aria-hidden className="size-5 text-primary" />
            Help &amp; methodology
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            This admin panel mirrors the facility manager dashboard at the portfolio level: each section
            shows the all-facilities view of what a facility manager sees for their own site.
          </p>
          <p>
            The Resilience Capacity Score (RCS, 0-100) summarises a facility&apos;s ability to keep
            essential child-health services running through climate and power stress. It is a transparent,
            weighted sum of five dimensions.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <BookOpen aria-hidden className="size-5 text-primary" />
            The five RCS dimensions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {RCS_DIMENSIONS.map((d) => (
              <li key={d.code} className="flex items-start gap-3 rounded-lg border border-border p-3">
                <Badge variant="outline" className="font-mono">
                  {d.code}
                </Badge>
                <span className="text-sm text-foreground">{d.label}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Resilience tiers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs font-medium text-muted-foreground">
                  <th scope="col" className="py-2 pr-4">Tier</th>
                  <th scope="col" className="py-2">Score range</th>
                </tr>
              </thead>
              <tbody>
                {TIERS.map((t) => (
                  <tr key={t.tier} className="border-b border-border/60 last:border-0">
                    <th scope="row" className="py-2 pr-4 text-left font-medium text-foreground">
                      {t.tier}
                    </th>
                    <td className="py-2 text-muted-foreground">{t.range}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
