"use client"

import { CopilotChat } from "./copilot-chat"
import { WhatIfSimulator } from "./what-if-simulator"

/**
 * Spec 11.3 (J47–J48) → the Assistant section. A GenAI co-pilot chat and a
 * what-if simulator. New flag-gated facility section; all [data] (demo).
 * Desktop-first.
 */
export function AssistantSection({ facilityId }: { facilityId?: string }) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Assistant</h2>
        <p className="text-sm text-muted-foreground">
          Ask questions in plain language, or simulate a change before you make it.
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <CopilotChat facilityId={facilityId} />
        <WhatIfSimulator facilityId={facilityId} />
      </div>
    </div>
  )
}
