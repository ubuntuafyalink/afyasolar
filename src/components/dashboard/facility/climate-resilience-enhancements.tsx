"use client"

import { CrphcResults } from "./crphc-results"
import { HazardScorePanel } from "./hazard-score-panel"
import { CviPanel } from "./cvi-panel"
import { AdaptationPlan } from "./adaptation-plan"

/**
 * Spec Part 10 (CRiPHC v2.0): additive enhancements to the existing Climate
 * Resilience section — the 7-dimension RCS results, the quantitative hazard
 * exposure score, and the Resi-Health Grid Climate Vulnerability Index. Mounted
 * BELOW the existing climate assessment; nothing existing is changed.
 */
export function ClimateResilienceEnhancements({ facilityId }: { facilityId?: string }) {
  return (
    <div className="space-y-4">
      <CrphcResults facilityId={facilityId} />
      <div className="grid gap-4 lg:grid-cols-2">
        <HazardScorePanel facilityId={facilityId} />
        <CviPanel facilityId={facilityId} />
      </div>
      <AdaptationPlan facilityId={facilityId} />
    </div>
  )
}
