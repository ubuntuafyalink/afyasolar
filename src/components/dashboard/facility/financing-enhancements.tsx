"use client"

import { EaasContractView } from "./eaas-contract-view"
import { SmartSplitterView } from "./smart-splitter-view"
import { NhifEscrowStatus } from "./nhif-escrow-status"

/**
 * Spec Part 13 (H35, H39, H40): additive financing views for the existing Bills
 * & Payment section the Energy-as-a-Service contract, the Revenue-Linked
 * Smart-Splitter, and the NHIF Receivables Escrow status. Mounted below the
 * existing bills/payment content; nothing existing is changed.
 */
export function FinancingEnhancements({ facilityId }: { facilityId?: string }) {
  return (
    <div className="space-y-4">
      <EaasContractView facilityId={facilityId} />
      <div className="grid gap-4 lg:grid-cols-2">
        <SmartSplitterView facilityId={facilityId} />
        <NhifEscrowStatus facilityId={facilityId} />
      </div>
    </div>
  )
}
