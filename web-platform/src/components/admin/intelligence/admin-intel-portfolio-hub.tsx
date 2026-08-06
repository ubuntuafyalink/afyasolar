"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AdminPortfolioOverview } from "./admin-portfolio-overview"
import { AdminFacilitiesRcsTable } from "./admin-facilities-rcs-table"
import { AdminPortfolioMap } from "./admin-portfolio-map"
import { AdminRegionNetwork } from "./admin-region-network"
import { AdminReportButton } from "./admin-report-button"

/** Portfolio hub: overview, facilities table, map, and region/network breakdown. */
export function AdminIntelPortfolioHub() {
  return (
    <Tabs defaultValue="overview" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <TabsList className="flex h-auto flex-wrap justify-start">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="facilities">Facilities (RCS)</TabsTrigger>
          <TabsTrigger value="map">Map</TabsTrigger>
          <TabsTrigger value="region">Region &amp; Network</TabsTrigger>
        </TabsList>
        <AdminReportButton />
      </div>
      <TabsContent value="overview"><AdminPortfolioOverview /></TabsContent>
      <TabsContent value="facilities"><AdminFacilitiesRcsTable /></TabsContent>
      <TabsContent value="map"><AdminPortfolioMap /></TabsContent>
      <TabsContent value="region"><AdminRegionNetwork /></TabsContent>
    </Tabs>
  )
}
