"use client"

import { AssistantChat } from "./assistant-chat"
import { WhatIfSimulator } from "./what-if-simulator"
import type { MeuSummary, SizingSummary } from "@/components/solar/afya-solar-sizing-tool"

/**
 * Spec 11.3 (J47-J48) -> the Assistant section: a saved-history GenAI chat
 * (conversation rail + thread) on top, and a what-if simulator full-width below.
 * Both are grounded in the facility's real assessed energy + Climate Outlook
 * data with streaming AI responses.
 */
export function AssistantSection({
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
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Assistant</h2>
        <p className="text-sm text-muted-foreground">
          Ask questions in plain language, or simulate a change before you make it.
        </p>
      </div>
      <AssistantChat facilityId={facilityId} meuSummary={meuSummary} sizingSummary={sizingSummary} region={region} />
      <WhatIfSimulator facilityId={facilityId} meuSummary={meuSummary} sizingSummary={sizingSummary} region={region} />
    </div>
  )
}
