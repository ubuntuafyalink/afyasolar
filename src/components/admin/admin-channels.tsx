"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MessageCircle } from "lucide-react"
import { AdminBulkSMS } from "@/components/dashboard/admin-bulk-sms"

/**
 * Channels = outbound communication to facilities (mirrors the facility Channels
 * section). Today this is real bulk SMS; WhatsApp/USSD broadcast can be added here
 * as those backends come online.
 */
export function AdminChannels() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageCircle aria-hidden className="size-5 text-primary" />
            Channels
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Send messages to facilities. SMS is live below; WhatsApp and USSD broadcast will appear here as
          those channels are connected.
        </CardContent>
      </Card>

      <AdminBulkSMS />
    </div>
  )
}
