"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AdminChildServicesRollup } from "./admin-child-services-rollup"
import { AdminAlertsConsole } from "./admin-alerts-console"
import { AdminColdChainMonitor } from "./admin-coldchain-monitor"
import { AdminSurgeOverview } from "./admin-surge-overview"
import { AdminTelemetryRegistry } from "./admin-telemetry-registry"

/** Risk & readiness hub: child services, alerts, cold-chain, surge, telemetry. */
export function AdminIntelRiskHub() {
  return (
    <Tabs defaultValue="child-services" className="space-y-4">
      <TabsList className="flex h-auto flex-wrap justify-start">
        <TabsTrigger value="child-services">Child Services</TabsTrigger>
        <TabsTrigger value="alerts">Alerts &amp; Incidents</TabsTrigger>
        <TabsTrigger value="coldchain">Cold-chain</TabsTrigger>
        <TabsTrigger value="surge">Surge Planning</TabsTrigger>
        <TabsTrigger value="telemetry">Telemetry</TabsTrigger>
      </TabsList>
      <TabsContent value="child-services"><AdminChildServicesRollup /></TabsContent>
      <TabsContent value="alerts"><AdminAlertsConsole /></TabsContent>
      <TabsContent value="coldchain"><AdminColdChainMonitor /></TabsContent>
      <TabsContent value="surge"><AdminSurgeOverview /></TabsContent>
      <TabsContent value="telemetry"><AdminTelemetryRegistry /></TabsContent>
    </Tabs>
  )
}
