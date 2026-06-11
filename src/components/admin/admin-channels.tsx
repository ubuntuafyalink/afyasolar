"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MessageCircle, MessageSquare, Smartphone, Hash } from "lucide-react"
import { AdminBulkSMS } from "@/components/dashboard/admin-bulk-sms"

const CHANNELS = [
  { key: "sms", label: "SMS", icon: MessageSquare, live: true },
  { key: "whatsapp", label: "WhatsApp", icon: Smartphone, live: false },
  { key: "ussd", label: "USSD", icon: Hash, live: false },
] as const

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
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Send messages to your facilities. SMS is live below; more channels appear here as they are connected.
          </p>
          <div className="flex flex-wrap gap-2">
            {CHANNELS.map((c) => (
              <div
                key={c.key}
                className="flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-sm"
              >
                <c.icon aria-hidden className="size-4 text-muted-foreground" />
                <span className="font-medium text-foreground">{c.label}</span>
                {c.live ? (
                  <Badge className="bg-success/15 text-success-foreground text-[10px]">Live</Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px] text-muted-foreground">Coming soon</Badge>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <AdminBulkSMS />
    </div>
  )
}
