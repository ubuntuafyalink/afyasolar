"use client"

import { Hash, MessageSquare } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DemoDataBadge } from "@/components/ui/demo-data-badge"
import { getSmsStatus } from "@/lib/dashboard/facility-demo-data"

const SMS_KEYWORDS: { keyword: string; result: string }[] = [
  { keyword: "STATUS", result: "Returns a one-message status summary." },
  { keyword: "REPORT 45 12 2", result: "Submits a daily report: 45 patients, 12 children vaccinated, 2 deliveries." },
  { keyword: "HELP", result: "Returns the supported keywords." },
]

const USSD_MENU = [
  "1. Fridge status",
  "2. Power status",
  "3. Report a problem",
  "4. Daily report",
]

/**
 * Spec 15.5: the SMS and USSD fallback, for when WhatsApp is unavailable.
 *
 * [data] — preview of the keyword/menu surface. TODO: wire the real
 * Africa's Talking SMS/USSD integration per spec Part 15. Nothing is sent here.
 */
export function SmsUssdPreview({ facilityId }: { facilityId?: string }) {
  const statusReply = getSmsStatus(facilityId)

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageSquare className="size-5 text-primary" aria-hidden /> SMS &amp; USSD fallback
          </CardTitle>
          <DemoDataBadge label="Preview only" />
        </div>
        <p className="text-xs text-muted-foreground">Works on any phone when WhatsApp is unavailable.</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* USSD menu */}
        <div>
          <p className="mb-1 flex items-center gap-1.5 text-sm font-medium text-foreground">
            <Hash className="size-4 text-muted-foreground" aria-hidden /> USSD menu (dial *123*456#)
          </p>
          <div className="rounded-lg border border-border bg-foreground/90 p-3 font-mono text-xs text-background">
            <p className="mb-1">AfyaSolar</p>
            {USSD_MENU.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        </div>

        {/* SMS keywords */}
        <div>
          <p className="mb-1 text-sm font-medium text-foreground">SMS keywords</p>
          <ul className="space-y-1.5">
            {SMS_KEYWORDS.map((k) => (
              <li key={k.keyword} className="rounded-lg border border-border p-2.5">
                <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-semibold text-foreground">
                  {k.keyword}
                </code>
                <p className="mt-1 text-xs text-muted-foreground">{k.result}</p>
              </li>
            ))}
          </ul>
        </div>

        {/* STATUS reply example */}
        <div>
          <p className="mb-1 text-sm font-medium text-foreground">Example reply to STATUS</p>
          <p className="rounded-lg bg-muted/50 p-3 font-mono text-xs text-foreground">{statusReply}</p>
        </div>
      </CardContent>
    </Card>
  )
}
