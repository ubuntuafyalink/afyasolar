"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AdaptationRecsList } from "./adaptation-recs-list"
import { LocalizedPlan } from "./localized-plan"
import { EcmCatalogue } from "./ecm-catalogue"

/**
 * Spec Part 10.4 & 9.5 (G31–G33): the adaptation plan — ranked recommendations
 * with expected resilience gain and cost, a localized plan grouped by horizon,
 * and the ECM catalogue. Additive, mounted within the Climate Resilience section.
 */
export function AdaptationPlan({ facilityId }: { facilityId?: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Adaptation plan &amp; recommendations</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="recommended">
          <TabsList className="flex h-auto flex-wrap justify-start">
            <TabsTrigger value="recommended">Recommended</TabsTrigger>
            <TabsTrigger value="plan">Plan by horizon</TabsTrigger>
            <TabsTrigger value="catalogue">ECM catalogue</TabsTrigger>
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
        </Tabs>
      </CardContent>
    </Card>
  )
}
