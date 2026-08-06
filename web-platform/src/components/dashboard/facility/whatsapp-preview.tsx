"use client"

import { MessageCircle } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DemoDataBadge } from "@/components/ui/demo-data-badge"
import { cn } from "@/lib/utils"
import { answerCopilot, getDailyPushPreview } from "@/lib/dashboard/facility-demo-data"

type Bubble = { from: "platform" | "user"; text: string }

/**
 * Spec 8.2 / 15.2: a read-only preview of the WhatsApp conversational surface 
 * the daily push followed by a sample question and answer.
 *
 * [data] composed from the demo module. TODO: wire the real WhatsApp Cloud API
 * + conversational state machine per spec Part 15. Nothing is sent from here.
 */
export function WhatsappPreview({
  facilityId,
  facilityName,
}: {
  facilityId?: string
  facilityName?: string | null
}) {
  const push = getDailyPushPreview(facilityId, facilityName)
  const question = "Are my vaccines safe?"
  const bubbles: Bubble[] = [
    { from: "platform", text: `${push.greeting}\n${push.lines.join("\n")}` },
    { from: "user", text: question },
    { from: "platform", text: answerCopilot(question, facilityId) },
  ]

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageCircle className="size-5 text-success" aria-hidden /> WhatsApp
          </CardTitle>
          <DemoDataBadge label="Preview only" />
        </div>
        <p className="text-xs text-muted-foreground">The daily-touch surface. Reply by voice, photo or text.</p>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 rounded-xl border border-border bg-muted/20 p-3">
          {bubbles.map((b, i) => (
            <div key={i} className={cn("flex", b.from === "user" ? "justify-end" : "justify-start")}>
              <p
                className={cn(
                  "max-w-[85%] whitespace-pre-line rounded-2xl px-3 py-2 text-sm",
                  b.from === "platform"
                    ? "rounded-tl-sm bg-card text-foreground shadow-sm"
                    : "rounded-tr-sm bg-success text-white",
                )}
              >
                {b.text}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
