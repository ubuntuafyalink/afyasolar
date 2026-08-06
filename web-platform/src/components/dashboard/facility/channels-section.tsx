"use client"

import { WhatsappPreview } from "./whatsapp-preview"
import { SmsUssdPreview } from "./sms-ussd-preview"

/**
 * Spec Part 15 (K49K50) → the Channels section. Read-only previews of the
 * WhatsApp conversational surface and the SMS/USSD fallback. New flag-gated
 * facility section; all [data] (demo). Desktop-first.
 */
export function ChannelsSection({
  facilityId,
  facilityName,
}: {
  facilityId?: string
  facilityName?: string | null
}) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Channels</h2>
        <p className="text-sm text-muted-foreground">
          How AfyaSolar reaches you beyond this dashboard WhatsApp first, SMS and USSD as a fallback.
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <WhatsappPreview facilityId={facilityId} facilityName={facilityName} />
        <SmsUssdPreview facilityId={facilityId} />
      </div>
    </div>
  )
}
