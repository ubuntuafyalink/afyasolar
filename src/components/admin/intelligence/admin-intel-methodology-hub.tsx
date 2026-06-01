"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AdminFinancingOverview } from "./admin-financing-overview"
import { AdminMethodologyConfig } from "./admin-methodology-config"
import { AdminPublicPreview } from "./admin-public-preview"

/** Methodology & funding hub: financing, the CRiPHC model, and the public preview. */
export function AdminIntelMethodologyHub() {
  return (
    <Tabs defaultValue="financing" className="space-y-4">
      <TabsList className="flex h-auto flex-wrap justify-start">
        <TabsTrigger value="financing">Financing</TabsTrigger>
        <TabsTrigger value="methodology">Methodology &amp; Weights</TabsTrigger>
        <TabsTrigger value="public">Public Preview</TabsTrigger>
      </TabsList>
      <TabsContent value="financing"><AdminFinancingOverview /></TabsContent>
      <TabsContent value="methodology"><AdminMethodologyConfig /></TabsContent>
      <TabsContent value="public"><AdminPublicPreview /></TabsContent>
    </Tabs>
  )
}
