"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AdaptationRecsList } from "./adaptation-recs-list"
import { LocalizedPlan } from "./localized-plan"
import { EcmCatalogue } from "./ecm-catalogue"
import { AdaptationTracker } from "./adaptation-tracker"
import { useFacilityPreferences } from "./facility-preferences-provider"

/**
 * Spec Part 10.4 & 9.5 (G31G33): the adaptation plan ranked recommendations
 * with expected resilience gain and cost, a localized plan grouped by horizon,
 * and the ECM catalogue. Additive, mounted within the Climate Resilience section.
 */
export function AdaptationPlan({ facilityId }: { facilityId?: string }) {
  const { t } = useFacilityPreferences()
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("plan.title")}</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="recommended">
          <TabsList className="flex h-auto flex-wrap justify-start">
            <TabsTrigger value="recommended">{t("plan.tab.recommended")}</TabsTrigger>
            <TabsTrigger value="plan">{t("plan.tab.byHorizon")}</TabsTrigger>
            <TabsTrigger value="catalogue">{t("plan.tab.catalogue")}</TabsTrigger>
            <TabsTrigger value="myplan">{t("plan.tab.myPlan")}</TabsTrigger>
          </TabsList>
          <TabsContent value="recommended" className="pt-4">
            <AdaptationRecsList />
          </TabsContent>
          <TabsContent value="plan" className="pt-4">
            <LocalizedPlan facilityId={facilityId} />
          </TabsContent>
          <TabsContent value="catalogue" className="pt-4">
            <EcmCatalogue />
          </TabsContent>
          <TabsContent value="myplan" className="pt-4">
            <AdaptationTracker />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
