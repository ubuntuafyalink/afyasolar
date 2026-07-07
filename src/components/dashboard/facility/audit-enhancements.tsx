"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MvaAuditForm } from "./mva-audit-form"
import { AuditThreeOutputs } from "./audit-three-outputs"
import { BillOcrCapture } from "./bill-ocr-capture"
import { EcoPulseEpi } from "./eco-pulse-epi"
import { DemandManagementCard } from "./demand-management-card"
import { EnergyEfficiencyAssessment } from "@/components/energy/energy-efficiency-assessment"
import type { MeuSummary, SizingSummary } from "@/components/solar/afya-solar-sizing-tool"

/**
 * Spec Part 7 & 9.6: additive enhancements to the existing Energy Efficiency
 * section the 15-parameter Minimum Viable Audit, its three-output report,
 * bill/receipt OCR, the Eco-Pulse index, the advisory load plan, and the ISO-50001
 * assessment. Mounted BELOW the existing efficiency content; nothing existing changes.
 */
export function AuditEnhancements({
  facilityId,
  meuSummary,
  sizingSummary,
  region,
}: {
  facilityId?: string
  meuSummary?: MeuSummary | null
  sizingSummary?: SizingSummary | null
  region?: string | null
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Minimum Viable Audit &amp; Eco-Pulse</CardTitle>
        <CardDescription>
          The fifteen-parameter audit, its three-output report, bill scanning, and the Eco-Pulse
          performance index.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="report">
          <TabsList className="flex h-auto flex-wrap justify-start">
            <TabsTrigger value="report">Three-output report</TabsTrigger>
            <TabsTrigger value="audit">15-parameter audit</TabsTrigger>
            <TabsTrigger value="bill">Bill scan</TabsTrigger>
            <TabsTrigger value="eco">Eco-Pulse</TabsTrigger>
            <TabsTrigger value="load">Load plan</TabsTrigger>
            <TabsTrigger value="eeat">ISO-50001</TabsTrigger>
          </TabsList>
          <TabsContent value="report" className="pt-4">
            <AuditThreeOutputs facilityId={facilityId} />
          </TabsContent>
          <TabsContent value="audit" className="pt-4">
            <MvaAuditForm />
          </TabsContent>
          <TabsContent value="bill" className="pt-4">
            <div className="max-w-xl">
              <BillOcrCapture facilityId={facilityId} />
            </div>
          </TabsContent>
          <TabsContent value="eco" className="pt-4">
            <div className="max-w-xl">
              <EcoPulseEpi facilityId={facilityId} />
            </div>
          </TabsContent>
          <TabsContent value="load" className="pt-4">
            <div className="max-w-xl">
              <DemandManagementCard
                facilityId={facilityId}
                region={region}
                meuSummary={meuSummary}
                sizingSummary={sizingSummary}
              />
            </div>
          </TabsContent>
          <TabsContent value="eeat" className="pt-4">
            <EnergyEfficiencyAssessment facilityId={facilityId} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
