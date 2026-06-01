"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MvaAuditForm } from "./mva-audit-form"
import { AuditThreeOutputs } from "./audit-three-outputs"
import { BillOcrCapture } from "./bill-ocr-capture"
import { EcoPulseEpi } from "./eco-pulse-epi"

/**
 * Spec Part 7 & 9.6: additive enhancements to the existing Energy Efficiency
 * section — the 15-parameter Minimum Viable Audit, its three-output report,
 * bill/receipt OCR, and the Eco-Pulse performance index. Mounted BELOW the
 * existing efficiency content; nothing existing is changed.
 */
export function AuditEnhancements({ facilityId }: { facilityId?: string }) {
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
        </Tabs>
      </CardContent>
    </Card>
  )
}
