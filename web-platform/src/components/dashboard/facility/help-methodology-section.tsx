"use client"

import { LifeBuoy, Compass, BookOpen } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { FOCUS_RING } from "@/lib/dashboard/facility-ui"
import { useFacilityPreferences } from "./facility-preferences-provider"
import { START_TOUR_EVENT } from "./facility-tour"

const DIMENSIONS = ["HES", "CSF", "ECPQ", "EDC", "RRC"] as const
const TIERS = ["Resilient", "Developing", "At risk", "Critical"] as const

/**
 * Help & Methodology a plain-language, bilingual explainer of the CRiPHC
 * framework, the Resilience Capacity Score, and how to act on it. Supports the
 * open-source / digital-public-good transparency goal. Includes a "Take a tour"
 * button that replays the guided tour.
 */
export function HelpMethodologySection() {
  const { t } = useFacilityPreferences()

  const startTour = () => {
    if (typeof window !== "undefined") window.dispatchEvent(new Event(START_TOUR_EVENT))
  }

  return (
    <section className="space-y-4" aria-labelledby="help-title">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <LifeBuoy className="size-5 text-primary" aria-hidden />
            <h2 id="help-title" className="text-xl font-semibold text-foreground">
              {t("help.title")}
            </h2>
          </div>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{t("help.subtitle")}</p>
        </div>
        <Button onClick={startTour} className={cn("gap-1.5", FOCUS_RING)}>
          <Compass className="size-4" aria-hidden />
          {t("help.takeTour")}
        </Button>
      </div>

      {/* What is the RCS */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <BookOpen className="size-5 text-primary" aria-hidden />
            {t("help.rcs.title")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>{t("help.rcs.body")}</p>
          <p className="rounded-lg border border-border bg-muted/40 px-3 py-2 font-mono text-xs text-foreground">
            {t("rcs.formula")}
          </p>
        </CardContent>
      </Card>

      {/* The five dimensions */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t("help.dimensions.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2.5">
            {DIMENSIONS.map((code) => (
              <li key={code} className="flex gap-3">
                <Badge variant="secondary" className="mt-0.5 h-fit shrink-0">
                  {code}
                </Badge>
                <div>
                  <p className="text-sm font-medium text-foreground">{t(`rcs.dim.${code}`)}</p>
                  <p className="text-xs text-muted-foreground">{t(`help.dim.${code}`)}</p>
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Tiers */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t("help.tiers.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="grid gap-2 sm:grid-cols-2">
            {TIERS.map((tier) => (
              <li key={tier} className="rounded-lg border border-border p-2.5">
                <p className="text-sm font-medium text-foreground">{t(`ngo.tier.${tier}`)}</p>
                <p className="text-xs text-muted-foreground">{t(`help.tier.${tier}`)}</p>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* How to act */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t("help.act.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{t("help.act.body")}</p>
        </CardContent>
      </Card>
    </section>
  )
}
