"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AdminAdaptationPipeline } from "./admin-adaptation-pipeline"
import { AdminEcmManager } from "./admin-ecm-manager"
import { AdminAssessmentCycles } from "./admin-assessment-cycles"
import { AdminImpactSummary } from "./admin-impact-summary"

/** Adaptation hub: pipeline, ECM catalogue, assessment cycles, and impact. */
export function AdminIntelAdaptationHub() {
  return (
    <Tabs defaultValue="pipeline" className="space-y-4">
      <TabsList className="flex h-auto flex-wrap justify-start">
        <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
        <TabsTrigger value="ecm">ECM Catalogue</TabsTrigger>
        <TabsTrigger value="cycles">Assessment Cycles</TabsTrigger>
        <TabsTrigger value="impact">Impact</TabsTrigger>
      </TabsList>
      <TabsContent value="pipeline"><AdminAdaptationPipeline /></TabsContent>
      <TabsContent value="ecm"><AdminEcmManager /></TabsContent>
      <TabsContent value="cycles"><AdminAssessmentCycles /></TabsContent>
      <TabsContent value="impact"><AdminImpactSummary /></TabsContent>
    </Tabs>
  )
}
